// src/app/exams/[examId]/ExamClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useServerTimer } from "@/hooks/useServerTimer"; // hook de timer (voir plus bas)
import SubmitButton from "@/components/SubmitButton";
import { AttemptClientProctoring } from "./AttemptClientProctoring"; // 👈 NEW
import MathToolbar from "./MathToolbar";
import SubjectSidebar from "./SubjectSideBar";
import dynamic from "next/dynamic";
const RichAnswerEditor = dynamic(() => import("@/components/RichAnswerEditor"), { ssr: false });
type Props = {
  attemptId: string;
};

export default function ExamClient({ attemptId }: Props) {
  const { displayMs, locked } = useServerTimer(attemptId);

  // (Optionnel) format joli mm:ss
  const mmss = (() => {
    const s = Math.max(0, Math.floor(displayMs / 1000));
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  })();

return (
  <div className="min-h-[100dvh] bg-white">
    {/* proctoring */}
    <AttemptClientProctoring attemptId={attemptId} />

    {/* Header simple */}
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Examen</h1>
        <div className={`font-mono text-lg ${locked ? "text-red-600" : "text-gray-800"}`}>
          ⏱ {locked ? "Temps écoulé" : mmss}
        </div>
      </div>
    </header>

    {/* Corps : sujet à gauche, rédaction à droite */}
    <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
      {/* Sujet repliable */}
      <SubjectSidebar examId={"exam"} />

      {/* Zone de rédaction + math */}
      <section>
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium text-gray-600">Rédaction</h2>
          </div>
          <div className="p-3 sm:p-4">
            <div className="mb-4">
              <MathToolbar display="inline" />
            </div>
            <RichAnswerEditor readOnly={locked} attemptId={attemptId} />
          </div>
        </div>
      </section>
    </main>

    {/* Footer : soumission */}
    <footer className="sticky bottom-0 z-30 border-t bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-end">
        <SubmitButton attemptId={attemptId} locked={locked} />
      </div>
    </footer>
  </div>
)}
