-- Overall and annual primary averages were historically stored on 20.
-- Keep subject averages unchanged; they remain normalized on 20.
UPDATE "ReportCard" AS r
SET
  "overallAverage" = r."overallAverage" / 2,
  "annualAverage" = r."annualAverage" / 2,
  "classHighest" = r."classHighest" / 2,
  "classLowest" = r."classLowest" / 2,
  "classAverage" = r."classAverage" / 2
FROM "Class" AS c
WHERE r."classId" = c."id"
  AND upper(regexp_replace(c."level", '\s', '', 'g')) IN ('CI', 'CP', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2');
