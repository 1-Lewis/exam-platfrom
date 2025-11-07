// src/app/admin/exams/[examId]/subject/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SubjectUploader from "./upload-client";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

type PageProps = { params: Promise<{ examId: string }> };

export default async function AdminExamSubjectPage({ params }: PageProps) {
  const session = await requireStaff(); // ADMIN ou TEACHER
  const { examId } = await params;

  // Si TEACHER, vérifie la propriété de l'examen (ADMIN passe toujours)
  try {
    await assertTeacherOwnsExamOrAdmin(session, examId);
  } catch {
    notFound();
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, subjectFilename: true, subjectMime: true },
  });
  if (!exam) notFound();

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-lg font-semibold">Sujet de l’examen</h1>
      <p className="text-sm text-gray-600">
        Formats acceptés : <strong>PDF</strong> (prévisualisation via iframe) ou <strong>DOCX</strong> (converti en HTML pour la sidebar).
      </p>
      <SubjectUploader examId={exam.id} current={exam.subjectFilename ?? null} />
    </div>
  );
}
