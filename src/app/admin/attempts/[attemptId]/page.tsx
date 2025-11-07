// src/app/admin/attempts/[attemptId]/page.tsx
import { notFound } from "next/navigation";
import AttemptViewer from "./viewer-client";
import Link from "next/link";
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Copie</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/attempts/${attemptId}/print`}
            target="_blank"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Prévisualiser
          </Link>
          <Link
            href={`/api/admin/attempts/${attemptId}/export/pdf`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Exporter en PDF
          </Link>
        </div>
      </div>

      <AttemptViewer attemptId={attemptId} />
    </div>
  );
}
