// src/app/exams/[examId]/StartButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onStart() {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/start`, { method: "POST" });
      if (!res.ok) throw new Error("start failed");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Impossible de démarrer l'épreuve.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onStart}
      disabled={loading}
      className="px-4 py-2 rounded-xl border hover:bg-gray-50"
    >
      {loading ? "Démarrage..." : "Commencer l’épreuve"}
    </button>
  );
}
