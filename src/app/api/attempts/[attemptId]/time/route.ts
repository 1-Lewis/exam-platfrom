// src/app/api/attempts/[id]/time/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";
import { getAttemptWithTime } from "@/lib/attempt-timer";

/**
 * GET /api/attempts/[id]/time
 * → Renvoie le temps restant côté serveur pour une tentative donnée.
 * → Verrouille côté serveur si expirée.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifie que l'étudiant est bien propriétaire de la tentative
  try {
    await assertAttemptOwnershipOrThrow(params.id, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // Récupère état temporel côté serveur
  const state = await getAttemptWithTime(params.id);
  if (!state) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Calcul du statut verrouillé / restant
  const locked = state.isExpired || state.isSubmitted;
  const remainingMs = locked ? 0 : Math.max(0, state.remainingMs);

  return NextResponse.json({
    attemptId: state.attempt.id,
    status: state.attempt.status,
    startedAt: state.attempt.startedAt,
    expectedEndAt: state.attempt.expectedEndAt,
    submittedAt: state.attempt.submittedAt,
    now: state.now.toISOString(),
    remainingMs,
    isExpired: state.isExpired,
    locked,
  });
}
