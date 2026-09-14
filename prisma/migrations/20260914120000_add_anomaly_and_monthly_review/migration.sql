-- AlterTable
ALTER TABLE "transaction" ADD COLUMN "isAnomaly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "transaction" ADD COLUMN "anomalyReason" TEXT;

-- CreateTable
CREATE TABLE "monthly_review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "statsJson" JSONB NOT NULL,
    "conditionLabel" TEXT,
    "summary" TEXT,
    "suggestions" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_review_userId_month_year_key" ON "monthly_review"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "monthly_review_userId_idx" ON "monthly_review"("userId");

-- AddForeignKey
ALTER TABLE "monthly_review" ADD CONSTRAINT "monthly_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;