// src/app/exams/[examId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ExamClient from "./ExamClient";
import StartButton from "./StartButton";

type PageProps = { params: { examId: string } };

export default async function ExamPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const examId = params.examId;

  // Vérifier que l'examen existe (on ne sélectionne que l'id)
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true },
  });
  if (!exam) notFound();

  // Récupérer une tentative existante pour cet exam et cet utilisateur
  const attempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
    select: { id: true },
  });

  return (
    <div className="space-y-6">
      {!attempt ? (
        // Aucune tentative encore : on affiche le bouton de démarrage
        <StartButton examId={examId} />
      ) : (
        // Tentative existante : on affiche le client avec le timer/éditeur
        <ExamClient attemptId={attempt.id} />
      )}
    </div>
  );
}
