-- Épreuves importées par les professeurs, transcrites par l'IA et soumises à l'administration
CREATE TYPE "ExamPaperKind" AS ENUM ('DEVOIR_SURVEILLE', 'COMPOSITION_MENSUELLE', 'COMPOSITION_TRIMESTRIELLE', 'EXAMEN_BLANC');
CREATE TYPE "ExamPaperStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'PRINTED');

CREATE TABLE "ExamPaper" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "ExamPaperKind" NOT NULL,
    "status" "ExamPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "classId" TEXT,
    "className" TEXT,
    "subjectId" TEXT,
    "subjectName" TEXT,
    "academicYear" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "coefficient" TEXT,
    "content" TEXT NOT NULL,
    "sourceFiles" JSONB,
    "adminComment" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExamPaper_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExamPaper_institutionId_status_idx" ON "ExamPaper"("institutionId", "status");
CREATE INDEX "ExamPaper_authorId_idx" ON "ExamPaper"("authorId");

ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
