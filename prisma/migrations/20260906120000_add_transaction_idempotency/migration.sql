-- AlterTable
ALTER TABLE "transaction" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "transaction"("idempotencyKey");