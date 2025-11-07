// src/app/api/attempts/[id]/time/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";
import { getAttemptWithTime } from "@/lib/attempt-timer";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await assertAttemptOwnershipOrThrow(id, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
    }
    throw e;
  }

  const state = await getAttemptWithTime(id);
  if (!state) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const locked = state.isExpired || state.isSubmitted;
  const remainingMs = locked ? 0 : Math.max(0, Math.floor(state.remainingMs));

  return NextResponse.json(
    {
      attemptId: state.attempt.id,
      status: state.attempt.status,
      startedAt: state.attempt.startedAt ? state.attempt.startedAt.toISOString() : null,
      expectedEndAt: state.attempt.expectedEndAt ? state.attempt.expectedEndAt.toISOString() : null,
      submittedAt: state.attempt.submittedAt ? state.attempt.submittedAt.toISOString() : null,
      now: state.now.toISOString(),
      remainingMs,
      isExpired: state.isExpired,
      locked,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
