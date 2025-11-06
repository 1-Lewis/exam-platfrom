"use client";

import { useEffect, useState } from "react";

type Props = {
  examId: string;
  subjectHtml?: string; // passe le HTML du sujet si tu l'as (sinon texte placeholder)
};

const LS_KEY = (examId: string) => `exam:${examId}:subjectCollapsed`;

export default function SubjectSidebar({ examId, subjectHtml }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem(LS_KEY(examId));
      return saved === "1";
    } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY(examId), collapsed ? "1" : "0"); } catch {}
  }, [collapsed, examId]);

  return (
    <aside
      className={`relative transition-all duration-300 ease-out ${
        collapsed ? "w-6" : "w-80"
      } hidden md:block`}
      aria-label="Sujet de l'examen"
    >
      {/* Panneau sujet */}
      <div
        className={`h-full rounded-2xl border bg-white shadow-sm overflow-hidden ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="border-b px-3 py-2 text-sm font-medium text-gray-600">Sujet</div>
        <div className="p-3 overflow-auto max-h-[calc(100dvh-220px)] prose prose-sm max-w-none">
          {subjectHtml ? (
            <article dangerouslySetInnerHTML={{ __html: subjectHtml }} />
          ) : (
            <p className="text-gray-500">Sujet indisponible.</p>
          )}
        </div>
      </div>

      {/* Bouton flèche */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-12 z-10 h-8 w-8 rounded-full border bg-white shadow hover:bg-gray-50 active:scale-95 transition"
        aria-label={collapsed ? "Afficher le sujet" : "Replier le sujet"}
        title={collapsed ? "Afficher le sujet" : "Replier le sujet"}
      >
        <svg viewBox="0 0 24 24" className={`mx-auto h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} aria-hidden>
          <path d="M15.5 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}
