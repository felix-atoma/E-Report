-- Décision du conseil saisie à la main (sinon proposée selon le seuil de passage de l'école)
ALTER TABLE "ReportCard" ADD COLUMN IF NOT EXISTS "councilDecisionManual" BOOLEAN NOT NULL DEFAULT false;
