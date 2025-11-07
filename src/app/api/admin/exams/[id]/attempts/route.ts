// src/app/api/admin/exams/[id]/attempts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

// Garde de type stricte pour la session (pas de `any`)
function isSession(obj: unknown): obj is { user: { id: string; role?: string | null } } {
  if (!obj || typeof obj !== "object") return false;
  const user = (obj as { user?: unknown }).user;
  if (!user || typeof user !== "object") return false;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string";
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff();
    const { id: examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);

    const attempts = await prisma.attempt.findMany({
      where: { examId },
      orderBy: [{ submittedAt: "desc" }],
      select: {
        id: true, userId: true, status: true,
        startedAt: true, expectedEndAt: true, submittedAt: true,
      },
    });

    const payload = attempts.map(a => ({
      id: a.id,
      userId: a.userId,
      status: a.status,
      startedAt: a.startedAt ? a.startedAt.toISOString() : null,
      expectedEndAt: a.expectedEndAt ? a.expectedEndAt.toISOString() : null,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
    }));

    return NextResponse.json({ ok: true, attempts: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}