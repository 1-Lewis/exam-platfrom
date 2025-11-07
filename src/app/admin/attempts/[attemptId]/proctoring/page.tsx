// src/app/admin/attempts/[attemptId]/proctoring/page.tsx
import { notFound } from "next/navigation";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";
import Client from "./Client";

type PageProps = { params: Promise<{ attemptId: string }> };

export default async function ProctoringAttemptPage({ params }: PageProps) {
  const session = await requireStaff();
  const { attemptId } = await params;

  try {
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Proctoring — Copie {attemptId}</h1>
        <a
          href={`/api/admin/attempts/${attemptId}/events.csv`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Export CSV
        </a>
      </div>

      <Client attemptId={attemptId} />
    </div>
  );
}
