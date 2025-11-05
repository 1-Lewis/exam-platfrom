// src/app/api/exams/[examId]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    select: { id: true },
  });
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const existing = await prisma.attempt.findFirst({
    where: { examId: exam.id, studentId: session.user.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ attemptId: existing.id }, { status: 200 });
  }

  const attempt = await prisma.attempt.create({
    data: {
      examId: exam.id,
      studentId: session.user.id,
      startedAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
