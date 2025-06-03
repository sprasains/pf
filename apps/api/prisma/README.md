# PumpFlix Prisma Database Documentation

This directory contains the Prisma schema, migrations, and seed data for the PumpFlix application database.

## Schema Overview (`schema.prisma`)

The `schema.prisma` file defines the structure of the application database using the Prisma schema language. It includes models for:

- **Organizations:** Represents different organizations or workspaces within PumpFlix.
- **Tenants:** Represents tenants within an organization (if multi-tenancy is implemented at this level).
- **Users:** Stores user information, including authentication details and roles.
- **Workflows:** Defines the structure of automated workflows.
- **Templates:** Represents workflow templates available in the marketplace.
- **Credentials:** Stores credentials for connecting to external services.
- **Execution Logs:** Records the history and status of workflow executions.
- **Credential Usage Logs:** Logs the usage of credentials during workflow executions.
- **Invoices & Invoice Items:** Stores billing information.
- **Subscription Plans & Subscriptions:** Manages subscription plans and user/organization subscriptions.
- **WebSocket Sessions:** Tracks active WebSocket connections for real-time updates.
- **Notifications:** Stores user notifications.
- **AI Prompt Templates:** Stores templates for generating workflows using AI.
- **User Sessions:** Tracks active user login sessions.
- **Audit Logs:** Records important user and system actions for auditing.
- **System Alerts:** Stores system-level alerts and errors.
- **API Keys:** Manages API keys for external access.

Each model includes fields with appropriate data types, relationships to other models, and indexes for efficient querying.

## Recent Schema Updates (Migrations)

The latest migration, `update_schema_with_new_features`, includes the following changes:

- **Added Enums:** Introduced `ExecutionStatus`, `CredentialStatus`, `InvoiceStatus`, `SubscriptionStatus`, `WebSocketStatus`, and `AlertSeverity` enums for standardized status and severity values.
- **Updated Status/Severity Fields:** Modified the relevant status and severity fields in models like `ExecutionLog`, `CredentialUsageLog`, `Invoice`, `Subscription`, `WebSocketSession`, and `SystemAlert` to use the new enums.
- **Refined Relationships:** Ensured correct bidirectional relationships between models, including adding missing opposite relation fields in `SystemAlert` and `CredentialUsageLog`.
- **Added Indexes:** Added `@@index()` to several fields across various models (`ExecutionLog.createdAt`, `UserSession.expiresAt`, `AIPromptTemplate.category`, `AuditLog.createdAt`, `AuditLog.action`, `AuditLog.resource`, `AuditLog.resourceId`, `Invoice.status`, `Invoice.dueDate`, `Subscription.status`, `WebSocketSession.status`, `WebSocketSession.clientId`, `SystemAlert.severity`, `SystemAlert.isResolved`, `SystemAlert.createdAt`, `ApiKey.isRevoked`, `ApiKey.expiresAt`) to improve query performance.
- **Cleaned up Redundancy:** Removed redundant workflow-related fields from `CredentialUsageLog`.
- **Added Comments:** Added inline comments to models and fields for better clarity.

To apply the latest database changes, run the following command from the `apps/api` directory:

```bash
npx prisma migrate dev
```

## Seed Data (`seed.ts`)

The `seed.ts` file provides initial data for the database, useful for development and testing. It includes logic to create:

- A default Organization and Tenant.
- A test user (`test@example.com` with password `password123`).
- (To be added) Sample data for Workflows, Templates, Credentials, Subscription Plans, etc.

The seed script is designed to be idempotent, meaning it can be run multiple times without creating duplicate data.

To run the seed script from the project root, use the command:

```bash
pnpm run db:seed
```

This script can be extended to include more realistic or diverse sample data as needed for testing various features. 