"use client";

import { useState } from "react";

export default function SubjectUploader({
  examId,
  current,
}: { examId: string; current: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/exams/${examId}/subject`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      setMsg("Sujet importé avec succès.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border p-4 bg-white shadow-sm"
    >
      <div className="text-sm text-gray-600">
        Sujet actuel : {current ?? "— aucun —"}
      </div>
      <input
        type="file"
        required
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!file || loading}
          className="px-3 py-1.5 rounded-lg border bg-gray-900 text-white disabled:opacity-50"
        >
          {loading ? "Import…" : "Importer le sujet"}
        </button>
        {msg && <span className="text-green-700 text-sm">{msg}</span>}
        {err && <span className="text-red-600 text-sm">{err}</span>}
      </div>
    </form>
  );
}
