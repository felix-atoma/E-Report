-- National Exam Results
CREATE TYPE "NationalExamType" AS ENUM ('CEPD', 'BEPC', 'BAC', 'BTS', 'CAP', 'OTHER');
CREATE TYPE "NationalExamResultStatus" AS ENUM ('ADMIS', 'AJOURNE', 'ABSENT', 'ELIMINE');

CREATE TABLE "NationalExamResult" (
  "id"                 TEXT NOT NULL,
  "institutionId"      TEXT NOT NULL,
  "studentId"          TEXT NOT NULL,
  "examType"           "NationalExamType" NOT NULL,
  "session"            TEXT NOT NULL,
  "academicYear"       TEXT NOT NULL,
  "registrationNumber" TEXT,
  "center"             TEXT,
  "series"             TEXT,
  "result"             "NationalExamResultStatus" NOT NULL,
  "mention"            TEXT,
  "totalScore"         DOUBLE PRECISION,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NationalExamResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NationalExamResult_studentId_examType_session_key" ON "NationalExamResult"("studentId", "examType", "session");
ALTER TABLE "NationalExamResult" ADD CONSTRAINT "NationalExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NationalExamResult" ADD CONSTRAINT "NationalExamResult_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Library Loans
CREATE TABLE "LibraryLoan" (
  "id"            TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "itemId"        TEXT NOT NULL,
  "studentId"     TEXT,
  "borrowerName"  TEXT,
  "borrowerId"    TEXT,
  "loanDate"      DATE NOT NULL,
  "dueDate"       DATE NOT NULL,
  "returnDate"    DATE,
  "isReturned"    BOOLEAN NOT NULL DEFAULT false,
  "conditionOut"  TEXT,
  "conditionIn"   TEXT,
  "notes"         TEXT,
  "issuedByName"  TEXT,
  "issuedById"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Health Records
CREATE TYPE "HealthVisitType" AS ENUM ('CONSULTATION', 'ACCIDENT', 'VACCINATION', 'DRESSING', 'EVACUATION', 'OTHER');

CREATE TABLE "HealthRecord" (
  "id"                  TEXT NOT NULL,
  "institutionId"       TEXT NOT NULL,
  "studentId"           TEXT NOT NULL,
  "date"                DATE NOT NULL,
  "visitType"           "HealthVisitType" NOT NULL DEFAULT 'CONSULTATION',
  "complaint"           TEXT,
  "diagnosis"           TEXT,
  "treatment"           TEXT,
  "referredToHospital"  BOOLEAN NOT NULL DEFAULT false,
  "hospital"            TEXT,
  "attendedByName"      TEXT,
  "attendedById"        TEXT,
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
