// src/app/api/exams/[id]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examId = params.id;

  // On NE crée PAS d'Attempt ici : il doit déjà exister (provisionné par l’admin)
  const attempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      durationSec: true,
      startedAt: true,
      expectedEndAt: true,
    },
  });

  // Non provisionné pour cet élève
  if (!attempt) {
    // 403 si tu considères que l’exam existe mais non affecté ; 404 si tu préfères rester neutre
    return NextResponse.json({ error: "Exam not assigned to this user" }, { status: 403 });
  }

  if (attempt.status === "SUBMITTED") {
    return NextResponse.json(
      { error: "Already submitted", id: attempt.id, status: attempt.status },
      { status: 409 }
    );
  }

  // Idempotent : si déjà démarré, renvoie l’état courant
  if (attempt.startedAt && attempt.expectedEndAt) {
    return NextResponse.json({
      id: attempt.id,
      started: true,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expectedEndAt: attempt.expectedEndAt,
    });
  }

  // Démarre la tentative
  const now = new Date();
  const expectedEnd = new Date(now.getTime() + attempt.durationSec * 1000);

  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      startedAt: now,
      expectedEndAt: expectedEnd,
      status: "ONGOING",
    },
    select: { id: true, startedAt: true, expectedEndAt: true, status: true },
  });

  return NextResponse.json({ ...updated, started: true });
}
