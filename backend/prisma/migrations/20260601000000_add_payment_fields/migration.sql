-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "notchpayPublicKey" TEXT,
ADD COLUMN     "notchpayHashKeyEnc" TEXT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "cinetpayTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_cinetpayTransactionId_key" ON "PaymentIntent"("cinetpayTransactionId");
