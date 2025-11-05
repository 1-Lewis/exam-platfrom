// src/app/api/attempts/[id]/submit/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";
import { getAttemptWithTime, submitAttemptServerSide } from "@/lib/attempt-timer";

/**
 * POST /api/attempts/[id]/submit
 * → Soumet la copie de manière idempotente.
 *   - Si déjà SUBMITTED : retourne ok + alreadySubmitted.
 *   - Sinon : passe en SUBMITTED et renvoie submittedAt.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérification d'appartenance
  try {
    await assertAttemptOwnershipOrThrow(params.id, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // État courant
  const state = await getAttemptWithTime(params.id);
  if (!state) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Déjà soumis → idempotent
  if (state.isSubmitted) {
    return NextResponse.json({
      ok: true,
      alreadySubmitted: true,
      submittedAt: state.attempt.submittedAt,
    });
  }

  // Soumission serveur
  const updated = await submitAttemptServerSide(params.id);

  // (Optionnel) ici : déclencher un post-traitement (snapshot/export)
  return NextResponse.json({
    ok: true,
    alreadySubmitted: false,
    submittedAt: updated.submittedAt,
  });
}
