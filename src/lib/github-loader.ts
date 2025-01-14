import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { aiSummariesCode, generateEmbedding } from "./gemini";
import { db } from "@/server/db";
import PQueue from "p-queue";

// Queue for managing concurrent operations
const processingQueue = new PQueue({
  concurrency: 2,
  interval: 1000,
  intervalCap: 2,
});

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  try {
    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: githubToken || "",
      branch: "main",
      ignoreFiles: [
        ".gitignore",
        "package.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "package-lock.json",
        "bun.lockb",
        // Add other common files to ignore
        "*.min.js",
        "*.min.css",
        "*.map",
        "*.svg",
        "*.png",
        "*.jpg",
        "*.jpeg",
        "*.gif",
      ],
      recursive: true,
      unknown: "warn",
      maxConcurrency: 3, // Reduced concurrency to avoid rate limits
    });

    const docs = await loader.load();
    return docs.length > 0 ? docs : undefined;
  } catch (error) {
    console.error("Error loading GitHub repo:", error);
    throw error;
  }
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  try {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    if (!docs) {
      console.log("No documents found to process");
      return;
    }

    const batchSize = 5; // Process in smaller batches
    const docBatches = chunks(docs as Document[], batchSize);

    for (const batch of docBatches) {
      const embeddings = await processBatch(batch);
      await saveEmbeddings(projectId, embeddings.filter(Boolean));
      // Add delay between batches to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("Error in indexGithubRepo:", error);
    throw error;
  }
};

// Helper function to process a batch of documents
const processBatch = async (docs: Document[]) => {
  return await Promise.all(
    docs.map((doc) =>
      processingQueue.add(async () => {
        try {
          console.log(`Processing file: ${doc.metadata.source}`);
          const summary = await aiSummariesCode(doc);
          if (!summary) return null;

          const embedding = await generateEmbedding(summary);
          if (!embedding) return null;

          return {
            summary,
            embedding,
            sourceCode: JSON.stringify(doc.pageContent),
            fileName: doc.metadata.source,
          };
        } catch (error) {
          console.error(`Error processing ${doc.metadata.source}:`, error);
          return null;
        }
      }),
    ),
  );
};

// Helper function to save embeddings to database
const saveEmbeddings = async (projectId: string, embeddings: any[]) => {
  return await Promise.all(
    embeddings.map(async (embedding) => {
      try {
        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
          data: {
            projectId,
            sourceCode: embedding.sourceCode,
            summary: embedding.summary,
            fileName: embedding.fileName,
          },
        });

        await db.$executeRaw`
          UPDATE "SourceCodeEmbedding"
          SET "summaryEmbedding" = ${embedding.embedding}::vector
          WHERE "id" = ${sourceCodeEmbedding.id}
        `;

        return sourceCodeEmbedding;
      } catch (error) {
        console.error(
          `Error saving embedding for ${embedding.fileName}:`,
          error,
        );
        return null;
      }
    }),
  );
};

// Helper function to split array into chunks
const chunks = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
};
