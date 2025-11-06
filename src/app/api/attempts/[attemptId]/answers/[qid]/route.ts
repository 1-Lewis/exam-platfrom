// src/app/api/attempts/[attemptId]/answers/[qid]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import {
  ensureAttemptIsWritableOrAutoSubmit,
  AttemptLockedError,
} from "@/lib/attempt-timer"
import { assertAttemptOwnershipOrThrow, ForbiddenError } from "@/lib/ownership";


// --- Typage JSON Prisma (incluant le sentinelle JsonNull) ---
type JsonInput = Prisma.InputJsonValue | Prisma.NullTypes.JsonNull

// Validateur récursif pour JSON SANS null (on gère null via JsonNull)
const JsonValueNoNull: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(JsonValueNoNull),
    z.record(z.string(), JsonValueNoNull),
  ])
)

// Schéma du body : content peut être un JSON valide OU null (mappé vers Prisma.JsonNull)
const BodySchema = z.object({
  content: z
    .union([JsonValueNoNull, z.null()])
    .transform((v): JsonInput => (v === null ? Prisma.JsonNull : v)),
})

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string; qid: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse & validate le body
  let content: JsonInput
  try {
    await assertAttemptOwnershipOrThrow(params.attemptId, session.user.id);({ content } = BodySchema.parse(await req.json()))
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", issues: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Verrou serveur : auto-submit si expiré, sinon OK pour écrire
  try {
    await ensureAttemptIsWritableOrAutoSubmit(params.attemptId)
  } catch (e) {
    if (e instanceof AttemptLockedError) {
      return NextResponse.json({ error: e.message, locked: true }, { status: e.status })
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // Attempt introuvable ou autre
    return NextResponse.json({ error: "Attempt not found or not writable" }, { status: 404 })
  }

  // Upsert de la réponse
  const answer = await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId: params.attemptId, questionId: params.qid } },
    update: { content },
    create: { attemptId: params.attemptId, questionId: params.qid, content },
    select: { id: true, updatedAt: true },
  })

  return NextResponse.json({ ok: true, answerId: answer.id, updatedAt: answer.updatedAt })
}
