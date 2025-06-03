-- PUMPFLIX WORKFLOW PLATFORM
-- Generated SQL schema based on schema.prisma

-- IMPORTANT: This script is intended for generating a schema from scratch or for comparison.
-- For applying changes to an existing database, use Prisma Migrate (npx prisma migrate dev/deploy).

-- Drop tables if they exist (use with caution in production)
-- DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
-- DROP TABLE IF EXISTS "ApiKey" CASCADE;
-- DROP TABLE IF EXISTS "SystemAlert" CASCADE;
-- DROP TABLE IF EXISTS "AuditLog" CASCADE;
-- DROP TABLE IF EXISTS "UserSession" CASCADE;
-- DROP TABLE IF EXISTS "AIPromptTemplate" CASCADE;
-- DROP TABLE IF EXISTS "Subscription" CASCADE;
-- DROP TABLE IF EXISTS "SubscriptionPlan" CASCADE;
-- DROP TABLE IF EXISTS "Notification" CASCADE;
-- DROP TABLE IF EXISTS "WebSocketSession" CASCADE;
-- DROP TABLE IF EXISTS "InvoiceItem" CASCADE;
-- DROP TABLE IF EXISTS "Invoice" CASCADE;
-- DROP TABLE IF EXISTS "CredentialUsageLog" CASCADE;
-- DROP TABLE IF EXISTS "ExecutionLog" CASCADE;
-- DROP TABLE IF EXISTS "Credential" CASCADE;
-- DROP TABLE IF EXISTS "TemplateInstallation" CASCADE;
-- DROP TABLE IF EXISTS "Template" CASCADE;
-- DROP TABLE IF EXISTS "Workflow" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;
-- DROP TABLE IF EXISTS "Tenant" CASCADE;
-- DROP TABLE IF EXISTS "Organization" CASCADE;
-- DROP TYPE IF EXISTS "AlertSeverity";
-- DROP TYPE IF EXISTS "WebSocketStatus";
-- DROP TYPE IF EXISTS "SubscriptionStatus";
-- DROP TYPE IF EXISTS "InvoiceStatus";
-- DROP TYPE IF EXISTS "CredentialStatus";
-- DROP TYPE IF EXISTS "ExecutionStatus";
-- DROP TYPE IF EXISTS "Role";

-- Create Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');
CREATE TYPE "CredentialStatus" AS ENUM ('SUCCESS', 'FAILED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID', 'CANCELLED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING', 'ENDED');
CREATE TYPE "WebSocketStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ACTIVE', 'INACTIVE');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- Create Tables

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "provider" TEXT,
    "provider_id" TEXT,
    "password_hash" TEXT,
    "last_login" TIMESTAMP(3) WITHOUT TIME ZONE,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "orgId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateInstallation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "TemplateInstallation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) WITHOUT TIME ZONE,
    "config" JSONB,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "metadata" JSONB,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CredentialUsageLog" (
    "id" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL,
    "metadata" JSONB,
    "credentialId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "CredentialUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebSocketSession" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "WebSocketStatus" NOT NULL,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "WebSocketSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "features" TEXT[] NOT NULL,
    "executionLimit" INTEGER NOT NULL,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "trialEndsAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "currentExecutions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIPromptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" TEXT[] NOT NULL,
    "category" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "AIPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3) WITHOUT TIME ZONE,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    "orgId" TEXT,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) WITHOUT TIME ZONE,
    "lastUsedAt" TIMESTAMP(3) WITHOUT TIME ZONE,
    "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Create Foreign Keys

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Template" ADD CONSTRAINT "Template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Template" ADD CONSTRAINT "Template_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CredentialUsageLog" ADD CONSTRAINT "CredentialUsageLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CredentialUsageLog" ADD CONSTRAINT "CredentialUsageLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CredentialUsageLog" ADD CONSTRAINT "CredentialUsageLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIPromptTemplate" ADD CONSTRAINT "AIPromptTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIPromptTemplate" ADD CONSTRAINT "AIPromptTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Indexes

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_orgId_idx" ON "Tenant"("orgId");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_provider_id_key" ON "User"("provider_id");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_provider_id_idx" ON "User"("provider_id");
CREATE INDEX "User_orgId_idx" ON "User"("orgId");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_provider_provider_id_idx" ON "User"("provider", "provider_id");

CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");

CREATE INDEX "Template_createdById_idx" ON "Template"("createdById");
CREATE INDEX "Template_orgId_idx" ON "Template"("orgId");

CREATE UNIQUE INDEX "TemplateInstallation_templateId_userId_orgId_key" ON "TemplateInstallation"("templateId", "userId", "orgId");
CREATE INDEX "TemplateInstallation_templateId_idx" ON "TemplateInstallation"("templateId");
CREATE INDEX "TemplateInstallation_userId_idx" ON "TemplateInstallation"("userId");
CREATE INDEX "TemplateInstallation_orgId_idx" ON "TemplateInstallation"("orgId");

CREATE INDEX "Credential_userId_idx" ON "Credential"("userId");
CREATE INDEX "Credential_orgId_idx" ON "Credential"("orgId");

CREATE INDEX "ExecutionLog_workflowId_idx" ON "ExecutionLog"("workflowId");
CREATE INDEX "ExecutionLog_userId_idx" ON "ExecutionLog"("userId");
CREATE INDEX "ExecutionLog_orgId_idx" ON "ExecutionLog"("orgId");
CREATE INDEX "ExecutionLog_createdAt_idx" ON "ExecutionLog"("createdAt");

CREATE INDEX "CredentialUsageLog_credentialId_idx" ON "CredentialUsageLog"("credentialId");
CREATE INDEX "CredentialUsageLog_executionId_idx" ON "CredentialUsageLog"("executionId");
CREATE INDEX "CredentialUsageLog_workflowId_idx" ON "CredentialUsageLog"("workflowId");

CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_orgId_idx" ON "Invoice"("orgId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

CREATE INDEX "WebSocketSession_workflowId_idx" ON "WebSocketSession"("workflowId");
CREATE INDEX "WebSocketSession_userId_idx" ON "WebSocketSession"("userId");
CREATE INDEX "WebSocketSession_orgId_idx" ON "WebSocketSession"("orgId");
CREATE INDEX "WebSocketSession_status_idx" ON "WebSocketSession"("status");
CREATE INDEX "WebSocketSession_clientId_idx" ON "WebSocketSession"("clientId");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Subscription_orgId_idx" ON "Subscription"("orgId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE INDEX "AIPromptTemplate_createdById_idx" ON "AIPromptTemplate"("createdById");
CREATE INDEX "AIPromptTemplate_orgId_idx" ON "AIPromptTemplate"("orgId");
CREATE INDEX "AIPromptTemplate_category_idx" ON "AIPromptTemplate"("category");

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_orgId_idx" ON "AuditLog"("orgId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

CREATE INDEX "SystemAlert_severity_idx" ON "SystemAlert"("severity");
CREATE INDEX "SystemAlert_isResolved_idx" ON "SystemAlert"("isResolved");
CREATE INDEX "SystemAlert_createdAt_idx" ON "SystemAlert"("createdAt");
CREATE INDEX "SystemAlert_orgId_idx" ON "SystemAlert"("orgId");

CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");
CREATE INDEX "ApiKey_isRevoked_idx" ON "ApiKey"("isRevoked");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
