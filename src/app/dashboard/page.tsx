// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }
  const userId = session.user.id;

  // ⚠️ On n'utilise pas createdAt (absent sur Exam chez toi).
  // Tri simple par id desc comme fallback stable.
  const exams = await prisma.exam.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      // si tu ajoutes plus tard un champ (title/name), on pourra l'afficher ici
    },
  });

  // On prend les tentatives de l'utilisateur, triées par id desc (fallback sans createdAt)
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      examId: true,
      submittedAt: true, // on déduit le statut à partir de ça
    },
  });

  // Types stricts
  type AttemptLite = (typeof attempts)[number];
  type ExamLite = (typeof exams)[number];

  // Dernière tentative par examen
  const latestAttemptByExam = new Map<string, AttemptLite>();
  for (const a of attempts) {
    if (!latestAttemptByExam.has(a.examId)) {
      latestAttemptByExam.set(a.examId, a);
    }
  }

  // Une tentative "en cours" = submittedAt null
  const inProgress = attempts.find((a) => a.submittedAt === null);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      {/* En-tête */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mon espace</h1>
          <p className="text-sm text-gray-500">
            Bienvenue{session.user.name ? `, ${session.user.name}` : ""}.
          </p>
        </div>
      </header>

      {/* Bloc "Examen en cours" */}
      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-medium text-gray-700">Examen en cours</h2>
        </div>
        {inProgress ? (
          <div className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                Vous avez une tentative en cours
              </div>
              <div className="text-sm text-gray-500">
                Reprenez là où vous vous êtes arrêté.
              </div>
            </div>
            <Link
              href={`/exams/${inProgress.examId}`}
              className="rounded-lg border px-4 py-2 bg-gray-900 text-white hover:opacity-90"
            >
              Continuer
            </Link>
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500">
            Aucune tentative en cours.
          </div>
        )}
      </section>

      {/* Liste des examens */}
      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-medium text-gray-700">Mes examens</h2>
        </div>

        {exams.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">
            Aucun examen disponible pour le moment.
          </div>
        ) : (
          <ul className="divide-y">
            {exams.map((exam: ExamLite) => {
              const att = latestAttemptByExam.get(exam.id);
              const statusLabel = att
                ? att.submittedAt
                  ? "Soumis"
                  : "En cours"
                : "Non commencé";

              const action = !att
                ? { href: `/exams/${exam.id}`, label: "Commencer" }
                : att.submittedAt
                ? { href: `/exams/${exam.id}`, label: "Voir la copie" }
                : { href: `/exams/${exam.id}`, label: "Continuer" };

              return (
                <li
                  key={exam.id}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      Examen {exam.id.slice(0, 6)}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Statut : {statusLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${
                        statusLabel === "En cours"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : statusLabel === "Soumis"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <Link
                      href={action.href}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                    >
                      {action.label}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Accès rapides (facultatifs) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/ztest"
          className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition"
        >
          <div className="text-sm font-medium text-gray-700">Zone de test</div>
          <div className="mt-1 text-xs text-gray-500">
            Vérifier l’éditeur et le rendu LaTeX.
          </div>
        </Link>
        <Link
          href="/debug"
          className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition"
        >
          <div className="text-sm font-medium text-gray-700">Debug</div>
          <div className="mt-1 text-xs text-gray-500">
            Infos techniques utiles pendant le dev.
          </div>
        </Link>
      </section>
    </main>
  );
}
