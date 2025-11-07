// src/app/admin/exams/[examId]/proctoring/page.tsx
import { notFound } from "next/navigation";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";
import Client from "./Client";

type PageProps = { params: Promise<{ examId: string }> };

export default async function ExamProctoringPage({ params }: PageProps) {
  const session = await requireStaff();
  const { examId } = await params;

  try {
    await assertTeacherOwnsExamOrAdmin(session, examId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Proctoring — Examen {examId}</h1>
        <a
          href={`/api/admin/exams/${examId}/proctoring/summary.csv`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Export CSV (overview)
        </a>
      </div>

      <Client examId={examId} />
    </div>
  );
}
