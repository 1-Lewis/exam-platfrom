// src/app/admin/attempts/[attemptId]/print/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { tiptapJsonToHtml } from "@/lib/serialize/tiptapJsonToHtml";
import type { JSONContent } from "@tiptap/react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ attemptId: string }> };

export default async function AttemptPrintPage({ params }: PageProps) {
  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      exam: { select: { title: true } },
      student: { select: { name: true, email: true } },
    },
  });

  const answer = await prisma.answer.findFirst({
    where: { attemptId },
    orderBy: { updatedAt: "desc" },
    select: { content: true, updatedAt: true },
  });

  const html = tiptapJsonToHtml(answer?.content as JSONContent | null);

  return (
    <html lang="fr">
      <body className="p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">
            {attempt?.exam?.title ?? "Examen"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Copie #{attempt?.id} — {attempt?.student?.name ?? "Étudiant"}
            {attempt?.student?.email ? ` <${attempt.student.email}>` : ""}
          </p>
          {answer?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Dernière mise à jour : {answer.updatedAt.toISOString()}
            </p>
          )}
        </header>

        <main className="rounded-xl border p-4">
          {/* SSR pur : HTML déjà rendu avec KaTeX (katex.min.css est dans globals.css) */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </main>
      </body>
    </html>
  );
}
