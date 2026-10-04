-- Create workspace table
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FAMILY',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- Create workspace_member table
CREATE TABLE "workspace_member" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_member_pkey" PRIMARY KEY ("id")
);

-- Create workspace_invitation table
CREATE TABLE "workspace_invitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invitation_pkey" PRIMARY KEY ("id")
);

-- Add workspaceId columns to existing tables
ALTER TABLE "subscription" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "wallet" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "transaction" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "budget" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "category" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "financial_goal" ADD COLUMN "workspaceId" TEXT;

-- Create indexes
CREATE INDEX "workspace_ownerId_idx" ON "workspace"("ownerId");
CREATE INDEX "workspace_member_workspaceId_idx" ON "workspace_member"("workspaceId");
CREATE INDEX "workspace_member_userId_idx" ON "workspace_member"("userId");
CREATE UNIQUE INDEX "workspace_member_userId_key" ON "workspace_member"("userId");
CREATE INDEX "workspace_invitation_workspaceId_idx" ON "workspace_invitation"("workspaceId");
CREATE INDEX "workspace_invitation_email_idx" ON "workspace_invitation"("email");
CREATE UNIQUE INDEX "workspace_invitation_token_key" ON "workspace_invitation"("token");
CREATE INDEX "subscription_workspaceId_idx" ON "subscription"("workspaceId");
CREATE INDEX "wallet_workspaceId_idx" ON "wallet"("workspaceId");
CREATE INDEX "transaction_workspaceId_idx" ON "transaction"("workspaceId");
CREATE INDEX "budget_workspaceId_idx" ON "budget"("workspaceId");
CREATE INDEX "category_workspaceId_idx" ON "category"("workspaceId");
CREATE INDEX "financial_goal_workspaceId_idx" ON "financial_goal"("workspaceId");

-- Add foreign key constraints
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget" ADD CONSTRAINT "budget_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category" ADD CONSTRAINT "category_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_goal" ADD CONSTRAINT "financial_goal_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
