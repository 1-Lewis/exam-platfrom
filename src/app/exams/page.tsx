// src/app/exams/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ExamsListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const exams = await prisma.exam.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Exams</h1>
      <ul className="list-disc pl-6 space-y-2">
        {exams.map((e) => (
          <li key={e.id}>
            <Link className="underline" href={`/exams/${e.id}`}>
              Exam {e.id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
