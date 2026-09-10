-- CreateTable
CREATE TABLE "api_log" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gemini_call_log" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gemini_call_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_log_route_createdAt_idx" ON "api_log"("route", "createdAt");

-- CreateIndex
CREATE INDEX "api_log_status_createdAt_idx" ON "api_log"("status", "createdAt");

-- CreateIndex
CREATE INDEX "api_log_createdAt_idx" ON "api_log"("createdAt");

-- CreateIndex
CREATE INDEX "gemini_call_log_createdAt_idx" ON "gemini_call_log"("createdAt");

-- CreateIndex
CREATE INDEX "gemini_call_log_model_createdAt_idx" ON "gemini_call_log"("model", "createdAt");

-- RenameIndex
ALTER INDEX "Transaction_idempotencyKey_key" RENAME TO "transaction_idempotencyKey_key";
