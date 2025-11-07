// src/app/api/admin/attempts/[id]/proctor-events/export/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: attemptId } = await ctx.params;
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);

    const url = new URL(req.url);
    const source = (url.searchParams.get("source") || "event") as "event" | "proctor";
    const typesCsv = url.searchParams.get("types"); // "FOCUS_LOST,PASTE"
    const from = url.searchParams.get("from"); // ISO date
    const to = url.searchParams.get("to");     // ISO date

    const commonRange =
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {};

    const where =
      source === "event"
        ? {
            attemptId,
            ...(typesCsv ? { type: { in: typesCsv.split(",").map((s) => s.trim()).filter(Boolean) } } : {}),
            ...commonRange,
          }
        : {
            attemptId,
            ...(typesCsv ? { type: { in: typesCsv.split(",").map((s) => s.trim()).filter(Boolean) } } : {}),
            ...commonRange,
          };

    if (source === "event") {
      const rows = await prisma.event.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, payload: true, createdAt: true },
      });

      const header = ["id", "createdAt", "type", "payload"];
      const csv =
        [header.join(",")].concat(
          rows.map((r) =>
            [
              r.id,
              r.createdAt.toISOString(),
              r.type,
              JSON.stringify(r.payload ?? null).replaceAll('"', '""'),
            ]
              .map((v) => `"${String(v)}"`)
              .join(","),
          ),
        ).join("\n");

      const buf = Buffer.from(csv, "utf8");
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attempt-${attemptId}-${source}-events.csv"`,
          "Cache-Control": "no-store",
        },
      });
    } else {
      const rows = await prisma.proctorEvent.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, meta: true, createdAt: true },
      });

      const header = ["id", "createdAt", "type", "payload"];
      const csv =
        [header.join(",")].concat(
          rows.map((r) =>
            [
              r.id,
              r.createdAt.toISOString(),
              r.type,
              JSON.stringify(r.meta ?? null).replaceAll('"', '""'),
            ]
              .map((v) => `"${String(v)}"`)
              .join(","),
          ),
        ).join("\n");

      const buf = Buffer.from(csv, "utf8");
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attempt-${attemptId}-${source}-events.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
