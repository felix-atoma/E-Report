-- CreateEnum
CREATE TYPE "InstitutionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- AlterTable: make institutionId optional on User
ALTER TABLE "User" ALTER COLUMN "institutionId" DROP NOT NULL;

-- AlterTable: add new columns to Institution
ALTER TABLE "Institution" ADD COLUMN "status" "InstitutionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Institution" ADD COLUMN "declaredStudentCount" INTEGER;
ALTER TABLE "Institution" ADD COLUMN "subscriptionPlan" TEXT;
ALTER TABLE "Institution" ADD COLUMN "ownerNotes" TEXT;

-- Set existing active institutions to ACTIVE status (they were already running)
UPDATE "Institution" SET "status" = 'ACTIVE' WHERE "isActive" = true;
