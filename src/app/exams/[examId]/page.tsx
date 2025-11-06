// src/app/exams/[examId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ExamClient from "./ExamClient";
import StartButton from "./StartButton";
import { AttemptClientProctoring } from "./AttemptClientProctoring";

// ✅ Correction : params est un Promise sous Turbopack
type PageProps = { params: Promise<Record<string, string | string[] | undefined>> };

export default async function ExamPage({ params }: PageProps) {
  const resolvedParams = await params; // ← on attend avant d'y accéder
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const raw = resolvedParams.examId;
  const examId = Array.isArray(raw) ? raw[0] : raw;
  if (!examId) notFound();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true },
  });
  if (!exam) notFound();

  const attempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
    select: { id: true },
  });

  return (
    <div className="space-y-6">
      {!attempt ? (
        <StartButton examId={examId} />
      ) : (
        <>
          <AttemptClientProctoring attemptId={attempt.id} />
          <ExamClient attemptId={attempt.id} />
        </>
      )}
    </div>
  );
}
