-- Attendance: per-session recording (several teachers per day) + lateness duration
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "sessionKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "minutesLate" INTEGER;

DROP INDEX IF EXISTS "Attendance_studentId_classId_date_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_studentId_classId_date_sessionKey_key"
  ON "Attendance"("studentId", "classId", "date", "sessionKey");
CREATE INDEX IF NOT EXISTS "Attendance_classId_date_idx" ON "Attendance"("classId", "date");

-- ReportCard: computed attendance shown on the bulletin
ALTER TABLE "ReportCard" ADD COLUMN IF NOT EXISTS "attendanceLateMinutes" INTEGER;
ALTER TABLE "ReportCard" ADD COLUMN IF NOT EXISTS "attendanceExcused" INTEGER;
