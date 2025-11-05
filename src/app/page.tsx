import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const exams = await prisma.exam.findMany({
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true, endsAt: true, durationMin: true },
  });

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Examens disponibles</h1>

      {exams.length === 0 ? (
        <p>Aucun examen.</p>
      ) : (
        <ul className="space-y-3">
          {exams.map((e) => (
            <li key={e.id} className="border rounded-2xl p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleTimeString()} • {e.durationMin} min
                  </div>
                </div>
                <Link
                  href={`/exams/${e.id}`}
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                >
                  Ouvrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
