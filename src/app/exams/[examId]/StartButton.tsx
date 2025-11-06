// src/app/exams/[examId]/StartButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onStart = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      const data: { attemptId: string } = await res.json();
      if (!data?.attemptId) throw new Error("Missing attemptId in response");

      // On reste sur /exams/[examId] : la page SSR détecte l'Attempt et rend ExamClient
      router.refresh();
    } catch (e) {
      console.error("start failed", e);
      setErr(e instanceof Error ? e.message : "Échec de démarrage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="rounded-lg border px-4 py-2 bg-gray-900 text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Démarrage..." : "Démarrer l’épreuve"}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
