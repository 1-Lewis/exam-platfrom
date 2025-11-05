/*
  Warnings:

  - You are about to drop the column `index` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `Question` table. All the data in the column will be lost.
  - Added the required column `order` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statement` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" DROP COLUMN "index",
DROP COLUMN "prompt",
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "statement" TEXT NOT NULL;
