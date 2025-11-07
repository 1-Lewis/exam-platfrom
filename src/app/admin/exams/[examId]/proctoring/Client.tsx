"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  attemptId: string;
  userId: string;
  status: "PENDING" | "ONGOING" | "SUBMITTED";
  startedAt: string | null;
  expectedEndAt: string | null;
  submittedAt: string | null;
  focusLossCountDb: number;
  focusLostEvents: number;
  pasteCount: number;
  multiTabCount: number;
  lastHeartbeatAt: string | null;
  lastActivityAt: string | null;
};

type Resp = { ok: boolean; items: Row[] };

export default function Client({ examId }: { examId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtres simples
  const [status, setStatus] = useState<"" | Row["status"]>("");
  const [focusThreshold, setFocusThreshold] = useState<number>(3);
  const [staleMinutes, setStaleMinutes] = useState<number>(5); // inactif si > 5 min

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/exams/${examId}/proctoring/summary`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Resp;
        if (!data.ok) throw new Error("Payload not ok");
        if (alive) setRows(data.items);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [examId]);

  const now = Date.now();

  const filtered = useMemo(() => {
    return rows.filter((r) => (status ? r.status === status : true));
  }, [rows, status]);

  function riskBadge(r: Row) {
    const focus = Math.max(r.focusLossCountDb ?? 0, r.focusLostEvents ?? 0);
    const pasted = r.pasteCount ?? 0;
    const multi = r.multiTabCount ?? 0;
    const last = r.lastHeartbeatAt ? new Date(r.lastHeartbeatAt).getTime() : null;
    const stale = last ? (now - last) / 60000 > staleMinutes : true;

    // Score naïf
    const score =
      (focus >= focusThreshold ? 1 : 0) +
      (pasted > 0 ? 1 : 0) +
      (multi > 0 ? 1 : 0) +
      (stale ? 1 : 0);

    if (score >= 3) return <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">élevé</span>;
    if (score === 2) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">moyen</span>;
    return <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">faible</span>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Statut</label>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as Row["status"] | "")}
            >
              <option value="">Tous</option>
              <option value="PENDING">PENDING</option>
              <option value="ONGOING">ONGOING</option>
              <option value="SUBMITTED">SUBMITTED</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Seuil pertes focus</label>
            <input
              type="number"
              className="w-[7rem] rounded-md border px-2 py-1 text-sm"
              value={focusThreshold}
              onChange={(e) => setFocusThreshold(Number(e.target.value || 0))}
              min={0}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Inactivité (min)</label>
            <input
              type="number"
              className="w-[7rem] rounded-md border px-2 py-1 text-sm"
              value={staleMinutes}
              onChange={(e) => setStaleMinutes(Number(e.target.value || 0))}
              min={0}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length}/{rows.length} affichées
        </div>
      </div>

      {loading && <div className="rounded-2xl border bg-white p-4 shadow-sm">Chargement…</div>}
      {err && <div className="rounded-2xl border bg-white p-4 shadow-sm text-red-600">Erreur : {err}</div>}

      {!loading && !err && (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr className="text-left">
                <th className="px-4 py-2">Risque</th>
                <th className="px-4 py-2">Attempt</th>
                <th className="px-4 py-2">Étudiant</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">FocusLoss</th>
                <th className="px-4 py-2">Pastes</th>
                <th className="px-4 py-2">Multi-tab</th>
                <th className="px-4 py-2">Dernier heartbeat</th>
                <th className="px-4 py-2">Dernière activité</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const focus = Math.max(r.focusLossCountDb ?? 0, r.focusLostEvents ?? 0);
                return (
                  <tr key={r.attemptId} className="border-t">
                    <td className="px-4 py-2">{riskBadge(r)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.attemptId}</td>
                    <td className="px-4 py-2">{r.userId}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">{focus}</td>
                    <td className="px-4 py-2">{r.pasteCount}</td>
                    <td className="px-4 py-2">{r.multiTabCount}</td>
                    <td className="px-4 py-2">
                      {r.lastHeartbeatAt ? new Date(r.lastHeartbeatAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/attempts/${r.attemptId}/proctoring`}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune copie correspondant aux filtres.
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
