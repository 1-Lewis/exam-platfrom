// src/app/api/attempts/[id]/submit/route.ts
import { NextResponse } from "next/server";
import { submitAttemptServerSide, getAttemptWithTime } from "@/lib/attempt-timer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";

export async function POST(
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

  // (Optionnel) vérifier ownership attempt

  const state = await getAttemptWithTime(params.id);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (state.attempt.status === "SUBMITTED") {
    return NextResponse.json({ ok: true, alreadySubmitted: true, submittedAt: state.attempt.submittedAt });
  }

  const updated = await submitAttemptServerSide(params.id);

  // Ici tu peux déclencher un post-traitement (snapshot réponses, export, etc.)
  return NextResponse.json({ ok: true, submittedAt: updated.submittedAt });
}
