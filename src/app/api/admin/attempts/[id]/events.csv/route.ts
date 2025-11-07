// src/app/api/admin/attempts/[id]/events.csv/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Kind = "event" | "proctor";

function parseIsoMaybe(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: attemptId } = await ctx.params;
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);

    const url = new URL(req.url);
    const kindsParam = url.searchParams.get("kinds"); // "event,proctor"
    const typesCsv = url.searchParams.get("types");
    const from = parseIsoMaybe(url.searchParams.get("from"));
    const to = parseIsoMaybe(url.searchParams.get("to"));

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

    const timeFilter: { gte?: Date; lte?: Date } = {};
    if (from) timeFilter.gte = from;
    if (to) timeFilter.lte = to;

    // Récupération simple (pas de pagination) + fusion triée ASC pour CSV
    type Row = { id: string; kind: Kind; type: string; createdAt: Date; data: unknown | null };
    let rows: Row[] = [];

    if (kinds.includes("event")) {
      const items = await prisma.event.findMany({
        where: {
          attemptId,
          ...(types ? { type: { in: types } } : {}),
          ...(from || to ? { createdAt: timeFilter } : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, payload: true, createdAt: true },
      });
      rows = rows.concat(
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
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, meta: true, createdAt: true },
      });
      rows = rows.concat(
        items.map<Row>((e) => ({
          id: e.id,
          kind: "proctor",
          type: e.type,
          createdAt: e.createdAt,
          data: e.meta ?? null,
        })),
      );
    }

    // Tri global ASC puis CSV
    rows.sort((a, b) => {
      const dt = a.createdAt.getTime() - b.createdAt.getTime();
      if (dt !== 0) return dt;
      return a.id.localeCompare(b.id);
    });

    const header = ["id", "createdAt", "kind", "type", "data"];
    const csv = [header.join(",")]
      .concat(
        rows.map((r) =>
          [
            r.id,
            r.createdAt.toISOString(),
            r.kind,
            r.type,
            JSON.stringify(r.data ?? null).replaceAll('"', '""'),
          ]
            .map((v) => `"${String(v)}"`)
            .join(","),
        ),
      )
      .join("\n");

    return new NextResponse(Buffer.from(csv, "utf8"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attempt-${attemptId}-events.csv"`,
        "Cache-Control": "no-store",
      },
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
