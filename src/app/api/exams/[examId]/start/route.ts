// src/app/api/exams/[id]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examId = params.id;

  const existing = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
  });

  // Vérifie explicitement
  if (!existing) {
    return NextResponse.json(
      { error: "Attempt not found" },
      { status: 404 }
    );
  }

  // À partir d’ici, TypeScript sait que existing n’est pas nul
  const now = new Date();

  // Si déjà démarré, retour idempotent
  if (existing.startedAt && existing.expectedEndAt) {
    return NextResponse.json({
      id: existing.id,
      started: true,
      startedAt: existing.startedAt,
      expectedEndAt: existing.expectedEndAt,
    });
  }

  // Calcule l’heure de fin
  const expectedEnd = new Date(now.getTime() + existing.durationSec * 1000);

  const updated = await prisma.attempt.update({
    where: { id: existing.id },
    data: {
      startedAt: now,
      expectedEndAt: expectedEnd,
      status: "ONGOING",
    },
    select: { id: true, startedAt: true, expectedEndAt: true, status: true },
  });

  return NextResponse.json({ ...updated, started: true });
}
