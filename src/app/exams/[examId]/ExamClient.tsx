// src/app/exams/[examId]/ExamClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useServerTimer } from "@/hooks/useServerTimer"; // hook de timer (voir plus bas)
import RichAnswerEditor from "@/components/RichAnswerEditor";
import SubmitButton from "@/components/SubmitButton";

type Props = {
  attemptId: string;
};

export default function ExamClient({ attemptId }: Props) {
  const { displayMs, locked } = useServerTimer(attemptId);

  return (
    <div className="space-y-4">
      {/* 🕒 Timer */}
      <div className="text-center text-lg font-semibold">
        {locked ? (
          <span className="text-red-600">Temps écoulé</span>
        ) : (
          <span>Temps restant : {Math.floor(displayMs / 1000)}s</span>
        )}
      </div>

      {/* 📝 Éditeur de réponse */}
      <RichAnswerEditor readOnly={locked} attemptId={attemptId} />

      {/* 🚀 Soumission */}
      <div className="pt-4 border-t flex justify-center">
        <SubmitButton attemptId={attemptId} locked={locked} />
      </div>
    </div>
  );
}
