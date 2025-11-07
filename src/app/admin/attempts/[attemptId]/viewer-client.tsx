// src/app/admin/attempts/[attemptId]/viewer-client.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";

const ReadOnlyEditor = dynamic(() => import("./viewer-editor"), { ssr: false });

type AttemptPayload = {
  ok: boolean;
  attempt: {
    id: string;
    examId: string;
    userId: string;
    status: "PENDING" | "ONGOING" | "SUBMITTED";
    startedAt: string | null;
    expectedEndAt: string | null;
    submittedAt: string | null;
  };
  answer: { id: string; content: JSONContent | null; updatedAt: string } | null;
};

export default function AttemptViewer({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<AttemptPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/attempts/${attemptId}/detail`, { cache: "no-store" });
        const json = (await res.json()) as AttemptPayload;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ ok: false } as unknown as AttemptPayload);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [attemptId]);

  if (loading) {
    return <div className="rounded-2xl border bg-white p-4 shadow-sm">Chargement…</div>;
  }
  if (!data?.ok) {
    return <div className="text-red-600">Impossible de charger la copie.</div>;
  }

  const submittedAt =
    data.attempt.submittedAt ? new Date(data.attempt.submittedAt).toLocaleString() : "—";
  const lastSaved =
    data.answer?.updatedAt ? new Date(data.answer.updatedAt).toLocaleString() : "—";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">
        <div>Attempt: <span className="font-mono text-xs">{data.attempt.id}</span></div>
        <div>Étudiant: {data.attempt.userId}</div>
        <div>Statut: {data.attempt.status}</div>
        <div>Soumis: {submittedAt}</div>
        <div>Dernière sauvegarde: {lastSaved}</div>
      </div>

      {/* Barre d’actions export */}
      <div className="flex items-center justify-end gap-2">
        <a
          href={`/api/admin/attempts/${attemptId}/export`}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Export JSON
        </a>
        <a
          href={`/api/admin/attempts/${attemptId}/export/pdf`}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          target="_blank"
          rel="noreferrer"
        >
          Exporter en PDF
        </a>
      </div>

      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <ReadOnlyEditor
          initial={
            data.answer?.content ?? {
              type: "doc",
              content: [{ type: "paragraph" }],
            }
          }
        />
      </div>
    </div>
  );
}
