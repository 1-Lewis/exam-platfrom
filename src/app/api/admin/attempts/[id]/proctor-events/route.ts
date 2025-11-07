// src/app/api/admin/attempts/[id]/proctor-events/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Source = "event" | "proctor";

function encCursor(d: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: d.toISOString(), id }), "utf8").toString("base64url");
}
function decCursor(c: string | null): { t: Date; id: string } | null {
  if (!c) return null;
  try {
    const o = JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as { t: string; id: string };
    const t = new Date(o.t);
    if (Number.isNaN(t.getTime())) return null;
    return { t, id: o.id };
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
    const source = (url.searchParams.get("source") as Source) || "event";
    const limitParam = Number(url.searchParams.get("limit") ?? "50");
    const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 50), 200);
    const cursorRaw = url.searchParams.get("cursor");
    const typesCsv = url.searchParams.get("types"); // ex: "FOCUS_LOST,PASTE"

    const cursor = decCursor(cursorRaw);

    if (source === "event") {
      const where = {
        attemptId,
        ...(typesCsv
          ? { type: { in: typesCsv.split(",").map((s) => s.trim()).filter(Boolean) } }
          : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.t } },
                { createdAt: cursor.t, id: { lt: cursor.id } },
              ],
            }
          : {}),
      } as const;

      const items = await prisma.event.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: { id: true, type: true, payload: true, createdAt: true },
      });

      const hasMore = items.length > limit;
      const slice = items.slice(0, limit);
      const nextCursor = hasMore
        ? encCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
        : null;

      return NextResponse.json({
        ok: true,
        source,
        items: slice.map((e) => ({
          id: e.id,
          type: e.type,
          payload: e.payload,
          createdAt: e.createdAt.toISOString(),
        })),
        nextCursor,
      });
    }

    // source === "proctor"
    const where = {
      attemptId,
      ...(typesCsv
        ? { type: { in: typesCsv.split(",").map((s) => s.trim()).filter(Boolean) } }
        : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.t } },
              { createdAt: cursor.t, id: { lt: cursor.id } },
            ],
          }
        : {}),
    } as const;

    const items = await prisma.proctorEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: { id: true, type: true, meta: true, createdAt: true },
    });

    const hasMore = items.length > limit;
    const slice = items.slice(0, limit);
    const nextCursor = hasMore
      ? encCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
      : null;

    return NextResponse.json({
      ok: true,
      source,
      items: slice.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.meta,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
