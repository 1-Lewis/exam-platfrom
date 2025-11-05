import Link from "next/link";

export default async function ExamsPage() {
  // aucune DB ici, juste un lien de test
  const id = "demo-maths-1";
  return (
    <main className="p-6 space-y-4">
      <h1>Liste (test)</h1>
      <p>
        <Link prefetch={false} className="underline" href={`/exams/${id}`}>
          Ouvrir /exams/{id}
        </Link>
      </p>
    </main>
  );
}
