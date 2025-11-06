// src/app/api/exams/[id]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>; // ⬅️ params est un Promise sous Next 16
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Unwrap des params
    const { id: idFromParams } = await ctx.params;

    // 🔒 Filet de sécurité : si jamais idFromParams est vide, on tente de parser l’URL
    let examId = idFromParams;
    if (!examId) {
      const url = new URL(req.url);
      // /api/exams/:id/start -> on récupère le segment entre "exams" et "start"
      const parts = url.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "exams");
      if (i !== -1 && parts[i + 1] && parts[i + 2] === "start") {
        examId = parts[i + 1];
      }
    }
    if (!examId) {
      return NextResponse.json({ error: "Missing exam id" }, { status: 400 });
    }

    // 1) Vérifie l'existence de l'examen
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, durationMin: true },
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const fallbackDurationSec =
      typeof exam.durationMin === "number" ? exam.durationMin * 60 : 60 * 60;

    // 2) Idempotent : réutilise une tentative existante si non soumise
    let attempt = await prisma.attempt.findFirst({
      where: { examId, userId: session.user.id },
      select: {
        id: true,
        status: true,
        durationSec: true,
        startedAt: true,
        expectedEndAt: true,
        submittedAt: true,
      },
    });

    // Crée si absente
    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          examId,
          userId: session.user.id,
          durationSec: fallbackDurationSec,
          status: "ONGOING", // adapte à ton enum
        },
        select: {
          id: true,
          status: true,
          durationSec: true,
          startedAt: true,
          expectedEndAt: true,
          submittedAt: true,
        },
      });
    }

    // Déjà soumise
    if (attempt.submittedAt || attempt.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Already submitted", attemptId: attempt.id },
        { status: 409 }
      );
    }

    // Déjà démarrée
    if (attempt.startedAt && attempt.expectedEndAt) {
      return NextResponse.json(
        {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          expectedEndAt: attempt.expectedEndAt,
        },
        { status: 200 }
      );
    }

    // Démarrage
    const now = new Date();
    const durationSec =
      typeof attempt.durationSec === "number" ? attempt.durationSec : fallbackDurationSec;
    const expectedEndAt = new Date(now.getTime() + durationSec * 1000);

    const updated = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        startedAt: now,
        expectedEndAt,
        status: "ONGOING",
        durationSec,
      },
      select: { id: true, startedAt: true, expectedEndAt: true },
    });

    return NextResponse.json(
      {
        attemptId: updated.id,
        startedAt: updated.startedAt,
        expectedEndAt: updated.expectedEndAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/exams/[id]/start] error", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}
