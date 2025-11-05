/*
  Warnings:

  - You are about to drop the column `studentId` on the `Attempt` table. All the data in the column will be lost.
  - Added the required column `durationSec` to the `Attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Attempt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PENDING', 'ONGOING', 'SUBMITTED');

-- DropForeignKey
ALTER TABLE "public"."Attempt" DROP CONSTRAINT "Attempt_studentId_fkey";

-- AlterTable
ALTER TABLE "Attempt" DROP COLUMN "studentId",
ADD COLUMN     "durationSec" INTEGER NOT NULL,
ADD COLUMN     "expectedEndAt" TIMESTAMP(3),
ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Attempt_expectedEndAt_idx" ON "Attempt"("expectedEndAt");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
