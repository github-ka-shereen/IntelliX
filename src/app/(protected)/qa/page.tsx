"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { useState } from "react";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";

import MDEditor from "@uiw/react-md-editor";
import AskQuestionCard from "../dashboard/ask-question-card";
import CodeReferences from "../dashboard/code-references";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {};

const QAPage = (props: Props) => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });

  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions?.[questionIndex];

  return (
    <Drawer>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold">Saved Questions</h1>
      <div className="h-2"></div>
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <React.Fragment key={question.id}>
              <DrawerTrigger
                onClick={() => {
                  setQuestionIndex(index);
                }}
              >
                <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-border">
                  <img
                    className="rounded-full"
                    height={30}
                    width={30}
                    src={question.user.imageUrl ?? ""}
                  />
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-grey-700 line-clamp-1 text-lg font-medium">
                        {question.question}
                      </p>
                      <span className="whitespace-nowrap text-sm text-gray-400">
                        {question.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      {question.answer}
                    </p>
                  </div>
                </div>
              </DrawerTrigger>
            </React.Fragment>
          );
        })}
      </div>
      {question && (
        <DrawerContent className="mb-16 max-h-[85vh] p-5">
          <DrawerHeader className="flex items-center justify-between gap-5">
            <DrawerTitle>{question.question}</DrawerTitle>
            <DialogPrimitive.Close>
              <Button variant={"destructive"} size={"lg"} type="button">
                <X /> Close
              </Button>
            </DialogPrimitive.Close>
          </DrawerHeader>
          <div className="flex gap-4">
            <MDEditor.Markdown
              className="h-[80vh] overflow-y-auto rounded-md border border-gray-200 p-4"
              source={question.answer}
            />
            <CodeReferences
              fileReferences={question.fileReferences ?? ([] as any)}
            />
          </div>
        </DrawerContent>
      )}
    </Drawer>
  );
};

export default QAPage;
