// src/app/exams/[examId]/ExamClient.tsx
"use client";

import dynamic from "next/dynamic";
import { useServerTimer } from "@/hooks/useServerTimer";
import SubmitButton from "@/components/SubmitButton";
import MathToolbar from "./MathToolbar";
import SubjectSidebar from "./SubjectSideBar";
import { useParams } from "next/navigation";
import { AttemptClientProctoring } from "./AttemptClientProctoring";

const RichAnswerEditor = dynamic(() => import("@/components/RichAnswerEditor"), { ssr: false });

type Props = {
  attemptId: string;
};

export default function ExamClient({ attemptId }: Props) {
  // récupère examId depuis l'URL
  const params = useParams<{ examId: string }>();
  const examId = typeof params.examId === "string" ? params.examId : "";

  const { displayMs, locked, time } = useServerTimer(attemptId);

  const mmss = (() => {
    const s = Math.max(0, Math.floor(displayMs / 1000));
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  })();

  const isSubmitted = time?.status === "SUBMITTED" || !!time?.submittedAt;

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Proctoring (si déjà rendu dans page.tsx, supprime l'un des deux pour éviter le double start) */}
      <AttemptClientProctoring attemptId={attemptId} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold">Examen</h1>
          <div className={`font-mono text-lg ${locked ? "text-red-600" : "text-gray-800"}`}>
            ⏱ {locked ? (isSubmitted ? "Soumis" : "Temps écoulé") : mmss}
          </div>
        </div>

        {isSubmitted && (
          <div className="bg-green-50 border-t border-b border-green-200">
            <div className="mx-auto max-w-6xl px-4 py-2 text-sm text-green-700">
              Copie envoyée
              {time?.submittedAt ? ` — ${new Date(time.submittedAt).toLocaleString()}` : ""}.
              L’éditeur est désormais en lecture seule.
            </div>
          </div>
        )}
      </header>

      {/* Corps : sujet à gauche, rédaction à droite */}
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
        {/* Sujet repliable, sticky */}
        <div className="md:sticky md:top-20 self-start">
          <SubjectSidebar examId={examId} />
        </div>

        {/* Zone de rédaction + math */}
        <section>
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-600">Rédaction</h2>
              {locked && <span className="text-xs text-red-600">Verrouillé</span>}
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
  );
}
