// src/app/exams/[id]/ExamClient.tsx
"use client";

import { useServerTimer } from "@/hooks/useServerTimer";
import { TimerBanner } from "@/components/TimeBanner";
// import RichAnswerEditor from "@/components/RichAnswerEditor"; // si tu l'utilises ici

export default function ExamClient({ attemptId }: { attemptId: string }) {
  const { displayMs, locked } = useServerTimer(attemptId);

  return (
    <div className="space-y-4">
      <TimerBanner ms={displayMs} locked={locked} />
      {/* Exemple : désactive ton éditeur si locked */}
      {/* <RichAnswerEditor readOnly={locked} attemptId={attemptId} /> */}
    </div>
  );
}
