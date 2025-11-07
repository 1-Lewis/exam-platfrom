// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }
  const userId = session.user.id;
  const now = new Date();

  // Récupère tous les exams + la dernière tentative de cet utilisateur
  const exams = await prisma.exam.findMany({
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      durationMin: true,
      attempts: {
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          startedAt: true,
          expectedEndAt: true,
          submittedAt: true,
        },
      },
    },
  });

  type ExamRow = (typeof exams)[number] & {
    state: "UPCOMING" | "ONGOING" | "ENDED";
  };

  const rows: ExamRow[] = exams.map((e) => {
    const state =
      now >= e.startsAt && now <= e.endsAt
        ? "ONGOING"
        : now < e.startsAt
        ? "UPCOMING"
        : "ENDED";
    return { ...e, state };
  });

  const ongoing = rows.filter((r) => r.state === "ONGOING");
  const upcoming = rows.filter((r) => r.state === "UPCOMING");
  const ended = rows.filter((r) => r.state === "ENDED");

  function StatusBadge({ label }: { label: string }) {
    const cls =
      label === "En cours"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : label === "Soumis"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-gray-50 text-gray-600 border-gray-200";
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}>
        {label}
      </span>
    );
  }

  function Card({ r }: { r: ExamRow }) {
    const attempt = r.attempts[0] ?? null;

    const statusLabel = attempt
      ? attempt.submittedAt
        ? "Soumis"
        : "En cours"
      : r.state === "UPCOMING"
      ? "Non commencé"
      : "—";

    const action =
      r.state === "ONGOING"
        ? { href: `/exams/${r.id}`, label: attempt ? "Continuer" : "Commencer" }
        : r.state === "UPCOMING"
        ? null
        : attempt?.submittedAt
        ? { href: `/exams/${r.id}`, label: "Voir la copie" }
        : null;

    const title = r.title || `Examen ${r.id.slice(0, 6)}`;

    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold">{title}</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  r.state === "ONGOING"
                    ? "bg-green-100 text-green-800"
                    : r.state === "UPCOMING"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {r.state}
              </span>
            </div>
            {r.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {r.description}
              </p>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Fenêtre : {r.startsAt.toLocaleString()} → {r.endsAt.toLocaleString()} • Durée :{" "}
              {r.durationMin} min
            </div>
            <div className="mt-1 text-xs">
              Statut de votre copie : <span className="font-mono">{statusLabel}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge label={statusLabel} />
            {action ? (
              <Link
                href={action.href}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                {action.label}
              </Link>
            ) : r.state === "UPCOMING" ? (
              <span className="text-sm text-muted-foreground">
                Débute le {r.startsAt.toLocaleString()}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Terminé</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Une tentative "en cours" globale (utile pour le bloc rapide)
  const inProgress = rows.find((r) => r.attempts[0] && !r.attempts[0].submittedAt);

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
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                Vous avez une tentative en cours
              </div>
              <div className="text-sm text-gray-500">
                Reprenez là où vous vous êtes arrêté.
              </div>
            </div>
            <Link
              href={`/exams/${inProgress.id}`}
              className="rounded-lg border bg-gray-900 px-4 py-2 text-white hover:opacity-90"
            >
              Continuer
            </Link>
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500">Aucune tentative en cours.</div>
        )}
      </section>

      {/* En cours */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground/80">En cours</h2>
        {ongoing.length ? (
          <div className="space-y-3">
            {ongoing.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            Aucun examen en cours.
          </div>
        )}
      </section>

      {/* À venir */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground/80">À venir</h2>
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            Aucun examen à venir.
          </div>
        )}
      </section>

      {/* Terminés */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground/80">Terminés</h2>
        {ended.length ? (
          <div className="space-y-3">
            {ended.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            Aucun examen terminé.
          </div>
        )}
      </section>

      {/* Accès rapides (facultatifs) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/ztest"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-gray-50"
        >
          <div className="text-sm font-medium text-gray-700">Zone de test</div>
          <div className="mt-1 text-xs text-gray-500">
            Vérifier l’éditeur et le rendu LaTeX.
          </div>
        </Link>
        <Link
          href="/debug"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-gray-50"
        >
          <div className="text-sm font-medium text-gray-700">Debug</div>
          <div className="mt-1 text-xs text-gray-500">Infos techniques utiles pendant le dev.</div>
        </Link>
      </section>
    </main>
  );
}
