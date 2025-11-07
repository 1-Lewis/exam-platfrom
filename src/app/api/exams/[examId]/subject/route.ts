// src/app/api/exams/[id]/subject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedGetUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      subjectKey: true,
      subjectFilename: true,
      subjectMime: true,
      subjectSize: true,
      subjectHtml: true,
    },
  });

  if (!exam || !exam.subjectKey) {
    return NextResponse.json({ ok: true, hasSubject: false });
  }

  const url = await getSignedGetUrl(exam.subjectKey, 300); // URL temporaire (5 min)
  return NextResponse.json({
    ok: true,
    hasSubject: true,
    mime: exam.subjectMime,
    filename: exam.subjectFilename,
    size: exam.subjectSize,
    html: exam.subjectHtml, // présent si .docx
    url, // pour PDF ou fallback
  }, { headers: { "Cache-Control": "no-store" } });
}
