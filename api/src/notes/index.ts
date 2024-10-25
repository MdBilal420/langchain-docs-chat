import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Document } from "@langchain/core/documents";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import { formatDocumentsAsString } from "langchain/util/document";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { NOTE_PROMPT, NOTES_TOOL_SCHEMA, outputParser } from "./prompts.js";
import { addPaper, createSupabaseDatabase } from "../database.js";

async function deletePages(pdf: Buffer, pdfsToDelete: number[]) {
  const pdfDoc = await PDFDocument.load(pdf);

  let numToOffSetBy = 1;
  for (const pageNum of pdfsToDelete) {
    pdfDoc.removePage(pageNum - numToOffSetBy);
    numToOffSetBy++;
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function loadPdfFromUrl(url: string) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return response.data;
}

async function convertPdfToDocuments(pdf: Buffer): Promise<Array<Document>> {
  if (!process.env.UNSTRUCTURED_API_KEY) {
    throw new Error("UNSTRUCTURED_API_KEY is not set");
  }

  const randomName = Math.random().toString(36).substring(7);
  await writeFile(`pdf/${randomName}.pdf`, pdf, "binary");
  const loader = new UnstructuredLoader(`pdf/${randomName}.pdf`, {
    apiKey: process.env.UNSTRUCTURED_API_KEY,
    strategy: "hi_res",
  });
  console.log("loader");
  const documents = await loader.load();
  await unlink(`pdf/${randomName}.pdf`);
  return documents;
}

const generateNotes = async (documents: Array<Document>) => {
  const documnetsAsString = formatDocumentsAsString(documents);
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });
  const modelWithTool = model.bind({
    tools: [NOTES_TOOL_SCHEMA],
  });
  const chain = NOTE_PROMPT.pipe(modelWithTool).pipe(outputParser);
  const response = await chain.invoke({
    paper: documnetsAsString,
  });
  return response;
};

export async function takeNotes(
   pdfUrl: string,
  name: string,
  pdfsToDelete?: number[]
) {

  if (!pdfUrl.endsWith("pdf")) {
    throw new Error("Document is not  a PDF.");
  }

  let pdfBuffer = await loadPdfFromUrl(pdfUrl);

  if (pdfsToDelete && pdfsToDelete.length > 0) {
    pdfBuffer = await deletePages(pdfBuffer, pdfsToDelete);
  }

  const documents = await convertPdfToDocuments(pdfBuffer);
  const notes = await generateNotes(documents);
  const { client,vectorStore } = await createSupabaseDatabase(documents);

  await Promise.all([
    addPaper({
      client,
      paper: formatDocumentsAsString(documents), // Convert to base64 or adjust as necessary
      url: pdfUrl,
      notes,
      name,
    }),
    vectorStore.addDocuments(documents)
  ])
  
  return notes
}

// main({
//   pdfUrl: "https://cds.cern.ch/record/383367/files/p165.pdf",
//   name: "sample",
// });
