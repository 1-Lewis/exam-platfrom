// src/app/api/admin/attempts/[id]/detail/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: Ctx) {
  try {
    // Staff requis (ADMIN ou TEACHER)
    const session = await requireStaff();

    // Paramètre attemptId
    const { id: attemptId } = await ctx.params;

    // Si TEACHER, vérifie qu'il est bien le créateur de l'exam de cette attempt
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);

    // Attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examId: true,
        userId: true,
        status: true,
        startedAt: true,
        expectedEndAt: true,
        submittedAt: true,
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Dernière réponse
    const answer = await prisma.answer.findFirst({
      where: { attemptId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, content: true, updatedAt: true },
    });

    return NextResponse.json(
      {
        ok: true,
        attempt: {
          ...attempt,
          startedAt: attempt.startedAt ? attempt.startedAt.toISOString() : null,
          expectedEndAt: attempt.expectedEndAt ? attempt.expectedEndAt.toISOString() : null,
          submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
        },
        answer: answer
          ? { id: answer.id, content: answer.content, updatedAt: answer.updatedAt.toISOString() }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
