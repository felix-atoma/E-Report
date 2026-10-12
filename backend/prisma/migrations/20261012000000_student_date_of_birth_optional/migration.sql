-- Date de naissance facultative : absente du bulletin quand l'école ne la fournit pas
ALTER TABLE "Student" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
