-- PUMPFLIX WORKFLOW PLATFORM
-- Consolidated SQL for table definitions and stored procedures

-- TABLES

/*
 * The following tables define the foundational entities and relationships
 * for the PumpFlix n8n wrapper platform. This includes multi-tenant user
 * and org management, workflow modeling, audit logging, credential storage,
 * real-time sockets, AI prompt scaffolding, and integration hooks for APIs
 * and triggers. Indexes and constraints ensure relational integrity and 
 * performance for frequent query patterns.
 */

-- [...existing table definitions omitted for brevity, already present above...]

-- STORED PROCEDURES & FUNCTIONS

-- Procedure: create_workflow
-- Usage: Called when a new workflow is created by a user. Initializes with a version.
CREATE OR REPLACE PROCEDURE create_workflow(
    IN p_org_id UUID,
    IN p_user_id UUID,
    IN p_name TEXT,
    IN p_description TEXT,
    IN p_json_schema JSONB,
    OUT p_workflow_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_version_id UUID;
BEGIN
    INSERT INTO public.workflows (organization_id, name, description, created_by)
    VALUES (p_org_id, p_name, p_description, p_user_id)
    RETURNING id INTO p_workflow_id;

    INSERT INTO public.workflow_versions (workflow_id, json_schema, created_by)
    VALUES (p_workflow_id, p_json_schema, p_user_id)
    RETURNING id INTO v_version_id;

    UPDATE public.workflows
    SET current_version_id = v_version_id
    WHERE id = p_workflow_id;
END;
$$;

-- Procedure: log_workflow_execution
-- Logs execution attempts for auditing and billing purposes.
CREATE OR REPLACE PROCEDURE log_workflow_execution(
    IN p_workflow_id UUID,
    IN p_status TEXT,
    IN p_input_data JSONB,
    IN p_output_data JSONB,
    OUT p_execution_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.workflow_executions (workflow_id, status, started_at, finished_at, input_data, output_data)
    VALUES (p_workflow_id, p_status, now(), now(), p_input_data, p_output_data)
    RETURNING id INTO p_execution_id;
END;
$$;

-- Procedure: create_invoice
-- Records usage-based or subscription billing per org.
CREATE OR REPLACE PROCEDURE create_invoice(
    IN p_org_id UUID,
    IN p_amount_cents INT,
    IN p_status TEXT,
    IN p_billing_start DATE,
    IN p_billing_end DATE,
    OUT p_invoice_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.invoices (organization_id, amount_cents, status, billing_period_start, billing_period_end, created_at)
    VALUES (p_org_id, p_amount_cents, p_status, p_billing_start, p_billing_end, now())
    RETURNING id INTO p_invoice_id;
END;
$$;

-- Procedure: save_ai_prompt_template
-- Persists reusable AI prompt scaffolds for workflow creation.
CREATE OR REPLACE PROCEDURE save_ai_prompt_template(
    IN p_user_id UUID,
    IN p_title TEXT,
    IN p_prompt_body TEXT,
    OUT p_template_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.ai_prompt_templates (user_id, title, prompt_body, created_at)
    VALUES (p_user_id, p_title, p_prompt_body, now())
    RETURNING id INTO p_template_id;
END;
$$;

-- Procedure: log_credential_usage
-- Tracks credential use in executions for compliance.
CREATE OR REPLACE PROCEDURE log_credential_usage(
    IN p_credential_id UUID,
    IN p_user_id UUID,
    IN p_workflow_id UUID,
    IN p_execution_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.credential_usage_logs (credential_id, user_id, workflow_id, execution_id, used_at)
    VALUES (p_credential_id, p_user_id, p_workflow_id, p_execution_id, now());
END;
$$;

-- Procedure: start_websocket_session
-- Activates a WebSocket session.
CREATE OR REPLACE PROCEDURE start_websocket_session(
    IN p_user_id UUID,
    IN p_workflow_id UUID,
    IN p_connection_id TEXT,
    OUT p_session_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.websocket_sessions (user_id, workflow_id, connection_id, joined_at, is_active)
    VALUES (p_user_id, p_workflow_id, p_connection_id, now(), TRUE)
    RETURNING id INTO p_session_id;
END;
$$;

-- Procedure: end_websocket_session
-- Cleanly closes a WebSocket session.
CREATE OR REPLACE PROCEDURE end_websocket_session(
    IN p_session_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.websocket_sessions
    SET is_active = FALSE
    WHERE id = p_session_id;
END;
$$;

-- Procedure: clone_workflow
-- Duplicates a workflow and its latest version.
CREATE OR REPLACE PROCEDURE clone_workflow(
    IN p_original_workflow_id UUID,
    IN p_cloned_by UUID,
    OUT p_new_workflow_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_version_id UUID;
BEGIN
    INSERT INTO public.workflows (organization_id, name, description, created_by)
    SELECT organization_id, name || ' (Clone)', description, p_cloned_by
    FROM public.workflows
    WHERE id = p_original_workflow_id
    RETURNING id INTO p_new_workflow_id;

    INSERT INTO public.workflow_versions (workflow_id, json_schema, created_by)
    SELECT p_new_workflow_id, json_schema, p_cloned_by
    FROM public.workflow_versions
    WHERE workflow_id = p_original_workflow_id
    ORDER BY created_at DESC
    LIMIT 1
    RETURNING id INTO v_new_version_id;

    UPDATE public.workflows
    SET current_version_id = v_new_version_id
    WHERE id = p_new_workflow_id;
END;
$$;

-- Procedure: archive_workflow
-- Archives a workflow.
CREATE OR REPLACE PROCEDURE archive_workflow(
    IN p_workflow_id UUID
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.workflows
    SET is_archived = TRUE
    WHERE id = p_workflow_id;
END;
$$;

-- Procedure: create_template_from_workflow
-- Promotes a workflow to reusable template.
CREATE OR REPLACE PROCEDURE create_template_from_workflow(
    IN p_workflow_id UUID,
    IN p_created_by UUID,
    OUT p_template_id UUID
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.templates (workflow_id, name, description, category_id, created_by)
    SELECT id, name, description, NULL, p_created_by
    FROM public.workflows
    WHERE id = p_workflow_id
    RETURNING id INTO p_template_id;
END;
$$;

-- Function: get_user_usage_metrics
-- Returns execution and billing stats for user.
CREATE OR REPLACE FUNCTION get_user_usage_metrics(p_user_id UUID)
RETURNS TABLE (
    total_executions INT,
    monthly_executions INT,
    total_invoices INT,
    last_invoice_amount INT
)
LANGUAGE sql AS $$
    SELECT 
        COUNT(*) FILTER (WHERE we.started_at IS NOT NULL),
        COUNT(*) FILTER (WHERE we.started_at > date_trunc('month', now())),
        COUNT(DISTINCT i.id),
        COALESCE(MAX(i.amount_cents), 0)
    FROM public.users u
    JOIN public.workflows w ON w.organization_id = u.organization_id
    JOIN public.workflow_executions we ON we.workflow_id = w.id
    LEFT JOIN public.invoices i ON i.organization_id = u.organization_id
    WHERE u.id = p_user_id;
$$;

-- Function: get_credentials_for_workflow
-- Lists credentials accessible to the user's org.
CREATE OR REPLACE FUNCTION get_credentials_for_workflow(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT
)
LANGUAGE sql AS $$
    SELECT c.id, c.name, c.type
    FROM public.credentials c
    JOIN public.users u ON u.organization_id = c.organization_id
    WHERE u.id = p_user_id;
$$;
