import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Document } from "@langchain/core/documents";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";

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
  console.log("convertPdfToDocuments", process.env.UNSTRUCTURED_API_KEY);
  const randomName = Math.random().toString(36).substring(7);
  await writeFile(`pdf/${randomName}.pdf`, pdf, "binary");

  const loader = new UnstructuredLoader(`pdf/${randomName}.pdf`, {
    apiKey: "fdSxcygYzih2ZHfdUrqaW13GR8kaAA",
    strategy: "hi_res",
  });

  const documents = await loader.load();
  await unlink(`pdf/${randomName}.pdf`);
  return documents;
}

async function main({
  pdfUrl,
  name,
  pdfsToDelete,
}: {
  pdfUrl: string;
  name: string;
  pdfsToDelete?: number[];
}) {
  if (!pdfUrl.endsWith("pdf")) {
    throw new Error("Document is not  a PDF.");
  }

  let pdfBuffer = await loadPdfFromUrl(pdfUrl);

  if (pdfsToDelete && pdfsToDelete.length > 0) {
    pdfBuffer = await deletePages(pdfBuffer, pdfsToDelete);
  }

  const documents = await convertPdfToDocuments(pdfBuffer);
  console.log(documents);
  console.log("LENGTH:", documents.length);
}

main({
  pdfUrl: "https://cds.cern.ch/record/383367/files/p165.pdf",
  name: "sample",
});
