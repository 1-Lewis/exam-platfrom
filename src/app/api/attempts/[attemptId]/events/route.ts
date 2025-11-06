// src/app/api/attempts/[id]/events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const EventSchema = z.object({
  kind: z.string().min(1).max(64),   // ex: "focus-lost", "paste"
  payload: z.unknown().optional(),   // ex: { clipboardTypes: [...] }
  at: z.number().int().optional(),   // epoch ms côté client
});

// Accepte soit un seul event, soit un batch
const BodySchema = z.union([
  EventSchema,
  z.object({
    events: z.array(EventSchema).min(1).max(50),
  }),
]);

interface RouteCtx {
  // ⚠️ Next 16/Turbopack: params est un Promise
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: RouteCtx) {
  // Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Unwrap params
  const { id: attemptId } = await ctx.params;
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  // Ownership
  try {
    await assertAttemptOwnershipOrThrow(attemptId, session.user.id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // Anti-abus: borne la taille brute d’un batch (~32KB)
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 32 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Parse + normalisation
  type SingleEvent = z.infer<typeof EventSchema>;
  let parsed: SingleEvent | { events: SingleEvent[] };

  try {
    parsed = BodySchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid body", issues: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const now = Date.now();
  const toRow = (e: SingleEvent) => ({
    attemptId,
    // ⬇️ Adapte ces noms aux colonnes de ton modèle Prisma `ProctorEvent`
    type: e.kind,                       // colonne string
    meta: e.payload ?? {},              // colonne Json
    createdAt: new Date(e.at ?? now),   // colonne DateTime
  });

  const rows = "events" in parsed ? parsed.events.map(toRow) : [toRow(parsed)];

  // Persistance
  try {
    if (rows.length > 0) {
      await prisma.proctorEvent.createMany({ data: rows });
    }
    return NextResponse.json({ ok: true, stored: rows.length }, { status: 202 });
  } catch (e) {
    console.error("[attempt-events] createMany error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
