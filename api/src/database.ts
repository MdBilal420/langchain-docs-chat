import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "generated/db.js";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";

export const PDF_PAPERS_TABLE = "pdf_papers";
export const PDF_EMBEDDINGS_TABLE = "pdf_embeddings";


export const createSupabaseDatabase = async (documents: Document[]): Promise<{
  vectorStore: SupabaseVectorStore;
  client: SupabaseClient<Database, 'public', any>;
}> => {
  const privateKey = process.env.SUPABASE_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!privateKey || !supabaseUrl) {
    throw new Error("Missing Supabase Key or Url");
  }
  console.log("KEYS",privateKey,supabaseUrl)

  const client = createClient<Database>(supabaseUrl, privateKey);

  console.log("CLIENT")


  const vectorStore = await SupabaseVectorStore.fromDocuments(
    documents,
    new OpenAIEmbeddings(),
    {
      client,
      tableName: PDF_EMBEDDINGS_TABLE,
      queryName: 'match_documents',
    }
  );

  console.log("VECTORSTORE")


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
  }): Promise<void> => {
    console.log("INside")
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
    console.log("Data",data)
  };