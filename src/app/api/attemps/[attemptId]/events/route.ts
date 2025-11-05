// src/app/api/attempts/[id]/events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";
import { z } from "zod";

const BodySchema = z.object({
  kind: z.string().min(1),
  payload: z.unknown().optional(),
  at: z.number().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertAttemptOwnershipOrThrow(params.id, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  try {
    const body = BodySchema.parse(await req.json());
    // TODO: branchement DB ultérieur
    // console.log("[attempt-event]", params.id, body.kind, body.at ?? Date.now(), body.payload);
    return NextResponse.json({ ok: true }, { status: 202 }); // Accepted
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
