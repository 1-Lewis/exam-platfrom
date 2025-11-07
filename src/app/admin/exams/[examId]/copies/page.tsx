// src/app/admin/exams/[examId]/copies/page.tsx
import { notFound } from "next/navigation";
import ClientInner from "./ClientInner";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

type PageProps = { params: Promise<{ examId: string }> };

export default async function AdminCopiesPage({ params }: PageProps) {
  const session = await requireStaff(); // ADMIN ou TEACHER
  const { examId } = await params;

  // Vérifie que le TEACHER est bien le créateur de cet examen (ADMIN passe toujours)
  try {
    await assertTeacherOwnsExamOrAdmin(session, examId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-lg font-semibold">Copies rendues</h1>
      <ClientInner examId={examId} />
    </div>
  );
}
