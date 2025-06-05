/*
  Warnings:

  - Added the required column `maxDeadWg` to the `vessels` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vessels" ADD COLUMN "maxDeadWg" INTEGER;

-- Update existing records with default value
UPDATE "vessels" SET "maxDeadWg" = 80000;

-- Make the column required
ALTER TABLE "vessels" ALTER COLUMN "maxDeadWg" SET NOT NULL;
