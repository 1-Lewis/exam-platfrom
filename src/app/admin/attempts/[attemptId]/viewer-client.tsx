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
      const res = await fetch(`/api/admin/attempts/${attemptId}/detail`, { cache: "no-store" });
      const json = (await res.json()) as AttemptPayload;
      if (alive) setData(json);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [attemptId]);

  if (loading) return <div className="rounded-2xl border bg-white p-4 shadow-sm">Chargement…</div>;
  if (!data?.ok) return <div className="text-red-600">Impossible de charger la copie.</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">
        <div>Attempt: <span className="font-mono text-xs">{data.attempt.id}</span></div>
        <div>Étudiant: {data.attempt.userId}</div>
        <div>Statut: {data.attempt.status}</div>
        <div>Soumis: {data.attempt.submittedAt ? new Date(data.attempt.submittedAt).toLocaleString() : "—"}</div>
        <div>Dernière sauvegarde: {data.answer?.updatedAt ? new Date(data.answer.updatedAt).toLocaleString() : "—"}</div>
      </div>

      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <ReadOnlyEditor initial={data.answer?.content ?? { type: "doc", content: [{ type: "paragraph" }] }} />
      </div>
    </div>
  );
}
