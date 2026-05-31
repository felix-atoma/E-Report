-- Alumni, Student Transfers, School Inventory

-- Enums
CREATE TYPE "TransferDirection" AS ENUM ('IN', 'OUT');
CREATE TYPE "InventoryCategory" AS ENUM ('FURNITURE', 'EQUIPMENT', 'BOOK', 'SPORT', 'LAB', 'IT', 'OTHER');
CREATE TYPE "InventoryCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- AlumniRecord
CREATE TABLE "AlumniRecord" (
  "id"                 TEXT NOT NULL,
  "studentId"          TEXT NOT NULL,
  "institutionId"      TEXT NOT NULL,
  "graduationYear"     INTEGER NOT NULL,
  "lastClass"          TEXT,
  "diplomaNumber"      TEXT,
  "examType"           TEXT,
  "examSession"        TEXT,
  "examResult"         TEXT,
  "nationalExamCenter" TEXT,
  "furtherEducation"   TEXT,
  "currentEmployer"    TEXT,
  "contactEmail"       TEXT,
  "contactPhone"       TEXT,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlumniRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlumniRecord_studentId_key" ON "AlumniRecord"("studentId");
ALTER TABLE "AlumniRecord" ADD CONSTRAINT "AlumniRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlumniRecord" ADD CONSTRAINT "AlumniRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StudentTransfer
CREATE TABLE "StudentTransfer" (
  "id"              TEXT NOT NULL,
  "studentId"       TEXT NOT NULL,
  "institutionId"   TEXT NOT NULL,
  "direction"       "TransferDirection" NOT NULL,
  "otherSchool"     TEXT NOT NULL,
  "transferDate"    DATE NOT NULL,
  "academicYear"    TEXT,
  "reason"          TEXT,
  "documentUrl"     TEXT,
  "notes"           TEXT,
  "processedById"   TEXT,
  "processedByName" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentTransfer_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- InventoryItem
CREATE TABLE "InventoryItem" (
  "id"            TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "category"      "InventoryCategory" NOT NULL DEFAULT 'OTHER',
  "quantity"      INTEGER NOT NULL DEFAULT 1,
  "condition"     "InventoryCondition" NOT NULL DEFAULT 'GOOD',
  "location"      TEXT,
  "serialNumber"  TEXT,
  "purchaseDate"  DATE,
  "purchaseValue" DOUBLE PRECISION,
  "supplier"      TEXT,
  "notes"         TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
