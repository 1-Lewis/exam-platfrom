"use client";

import { useEffect, useState } from "react";

type AttemptStatus = "PENDING" | "ONGOING" | "SUBMITTED";

type AttemptRow = {
  id: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string | null;
  expectedEndAt: string | null;
  submittedAt: string | null;
};

export default function ClientInner({ examId }: { examId: string }) {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/exams/${examId}/attempts`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; attempts?: AttemptRow[] };
        if (alive && data.ok && data.attempts) setRows(data.attempts);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [examId]);

  const zipHref = `/api/admin/exams/${examId}/export-zip`;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      {/* Barre supérieure avec titre + bouton ZIP */}
      <div className="border-b px-4 py-3 text-sm font-medium text-gray-600 flex items-center justify-between">
        <span>{loading ? "Chargement…" : `Copies (${rows.length})`}</span>
        <a
          href={zipHref}
          className="px-3 py-1.5 rounded-lg border bg-gray-900 text-white hover:bg-gray-800 transition"
          title="Télécharger toutes les copies au format ZIP"
        >
          Télécharger toutes les copies (.zip)
        </a>
      </div>

      <div className="p-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">Attempt</th>
              <th className="py-2 pr-4">Étudiant</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Soumis le</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} className="border-t">
                <td className="py-2 pr-4 font-mono text-xs">{a.id}</td>
                <td className="py-2 pr-4">{a.userId}</td>
                <td className="py-2 pr-4">{a.status}</td>
                <td className="py-2 pr-4">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}</td>
                <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                        <a className="text-blue-600 underline" href={`/admin/attempts/${a.id}`}>
                        Ouvrir la copie
                        </a>
                        <a
                        className="text-gray-700 underline"
                        href={`/api/admin/attempts/${a.id}/export`}
                        title="Télécharger cette copie (JSON)"
                        >
                        Télécharger
                        </a>
                    </div>
                    </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="py-4 text-gray-500" colSpan={5}>
                  Aucune copie pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
