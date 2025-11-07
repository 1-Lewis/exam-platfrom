// src/app/api/admin/attempts/[id]/events/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Kind = "event" | "proctor";

type Row = {
  id: string;
  kind: Kind;
  type: string;
  createdAt: Date;
  data: unknown | null;
};

function parseIsoMaybe(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function encCursor(obj: { t: Date; id: string; k: Kind }): string {
  return Buffer.from(
    JSON.stringify({ t: obj.t.toISOString(), id: obj.id, k: obj.k }),
    "utf8",
  ).toString("base64url");
}
function decCursor(c: string | null): { t: Date; id: string; k: Kind } | null {
  if (!c) return null;
  try {
    const o = JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as {
      t: string;
      id: string;
      k: Kind;
    };
    const t = new Date(o.t);
    if (Number.isNaN(t.getTime())) return null;
    const k = o.k === "proctor" ? "proctor" : "event";
    return { t, id: o.id, k };
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: attemptId } = await ctx.params;
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);

    const url = new URL(req.url);

    // ---- query params attendus par ton client
    const kindsParam = url.searchParams.get("kinds"); // "event,proctor"
    const typesCsv = url.searchParams.get("types"); // "FOCUS_LOST,PASTE"
    const from = parseIsoMaybe(url.searchParams.get("from"));
    const to = parseIsoMaybe(url.searchParams.get("to"));
    const limitNum = Number(url.searchParams.get("limit") ?? "200");
    const limit = Math.min(Math.max(1, Number.isFinite(limitNum) ? limitNum : 200), 500);
    const cursor = decCursor(url.searchParams.get("cursor"));

    const kinds: Kind[] = (() => {
      if (!kindsParam) return ["event", "proctor"];
      const set = new Set(
        kindsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as Kind[],
      );
      const arr: Kind[] = [];
      if (set.has("event")) arr.push("event");
      if (set.has("proctor")) arr.push("proctor");
      return arr.length ? arr : ["event", "proctor"];
    })();

    const types =
      typesCsv?.split(",").map((s) => s.trim()).filter(Boolean) ?? undefined;

    // Fenêtre temporelle & curseur (desc)
    const timeFilter: { gte?: Date; lte?: Date } = {};
    if (from) timeFilter.gte = from;
    if (to) timeFilter.lte = to;

    // Si curseur fourni, on restreint aux éléments STRICTEMENT antérieurs
    // (ou même timestamp mais id inférieur), triés par createdAt desc, id desc.
    const cursorWhere =
      cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.t } },
              { createdAt: cursor.t, id: { lt: cursor.id } },
            ],
          }
        : {};

    // On prend un peu plus que le limit de chaque source pour être sûr de ne pas "rater"
    // après fusion/tri.  (séquentiel, donc reste raisonnable)
    const TAKE_PER_SOURCE = Math.min(500, limit + 50);

    let results: Row[] = [];

    if (kinds.includes("event")) {
      const items = await prisma.event.findMany({
        where: {
          attemptId,
          ...(types ? { type: { in: types } } : {}),
          ...(from || to ? { createdAt: timeFilter } : {}),
          ...cursorWhere,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: TAKE_PER_SOURCE,
        select: { id: true, type: true, payload: true, createdAt: true },
      });

      results = results.concat(
        items.map<Row>((e) => ({
          id: e.id,
          kind: "event",
          type: e.type,
          createdAt: e.createdAt,
          data: e.payload ?? null,
        })),
      );
    }

    if (kinds.includes("proctor")) {
      const items = await prisma.proctorEvent.findMany({
        where: {
          attemptId,
          ...(types ? { type: { in: types } } : {}),
          ...(from || to ? { createdAt: timeFilter } : {}),
          ...cursorWhere,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: TAKE_PER_SOURCE,
        select: { id: true, type: true, meta: true, createdAt: true },
      });

      results = results.concat(
        items.map<Row>((e) => ({
          id: e.id,
          kind: "proctor",
          type: e.type,
          createdAt: e.createdAt,
          data: e.meta ?? null,
        })),
      );
    }

    // Fusion + tri global desc (date, puis id)
    results.sort((a, b) => {
      const dt = b.createdAt.getTime() - a.createdAt.getTime();
      if (dt !== 0) return dt;
      // id desc
      return b.id.localeCompare(a.id);
    });

    const slice = results.slice(0, limit);
    const last = slice[slice.length - 1] || null;
    const nextCursor = last
      ? encCursor({ t: last.createdAt, id: last.id, k: last.kind })
      : null;

    return NextResponse.json({
      ok: true,
      items: slice.map((r) => ({
        id: r.id,
        kind: r.kind,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
        data: r.data,
      })),
      nextCursor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json(
      { ok: false, error: msg },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
