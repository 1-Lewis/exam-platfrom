// src/app/admin/attempts/[attemptId]/page.tsx
import { notFound } from "next/navigation";
import AttemptViewer from "./viewer-client";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";

type PageProps = { params: Promise<{ attemptId: string }> };

export default async function AttemptDetailPage({ params }: PageProps) {
  const session = await requireStaff(); // ADMIN ou TEACHER
  const { attemptId } = await params;

  // Vérifie que le TEACHER est bien propriétaire de la copie (via l’examen associé)
  try {
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-lg font-semibold">Copie</h1>
      <AttemptViewer attemptId={attemptId} />
    </div>
  );
}
