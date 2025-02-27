import { NextRequest, NextResponse } from 'next/server';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import path from 'path';
import fs from 'fs';

let vectorStore: MemoryVectorStore | null = null;

// Helper function to wait between API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function initializeVectorStore() {
  if (vectorStore) return;

  const documents = [];
  const assetsDir = path.join(process.cwd(), 'attatched_assets');
  
  // Create text splitter for chunking documents
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // Read all files from the assets directory
  const files = fs.readdirSync(assetsDir);
  
  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    
    if (file.endsWith('.pdf')) {
      const loader = new PDFLoader(filePath, {
        splitPages: true,
      });
      try {
        const docs = await loader.load();
        // Split each document into smaller chunks
        const splitDocs = await textSplitter.splitDocuments(docs);
        documents.push(...splitDocs);
      } catch (error) {
        console.error(`Error loading PDF ${file}:`, error);
      }
    } else if (file.endsWith('.txt')) {
      const loader = new TextLoader(filePath);
      try {
        const docs = await loader.load();
        const splitDocs = await textSplitter.splitDocuments(docs);
        documents.push(...splitDocs);
      } catch (error) {
        console.error(`Error loading text file ${file}:`, error);
      }
    }
  }

  if (documents.length === 0) {
    console.warn('No documents were successfully loaded');
    return;
  }

  console.log(`Processing ${documents.length} document chunks...`);

  // Initialize vector store with documents in batches
  const batchSize = 20; // Process 20 documents at a time
  const embeddings = new OpenAIEmbeddings();
  
  // Process first batch
  vectorStore = await MemoryVectorStore.fromDocuments(
    documents.slice(0, batchSize),
    embeddings
  );

  // Process remaining documents in batches
  for (let i = batchSize; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
    
    // Wait between batches to respect rate limits
    if (i + batchSize < documents.length) {
      await sleep(1000);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Initialize vector store if not already done
    await initializeVectorStore();
    
    if (!vectorStore) {
      return NextResponse.json(
        { error: "No documents were successfully loaded into the vector store" },
        { status: 500 }
      );
    }

    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    });

    // Create the prompt template
    const prompt = ChatPromptTemplate.fromTemplate(`
      Answer the following question based only on the provided context. If you cannot find the answer in the context, say "I don't have enough information to answer this question."

      Context: {context}
      Question: {input}

      Answer: `);

    // Create the document chain
    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt,
    });

    // Create the retrieval chain with a smaller k value
    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever: vectorStore.asRetriever({ k: 4 }), // Limit to 4 most relevant documents
    });

    // Get the response
    const response = await retrievalChain.invoke({
      input: question,
    });

    if (!response.answer) {
      return NextResponse.json(
        { message: "I don't have enough information to answer this question." },
        { status: 404 }
      );
    }

    return NextResponse.json({ answer: response.answer });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}