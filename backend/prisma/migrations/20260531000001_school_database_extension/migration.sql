-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'SPORT', 'CULTURAL', 'DEADLINE', 'PARENT_MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "DisciplinaryType" AS ENUM ('WARNING', 'SUSPENSION', 'EXCLUSION', 'NOTE', 'COMMENDATION', 'OTHER');

-- AlterTable: extend Student with new fields
ALTER TABLE "Student"
  ADD COLUMN "address"                  TEXT,
  ADD COLUMN "city"                     TEXT,
  ADD COLUMN "region"                   TEXT,
  ADD COLUMN "nationality"              TEXT,
  ADD COLUMN "religion"                 TEXT,
  ADD COLUMN "bloodType"                TEXT,
  ADD COLUMN "medicalConditions"        TEXT,
  ADD COLUMN "allergies"                TEXT,
  ADD COLUMN "emergencyContactName"     TEXT,
  ADD COLUMN "emergencyContactPhone"    TEXT,
  ADD COLUMN "emergencyContactRelation" TEXT,
  ADD COLUMN "fatherName"               TEXT,
  ADD COLUMN "fatherPhone"              TEXT,
  ADD COLUMN "fatherOccupation"         TEXT,
  ADD COLUMN "motherName"               TEXT,
  ADD COLUMN "motherPhone"              TEXT,
  ADD COLUMN "motherOccupation"         TEXT,
  ADD COLUMN "previousSchool"           TEXT,
  ADD COLUMN "birthPlace"               TEXT,
  ADD COLUMN "birthCertificateNumber"   TEXT,
  ADD COLUMN "photo"                    TEXT,
  ADD COLUMN "studentStatus"            "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable: StaffProfile
CREATE TABLE "StaffProfile" (
  "id"                    TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "institutionId"         TEXT NOT NULL,
  "staffNumber"           TEXT,
  "employmentDate"        TIMESTAMP(3),
  "contractType"          TEXT,
  "qualification"         TEXT,
  "specialization"        TEXT,
  "experienceYears"       INTEGER,
  "address"               TEXT,
  "city"                  TEXT,
  "nationality"           TEXT,
  "nationalId"            TEXT,
  "emergencyContactName"  TEXT,
  "emergencyContactPhone" TEXT,
  "notes"                 TEXT,
  "isActive"              BOOLEAN NOT NULL DEFAULT true,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CalendarEvent
CREATE TABLE "CalendarEvent" (
  "id"            TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "startDate"     TIMESTAMP(3) NOT NULL,
  "endDate"       TIMESTAMP(3),
  "allDay"        BOOLEAN NOT NULL DEFAULT true,
  "type"          "CalendarEventType" NOT NULL DEFAULT 'EVENT',
  "classId"       TEXT,
  "color"         TEXT,
  "isPublic"      BOOLEAN NOT NULL DEFAULT true,
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DisciplinaryRecord
CREATE TABLE "DisciplinaryRecord" (
  "id"             TEXT NOT NULL,
  "studentId"      TEXT NOT NULL,
  "institutionId"  TEXT NOT NULL,
  "date"           TIMESTAMP(3) NOT NULL,
  "type"           "DisciplinaryType" NOT NULL,
  "description"    TEXT NOT NULL,
  "sanction"       TEXT,
  "sanctionStart"  TIMESTAMP(3),
  "sanctionEnd"    TIMESTAMP(3),
  "recordedByName" TEXT,
  "recordedById"   TEXT,
  "resolved"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DisciplinaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique userId on StaffProfile
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- AddForeignKey: StaffProfile -> User
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: StaffProfile -> Institution
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CalendarEvent -> Institution
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: DisciplinaryRecord -> Student
ALTER TABLE "DisciplinaryRecord" ADD CONSTRAINT "DisciplinaryRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
