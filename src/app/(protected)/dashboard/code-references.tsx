"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  fileReferences: { fileName: string; sourceCode: string; summary: string }[];
};

const CodeReferences = ({ fileReferences }: Props) => {
  const [tab, setTab] = useState(fileReferences[0]?.fileName);

  const formatCode = (code: string) => {
    // Handle Docker-style line continuations
    return code
      .replace(/\\\n/g, "\n") // Handle line continuations
      .replace(/\\n/g, "\n") // Replace string literal newlines
      .replace(/"\n"/g, "\n") // Replace quoted newlines
      .trim(); // Remove extra whitespace
  };

  if (fileReferences.length === 0) return null;

  return (
    <div className="max-w-[50vw]">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="gap-2 overflow-y-scroll rounded-md bg-gray-200 p-1">
          {fileReferences.map((file) => (
            <button
              onClick={() => setTab(file.fileName)}
              key={file.fileName}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted",
                {
                  "bg-primary text-primary-foreground": tab === file.fileName,
                },
              )}
            >
              {file.fileName}
            </button>
          ))}
          {fileReferences.map((file) => (
            <TabsContent
              key={file.fileName}
              value={file.fileName}
              className="max-h-[70vh] max-w-7xl overflow-y-scroll rounded-md"
            >
              <SyntaxHighlighter
                language="typescript"
                style={atomDark}
                wrapLines={true}
                showLineNumbers={true}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.375rem",
                }}
              >
                {formatCode(file.sourceCode)}
              </SyntaxHighlighter>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default CodeReferences;
