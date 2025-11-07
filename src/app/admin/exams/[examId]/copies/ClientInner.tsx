// src/app/admin/exams/[examId]/copies/ClientInner.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type AttemptRow = {
  id: string;
  userId: string;
  status: "PENDING" | "ONGOING" | "SUBMITTED";
  startedAt: string | null;
  expectedEndAt: string | null;
  submittedAt: string | null;
};

export default function ClientInner({ examId }: { examId: string }) {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlySubmitted, setOnlySubmitted] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/exams/${examId}/attempts`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ok: boolean;
          attempts: AttemptRow[];
        };
        if (!data.ok) throw new Error("Payload not ok");
        if (alive) setRows(data.attempts);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [examId]);

  const filtered = useMemo(
    () => (onlySubmitted ? rows.filter((r) => r.status === "SUBMITTED") : rows),
    [rows, onlySubmitted],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={onlySubmitted}
              onChange={(e) => setOnlySubmitted(e.target.checked)}
            />
            Soumises uniquement
          </label>
          <span className="text-xs text-muted-foreground">
            {filtered.length}/{rows.length} affichées
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/exams/${examId}/export-zip`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            title="Export JSON + CSV (ZIP)"
          >
            Export ZIP (JSON+CSV)
          </a>
          <a
            href={`/api/admin/exams/${examId}/export-zip?withPdf=1`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            title="Export ZIP incluant les PDF"
          >
            Export ZIP + PDF
          </a>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">Chargement…</div>
      )}
      {error && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm text-red-600">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr className="text-left">
                <th className="px-4 py-2">Attempt</th>
                <th className="px-4 py-2">Étudiant (userId)</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Début</th>
                <th className="px-4 py-2">Fin prévue</th>
                <th className="px-4 py-2">Soumis</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-2">{r.userId}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        r.status === "SUBMITTED"
                          ? "rounded bg-green-100 px-2 py-0.5 text-green-800"
                          : r.status === "ONGOING"
                          ? "rounded bg-yellow-100 px-2 py-0.5 text-yellow-800"
                          : "rounded bg-gray-100 px-2 py-0.5 text-gray-800"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.expectedEndAt
                      ? new Date(r.expectedEndAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>
                    Aucune copie à afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
