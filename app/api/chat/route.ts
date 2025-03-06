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

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1].content;

    // Load and process documents if not already done
    if (!vectorStore) {
      console.log("Initializing vector store...");
      await initializeVectorStore();
    }

    if (!vectorStore) {
      return NextResponse.json(
        { error: "Failed to initialize vector store" },
        { status: 500 }
      );
    }

    // Create the chat model
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    });

    // Create the prompt template
    const prompt = ChatPromptTemplate.fromTemplate(`
      You are a helpful assistant specializing in biohacking, wellness, and health optimization.
      
      Answer the following question based on the provided context. If you cannot find the answer in the context, 
      provide a helpful response based on your knowledge.
      
      Context: {context}
      Question: {input}
    `);

    // Create the document chain
    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt,
    });

    // Create the retrieval chain
    const chain = await createRetrievalChain({
      retriever: vectorStore.asRetriever(),
      combineDocsChain,
    });

    // Execute the chain
    const result = await chain.invoke({
      input: userMessage,
    });

    const response = result.answer;

    // Return the response
    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}

async function initializeVectorStore() {
  try {
    console.log("Loading documents...");
    const documents = await loadDocuments();
    console.log(`Loaded ${documents.length} documents`);

    if (documents.length === 0) {
      console.log("No documents loaded");
      return;
    }

    // Create text splitter
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Split the documents
    const splitDocs = await textSplitter.splitDocuments(documents);
    console.log(`Split into ${splitDocs.length} chunks`);

    // Create the vector store
    vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      new OpenAIEmbeddings()
    );

    console.log("Vector store initialized successfully");
  } catch (error) {
    console.error("Error initializing vector store:", error);
  }
}

async function loadDocuments() {
  const documents = [];

  try {
    // Load documents from data directory
    const dataDir = path.join(process.cwd(), 'public', 'data');
    
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        
        if (file.endsWith('.pdf')) {
          const loader = new PDFLoader(filePath);
          const docs = await loader.load();
          documents.push(...docs);
          console.log(`Loaded PDF: ${file}`);
        } else if (file.endsWith('.txt')) {
          const loader = new TextLoader(filePath);
          const docs = await loader.load();
          documents.push(...docs);
          console.log(`Loaded text file: ${file}`);
        }
      }
    } else {
      console.log("Data directory does not exist");
    }

    // Optional: Load from URLs
    // const urls = [
    //   "https://example.com/content1",
    //   "https://example.com/content2"
    // ];
    
    // for (const url of urls) {
    //   try {
    //     const loader = new CheerioWebBaseLoader(url);
    //     const docs = await loader.load();
    //     documents.push(...docs);
    //     console.log(`Loaded URL: ${url}`);
    //   } catch (error) {
    //     console.error(`Error loading URL ${url}:`, error);
    //   }
    // }

  } catch (error) {
    console.error("Error loading documents:", error);
  }

  return documents;
}