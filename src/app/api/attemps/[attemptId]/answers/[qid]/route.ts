// src/app/api/attempts/[attemptId]/answers/[qid]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const JsonValueNoNull: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(JsonValueNoNull),
    z.record(z.string(), JsonValueNoNull),
  ])
)

const BodySchema = z.object({
  content: z.union([JsonValueNoNull, z.null()]).transform(v => (v === null ? Prisma.JsonNull : v)),
})

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string; qid: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { content } = BodySchema.parse(await req.json())

  const answer = await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId: params.attemptId, questionId: params.qid } },
    update: { content },
    create: { attemptId: params.attemptId, questionId: params.qid, content },
  })

  return NextResponse.json({ ok: true, answerId: answer.id })
}
