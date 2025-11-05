import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // --- Admin existant ---
  const admin = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });

  // --- Étudiant de test ---
  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      name: "Student",
      role: "STUDENT",
    },
  });

  // --- Examen de démonstration ---
  const examId = "demo-maths-1"; // id lisible (ton modèle Exam.id est un String)
  const now = new Date();
  const ends = new Date(now.getTime() + 60 * 60 * 1000); // +60min

  const exam = await prisma.exam.upsert({
    where: { id: examId },
    update: {
      title: "Démonstration — Maths 1",
      description: "Examen de test pour l’interface",
      startsAt: now,
      endsAt: ends,
      durationMin: 60,
      useSEB: false,
      createdById: admin?.id ?? student.id,
    },
    create: {
      id: examId,
      title: "Démonstration — Maths 1",
      description: "Examen de test pour l’interface",
      startsAt: now,
      endsAt: ends,
      durationMin: 60,
      useSEB: false,
      createdById: admin?.id ?? student.id,
    },
  });

  // --- Questions de test ---
  await prisma.question.deleteMany({ where: { examId: exam.id } });
  await prisma.question.createMany({
    data: [
      {
        examId: exam.id,
        order: 1,
        type: "RICH_TEXT",
        statement:
          "1) Dériver $f(x) = x^3 - 3x^2 + 2x$. Utilise le champ formule si besoin.",
        points: 4,
      },
      {
        examId: exam.id,
        order: 2,
        type: "RICH_TEXT",
        statement:
          "2) Résoudre l’équation $x^2 - 5x + 6 = 0$. Donne les racines en LaTeX.",
        points: 3,
      },
      {
        examId: exam.id,
        order: 3,
        type: "RICH_TEXT",
        statement:
          "3) Intégrer $\\int_0^1 (1 - x^2)\\,dx$ et simplifier le résultat.",
        points: 3,
      },
    ],
  });

  console.log(
    `✅ Seed OK — Exam "${exam.title}" créé, étudiant: student@example.com`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
