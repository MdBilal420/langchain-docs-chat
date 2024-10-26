import { fromExistingIndex, getPaper, saveQa } from "database.js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PdfPaperNote } from "notes/prompts.js";
import { ANSWER_QUESTION_TOOL_SCHEMA, answerOutputParser, QA_OVER_PDF_PROMPT } from "./prompts.js";
import { formatDocumentsAsString } from "langchain/util/document";
import { Document } from "langchain/document";

const qaModel = async(
    question:string,
    documents: Array<Document<Record<string, any>>>,
    notes : Array<PdfPaperNote>
) => {
    const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
    });

    const modelWithTools = model.bind({
        tools : [ANSWER_QUESTION_TOOL_SCHEMA],
        tool_choice : 'auto'
    })

    const chain = QA_OVER_PDF_PROMPT.pipe(modelWithTools).pipe(answerOutputParser)
    const documentsAsString = formatDocumentsAsString(documents)
    const notesAsString = notes.map((note)=>note.note).join('\n')

    const response = await chain.invoke({
        relevantDocuments : documentsAsString,
        notes : notesAsString,
        question
    })
 
    return response
}


export async function qaOnPdf(
    question: string,
   pdfUrl: string,
 ) {
   const { client,vectorStore } = await fromExistingIndex();

   const documents = await vectorStore.similaritySearch(question,5,{
    url : pdfUrl
   })
   
   const paper = await getPaper(client, pdfUrl);
    if (!paper) {
    throw new Error(`No paper found for URL: ${pdfUrl}`);
    }
    const { notes } = paper;
   const answerAndQuestions = await qaModel(
    question,
    documents,
    notes as unknown as Array<PdfPaperNote>
   )


    await Promise.all(answerAndQuestions.map(async(qa)=>
        await saveQa(client,question,qa.answer,formatDocumentsAsString(documents),qa.followupQuestions)
    ))

    return answerAndQuestions
}