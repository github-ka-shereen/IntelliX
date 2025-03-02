import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import PQueue from "p-queue";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// Configure queue with more conservative rate limits
const queue = new PQueue({
  interval: 60000, // 1 minute
  intervalCap: 60, // Maximum requests per minute
  concurrency: 1, // Process one request at a time
});

// Exponential backoff retry function
const retry = async (fn: Function, maxRetries = 4, initialDelay = 8000) => {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (retries >= maxRetries || error?.status !== 429) {
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      console.log(
        `Rate limit hit, retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    }
  }
};

export const aiSummariesCommit = async (diff: string) => {
  return queue.add(async () => {
    return retry(async () => {
      const response = await model.generateContent([
        `You are an expert programmer, and you are trying to summarize a git diff.

Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):
\`\`\`
diff --git a/lib/index.js b/lib/index.js
index aadf691..b0ef603 100644
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that \`lib/index.js\` was modified in this commit. Note that this is only an example. Then there is a specifier of the lines that were modified.
A line starting with \`+\` means it was added.
A line starting with \`-\` means that line was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding. It is not part of the diff.
[...]
EXAMPLE SUMMARY COMMENTS:
\`\`\`
- Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
- Fixed a typo in the GitHub action name (.github/workflows/gpt-commit-summarizer.yml)
- Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
- Added an OpenAI API for completions [packages/utils/apis/openai.ts]
- Lowered numeric tolerance for test files
\`\`\`

\`\`\`
Most commits will have less comments than this example list. 
The last comment does not include the file names, 
because there were more than two relevant files in the hypothetical commit. 
Do not include parts of the example in your summary. 
It is given only as an example of appropriate comments.`,
        `Please summarize the following diff file: \n\n${diff}`,
      ]);
      return response.response.text();
    });
  });
};

export const aiSummariesCode = async (doc: Document) => {
  console.log("getting summary for:", doc.metadata.source);

  return queue
    .add(async () => {
      return retry(async () => {
        const code = doc.pageContent.slice(0, 10000);
        const response = await model.generateContent([
          `You are an expert software engineer who specializes in onboarding junior software developers onto projects
  `,
          `You are onboarding a junior software developer and you are explaining to them the purpose of the ${doc.metadata.source} file.
  `,
          `Here is the code:`,
          `\`\`\`
  ${code}
  \`\`\`
  `,
          `Give a summary of 100 words or less of the code above.`,
        ]);
        return response.response.text();
      });
    })
    .catch((error) => {
      console.error("Failed to generate summary:", error);
      return "";
    });
};

export const generateEmbedding = async (summary: string) => {
  return queue.add(async () => {
    return retry(async () => {
      const embeddingModel = genAI.getGenerativeModel({
        model: "text-embedding-004",
      });
      const result = await embeddingModel.embedContent(summary);
      return result.embedding.values;
    });
  });
};
