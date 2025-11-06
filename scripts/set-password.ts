// scripts/set-password.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const plain = process.argv[3];

  if (!email || !plain) {
    console.error("Usage: pnpm tsx scripts/set-password.ts <email> <password>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(plain, 12);

  const updated = await prisma.user.update({
    where: { email },
    data: { passwordHash }, // ⚠️ adapte le nom du champ si dans ton schéma c'est "hashedPassword"
    select: { id: true, email: true },
  });

  console.log(`✅ Password set for ${updated.email} (id=${updated.id})`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  