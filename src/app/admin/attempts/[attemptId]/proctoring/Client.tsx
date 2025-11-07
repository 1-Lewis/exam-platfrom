"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  kind: "event" | "proctor";
  type: string;
  createdAt: string; // ISO
  data: unknown;
};

type FetchResp = {
  ok: boolean;
  items: Row[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 200;

export default function Client({ attemptId }: { attemptId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [onlyKinds, setOnlyKinds] = useState<Set<"event" | "proctor">>(new Set());
  const [typesCsv, setTypesCsv] = useState("");
  const [from, setFrom] = useState<string>(""); // e.g. "2025-11-07T09:00"
  const [to, setTo] = useState<string>("");

  function buildQuery(cursor?: string) {
    const u = new URL(`/api/admin/attempts/${attemptId}/events`, window.location.origin);
    if (onlyKinds.size) u.searchParams.set("kinds", Array.from(onlyKinds).join(","));
    if (typesCsv.trim()) u.searchParams.set("types", typesCsv.trim());
    if (from) u.searchParams.set("from", new Date(from).toISOString());
    if (to) u.searchParams.set("to", new Date(to).toISOString());
    u.searchParams.set("limit", String(DEFAULT_LIMIT));
    if (cursor) u.searchParams.set("cursor", cursor);
    return u.toString();
  }

  async function load(initial = false) {
    setLoading(true);
    setError(null);
    try {
      const url = buildQuery(initial ? undefined : nextCursor || undefined);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FetchResp;
      if (!data.ok) throw new Error("Payload not ok");

      setRows((prev) => (initial ? data.items : [...prev, ...data.items]));
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  // première charge
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // reset liste quand filtres changent
  useEffect(() => {
    setRows([]);
    setNextCursor(null);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyKinds, typesCsv, from, to]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex items-center gap-3">
            <legend className="text-sm text-muted-foreground">Sources</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={onlyKinds.has("event")}
                onChange={(e) => {
                  setOnlyKinds((s) => {
                    const n = new Set(s);
                    e.target.checked ? n.add("event") : n.delete("event");
                    return n;
                  });
                }}
              />
              Event
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={onlyKinds.has("proctor")}
                onChange={(e) => {
                  setOnlyKinds((s) => {
                    const n = new Set(s);
                    e.target.checked ? n.add("proctor") : n.delete("proctor");
                    return n;
                  });
                }}
              />
              ProctorEvent
            </label>
          </fieldset>

          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Types (CSV)</label>
            <input
              className="rounded-md border px-2 py-1 text-sm"
              placeholder="FOCUS_LOST,PASTE,SNAPSHOT_TAKEN"
              value={typesCsv}
              onChange={(e) => setTypesCsv(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">De</label>
            <input
              type="datetime-local"
              className="rounded-md border px-2 py-1 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">À</label>
            <input
              type="datetime-local"
              className="rounded-md border px-2 py-1 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/attempts/${attemptId}/events.csv${
              (() => {
                const q = new URLSearchParams();
                if (onlyKinds.size) q.set("kinds", Array.from(onlyKinds).join(","));
                if (typesCsv.trim()) q.set("types", typesCsv.trim());
                if (from) q.set("from", new Date(from).toISOString());
                if (to) q.set("to", new Date(to).toISOString());
                const s = q.toString();
                return s ? `?${s}` : "";
              })()
            }`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Export CSV
          </a>

          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => load(false)}
            disabled={loading || !nextCursor}
            title={nextCursor ? "Charger plus" : "Fin de la liste"}
          >
            {loading ? "Chargement…" : nextCursor ? "Plus..." : "Fin"}
          </button>
        </div>
      </div>

      {/* Timeline simple */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium">Timeline</div>
        <ol className="relative ml-3 border-l pl-4">
          {filtered.map((r) => (
            <li key={r.id} className="mb-4">
              <div className="absolute -left-1.5 mt-1 size-3 rounded-full bg-gray-400" />
              <div className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="text-sm">
                <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                  {r.kind}
                </span>
                <span className="font-medium">{r.type}</span>
              </div>
              {r.data ? (
                <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucun évènement.</li>
          )}
        </ol>
      </div>

      {/* Tableau brut */}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                    {r.kind}
                  </span>
                </td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">
                  {r.data ? (
                    <pre className="overflow-auto rounded bg-gray-50 p-2 text-xs">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Aucun évènement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm text-red-600">
          Erreur : {error}
        </div>
      )}
    </div>
  );
}
