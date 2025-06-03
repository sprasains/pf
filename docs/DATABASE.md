# PumpFlix Database Documentation

## Overview
The PumpFlix database uses PostgreSQL and includes tables for managing workflows, credentials, billing, AI templates, WebSocket sessions, and metrics. The schema is designed to support multi-tenant operations with proper indexing and constraints.

## Tables

### Organizations
```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```
Stores organization (tenant) information.

### Users
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT now()
);
```
Stores user accounts with organization associations.

### Workflows
```sql
CREATE TABLE public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    current_version_id UUID,
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT now()
);
```
Stores workflow metadata and versioning.

### Workflow Versions
```sql
CREATE TABLE public.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id),
    json_schema JSONB NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT now()
);
```
Tracks immutable workflow versions.

### Workflow Executions
```sql
CREATE TABLE public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id),
    status TEXT,
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);
```
Logs workflow execution attempts.

### Invoices
```sql
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    amount_cents INT,
    status TEXT,
    billing_period_start DATE,
    billing_period_end DATE,
    created_at TIMESTAMP DEFAULT now()
);
```
Stores billing records.

### AI Prompt Templates
```sql
CREATE TABLE public.ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    title TEXT,
    prompt_body TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```
Stores AI prompt templates.

### Credentials
```sql
CREATE TABLE public.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id),
    encrypted_value TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT now()
);
```
Securely stores encrypted credentials.

### Credential Usage Logs
```sql
CREATE TABLE public.credential_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID,
    user_id UUID,
    workflow_id UUID,
    execution_id UUID,
    used_at TIMESTAMP DEFAULT now()
);
```
Tracks credential usage.

### WebSocket Sessions
```sql
CREATE TABLE public.websocket_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    workflow_id UUID REFERENCES public.workflows(id),
    connection_id TEXT,
    joined_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);
```
Manages WebSocket connections.

### Templates
```sql
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id),
    name TEXT,
    description TEXT,
    category_id UUID,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT now(),
    downloads INT DEFAULT 0,
    price_cents INT DEFAULT 0
);
```
Stores reusable workflow templates.

## Indexes

### Workflow Indexes
```sql
CREATE INDEX idx_workflows_org ON public.workflows(organization_id);
CREATE INDEX idx_workflow_versions_workflow ON public.workflow_versions(workflow_id);
CREATE INDEX idx_workflows_template_flag ON public.workflows(is_template);
```

### Execution Indexes
```sql
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
```

### Credential Indexes
```sql
CREATE INDEX idx_credential_org_type ON public.credentials(organization_id, type);
CREATE INDEX idx_credential_usage_user ON public.credential_usage_logs(user_id);
```

### WebSocket Indexes
```sql
CREATE INDEX idx_ws_user_workflow ON public.websocket_sessions(user_id, workflow_id);
CREATE INDEX idx_ws_active ON public.websocket_sessions(is_active);
```

### Template Indexes
```sql
CREATE INDEX idx_templates_price_download ON public.templates(downloads, price_cents, created_at);
```

## Stored Procedures

### Workflow Management
```sql
CREATE OR REPLACE PROCEDURE create_workflow(
    IN p_org_id UUID,
    IN p_user_id UUID,
    IN p_name TEXT,
    IN p_description TEXT,
    IN p_json_schema JSONB,
    OUT p_workflow_id UUID
)
```
Creates a new workflow with initial version.

### Execution Logging
```sql
CREATE OR REPLACE PROCEDURE log_workflow_execution(
    IN p_workflow_id UUID,
    IN p_status TEXT,
    IN p_input_data JSONB,
    IN p_output_data JSONB,
    OUT p_execution_id UUID
)
```
Logs workflow execution attempts.

### Billing
```sql
CREATE OR REPLACE PROCEDURE create_invoice(
    IN p_org_id UUID,
    IN p_amount_cents INT,
    IN p_status TEXT,
    IN p_billing_start DATE,
    IN p_billing_end DATE,
    OUT p_invoice_id UUID
)
```
Records usage-based billing.

### AI Templates
```sql
CREATE OR REPLACE PROCEDURE save_ai_prompt_template(
    IN p_user_id UUID,
    IN p_title TEXT,
    IN p_prompt_body TEXT,
    OUT p_template_id UUID
)
```
Persists AI prompt templates.

### Credential Usage
```sql
CREATE OR REPLACE PROCEDURE log_credential_usage(
    IN p_credential_id UUID,
    IN p_user_id UUID,
    IN p_workflow_id UUID,
    IN p_execution_id UUID
)
```
Tracks credential usage.

### WebSocket Sessions
```sql
CREATE OR REPLACE PROCEDURE start_websocket_session(
    IN p_user_id UUID,
    IN p_workflow_id UUID,
    IN p_connection_id TEXT,
    OUT p_session_id UUID
)
```
Activates WebSocket sessions.

```sql
CREATE OR REPLACE PROCEDURE end_websocket_session(
    IN p_session_id UUID
)
```
Closes WebSocket sessions.

### Workflow Operations
```sql
CREATE OR REPLACE PROCEDURE clone_workflow(
    IN p_original_workflow_id UUID,
    IN p_cloned_by UUID,
    OUT p_new_workflow_id UUID
)
```
Duplicates workflows.

```sql
CREATE OR REPLACE PROCEDURE archive_workflow(
    IN p_workflow_id UUID
)
```
Archives workflows.

```sql
CREATE OR REPLACE PROCEDURE create_template_from_workflow(
    IN p_workflow_id UUID,
    IN p_created_by UUID,
    OUT p_template_id UUID
)
```
Creates templates from workflows.

### Metrics
```sql
CREATE OR REPLACE FUNCTION get_user_usage_metrics(p_user_id UUID)
RETURNS TABLE (
    total_executions INT,
    monthly_executions INT,
    total_invoices INT,
    last_invoice_amount INT
)
```
Returns user usage statistics.

```sql
CREATE OR REPLACE FUNCTION get_credentials_for_workflow(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT
)
```
Lists accessible credentials.

## Security Considerations

1. **Data Encryption**
   - Credentials are encrypted at rest
   - Passwords are hashed using secure algorithms

2. **Access Control**
   - Organization-based data isolation
   - Role-based access control
   - User-scoped operations

3. **Audit Trail**
   - Comprehensive logging of sensitive operations
   - Credential usage tracking
   - Workflow execution history

4. **Performance**
   - Optimized indexes for common queries
   - Efficient stored procedures
   - Proper constraint definitions 