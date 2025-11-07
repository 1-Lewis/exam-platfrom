"use client";

import { useEffect, useState } from "react";

type Props = { examId: string };

type SubjectPayload = {
  ok: boolean;
  hasSubject?: boolean;
  mime?: string | null;
  filename?: string | null;
  size?: number | null;
  html?: string | null;
  url?: string | null;
};

const LS_KEY = (examId: string) => `exam:${examId}:subjectCollapsed`;

export default function SubjectSidebar({ examId }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem(LS_KEY(examId));
      return saved === "1";
    } catch { return false; }
  });

  const [subject, setSubject] = useState<SubjectPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY(examId), collapsed ? "1" : "0"); } catch {}
  }, [collapsed, examId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/exams/${examId}/subject`, { cache: "no-store" });
        const data: SubjectPayload = await res.json();
        if (alive) setSubject(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [examId]);

  return (
    <aside
      className={`relative transition-all duration-300 ease-out ${collapsed ? "w-6" : "w-80"} hidden md:block`}
      aria-label="Sujet de l'examen"
    >
      {/* Panneau sujet */}
      <div className={`h-full rounded-2xl border bg-white shadow-sm overflow-hidden ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="border-b px-3 py-2 text-sm font-medium text-gray-600">Sujet</div>
        <div className="p-3 overflow-auto max-h-[calc(100dvh-220px)] prose prose-sm max-w-none">
          {loading && <p className="text-gray-500">Chargement…</p>}
          {!loading && (!subject || subject.hasSubject === false) && (
            <p className="text-gray-500">Sujet indisponible.</p>
          )}

          {!loading && subject?.hasSubject && (
            <>
              {/* .docx converti */}
              {subject.html ? (
                <article dangerouslySetInnerHTML={{ __html: subject.html }} />
              ) : subject.mime?.includes("pdf") && subject.url ? (
                // PDF dans un iframe (URL signée S3)
                <iframe
                  title="Sujet PDF"
                  src={subject.url}
                  className="w-full h-[70vh] rounded-lg border"
                />
              ) : subject.url ? (
                <a
                  href={subject.url}
                  target="_blank"
                  className="text-sm text-blue-600 underline"
                  rel="noreferrer"
                >
                  Télécharger le sujet ({subject.filename ?? "fichier"})
                </a>
              ) : (
                <p className="text-gray-500">Sujet non prévisualisable.</p>
              )}
            </>
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
