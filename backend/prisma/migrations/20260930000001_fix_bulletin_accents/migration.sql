-- Repair accents saved garbled ("TrÃ¨s Bien") by an earlier mis-encoded reports.service.ts
UPDATE "ReportCard" SET "mention" = 'Très Bien' WHERE "mention" = 'TrÃ¨s Bien';
UPDATE "ReportCard" SET "councilDecision" = 'Admis(e) en classe supérieure'
  WHERE "councilDecision" = 'Admis(e) en classe supÃ©rieure';
