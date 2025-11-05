// src/app/api/attempts/[id]/time/route.ts
import { NextResponse } from "next/server";
import { getAttemptWithTime } from "@/lib/attempt-timer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertAttemptOwnershipOrThrow(params.id, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const state = await getAttemptWithTime(params.id);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // (Optionnel) vérifier que l'attempt appartient à l'utilisateur courant
  // ...

  const locked = state.isExpired || state.isSubmitted;

  return NextResponse.json({
    now: state.now.toISOString(),
    remainingMs: state.remainingMs,
    isExpired: state.isExpired,
    locked,
    status: state.attempt.status,
    expectedEndAt: state.attempt.expectedEndAt,
    startedAt: state.attempt.startedAt,
    submittedAt: state.attempt.submittedAt,
  });
}
