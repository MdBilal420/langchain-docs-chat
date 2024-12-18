import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "generated/db.js";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";

export const PDF_PAPERS_TABLE = "pdf_papers";
export const PDF_EMBEDDINGS_TABLE = "pdf_embeddings";
export const PDF_QA_TABLE = "pdf_question_answering";




export const fromExistingIndex = async (): Promise<{
  vectorStore: SupabaseVectorStore;
  client: SupabaseClient<Database, 'public', any>;
}> => {
  const privateKey = process.env.SUPABASE_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!privateKey || !supabaseUrl) {
    throw new Error("Missing Supabase Key or Url");
  }

  const client = createClient<Database>(supabaseUrl, privateKey);

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    {
      client,
      tableName: PDF_EMBEDDINGS_TABLE,
      queryName: 'match_documents',
    }
  );

  return { client, vectorStore };
};


export const fromDocuments = async (documents: Document[]): Promise<{
  vectorStore: SupabaseVectorStore;
  client: SupabaseClient<Database, 'public', any>;
}> => {
  const privateKey = process.env.SUPABASE_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!privateKey || !supabaseUrl) {
    throw new Error("Missing Supabase Key or Url");
  }

  const client = createClient<Database>(supabaseUrl, privateKey);

  const vectorStore = await SupabaseVectorStore.fromDocuments(
    documents,
    new OpenAIEmbeddings(),
    {
      client,
      tableName: PDF_EMBEDDINGS_TABLE,
      queryName: 'match_documents',
    }
  );

  return { client, vectorStore };
};


export const addPaper = async ({
    client,
    paper,
    url,
    notes,
    name,
  }: {
    client: SupabaseClient<Database>;
    paper: string;
    url: string;
    notes: Array<any>;
    name: string;
  }): Promise<any> => {

    const { data,error } = await client.from(PDF_PAPERS_TABLE).insert([
      {
        paper,
        pdf_url: url,
        notes,
        name,
      },
    ]);
 
    if (error) {
      throw new Error("Error adding paper to database: " + JSON.stringify(error, null, 2));
    }
    return data
  };


  export const getPaper = async(
    client:SupabaseClient<Database>,
    url:string
  ):Promise<Database['public']['Tables']['pdf_papers']['Row']> => {
    const { data, error } = await client.from(PDF_PAPERS_TABLE).select().eq('pdf_url', url);

  if (error) {
    console.error("Error getting paper from database:", error);
    throw new Error("Error getting paper from database");
  }
  return data?.[0] || null
  }


  export const saveQa = async(
    client:SupabaseClient<Database>,
    question:string,
    answer : string,
    context : string,
    followupQuestions : string[]
  ) => {
    const {error} = await client.from(PDF_QA_TABLE).insert({
      question,
      answer,
      context,
      followup_questions:followupQuestions
    })

    if(error){
      throw new Error("Error saving QA");
    }
    return
  }