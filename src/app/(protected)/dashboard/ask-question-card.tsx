"use client";

import { Button } from "@/components/ui/button";
import MDEditor from "@uiw/react-md-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import Image from "next/image";
import { useState } from "react";
import { askQuestion } from "./actions";
import { readStreamableValue } from "ai/rsc";
import CodeReferences from "./code-references";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { X } from "lucide-react";

const AskQuestionCard = () => {
  const { project } = useProject();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileReferences, setFileReferences] = useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = useState("");
  const saveAnswer = api.project.saveAnswer.useMutation();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFileReferences([]);
    if (!project) return;
    e.preventDefault();
    setLoading(true);

    const { output, fileReferences } = await askQuestion(question, project.id!);
    setOpen(true);
    setFileReferences(fileReferences);

    for await (const delta of readStreamableValue(output)) {
      if (delta) {
        setAnswer((ans) => ans + delta);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mb-16 max-h-[85vh] p-5">
          <DrawerHeader className="flex items-center justify-between gap-5">
            <DialogTitle>
              <Image src="/logo.png" alt="logo" width={40} height={40} />
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                disabled={saveAnswer.isPending}
                variant={"outline"}
                onClick={() => {
                  saveAnswer.mutate(
                    {
                      projectId: project!.id,
                      question,
                      answer,
                      fileReferences,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer saved!");
                      },
                      onError: () => {
                        toast.error("Something went wrong");
                      },
                    },
                  );
                }}
              >
                Save answer
              </Button>
            </div>
            <Button
              size={"lg"}
              variant={"destructive"}
              type="button"
              onClick={() => {
                setAnswer("");
                setQuestion("");
                setFileReferences([]);
                setOpen(false);
              }}
            >
              <X /> Close
            </Button>
          </DrawerHeader>

          <div className="flex gap-4">
            <MDEditor.Markdown
              source={answer}
              className="h-[80vh] overflow-y-auto rounded-md border border-gray-200 p-4"
            />
            <CodeReferences fileReferences={fileReferences} />
          </div>
        </DrawerContent>
      </Drawer>

      <Card className="relative col-span-3">
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Which file should i edit to change to home page?"
            />
            <div className="h-4"></div>
            <Button type="submit" disabled={loading}>
              {!loading ? (
                <p>Ask IntelliX</p>
              ) : (
                <p className="animate-pulse">Getting Answer...</p>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
