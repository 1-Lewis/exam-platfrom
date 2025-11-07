// src/app/api/admin/attempts/[id]/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    // Vérifie que l’utilisateur est ADMIN ou TEACHER
    const session = await requireStaff();

    // Récupère attemptId depuis l’URL
    const { id } = await ctx.params;

    // Si TEACHER, vérifie qu’il est bien propriétaire de l’examen
    await assertTeacherOwnsAttemptOrAdmin(session, id);

    // Récupération de la tentative
    const attempt = await prisma.attempt.findUnique({
      where: { id },
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
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Dernière réponse enregistrée
    const last = await prisma.answer.findFirst({
      where: { attemptId: id },
      orderBy: { updatedAt: "desc" },
      select: { content: true, updatedAt: true },
    });

    // Construction du JSON exporté
    const payload = {
      attemptId: attempt.id,
      examId: attempt.examId,
      userId: attempt.userId,
      status: attempt.status,
      startedAt: attempt.startedAt ? attempt.startedAt.toISOString() : null,
      expectedEndAt: attempt.expectedEndAt ? attempt.expectedEndAt.toISOString() : null,
      submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
      lastSavedAt: last?.updatedAt ? last.updatedAt.toISOString() : null,
      content: last?.content ?? null, // TipTap JSON
    };

    const body = JSON.stringify(payload, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="attempt-${attempt.id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
