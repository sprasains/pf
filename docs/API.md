# PumpFlix API Documentation

## Overview
The PumpFlix API provides endpoints for managing workflows, credentials, billing, AI templates, WebSocket sessions, and metrics. All endpoints require authentication using JWT tokens.

## Authentication
All API endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Workflows

#### Get All Workflows
```http
GET /api/workflows
```
Returns all workflows for the authenticated user's organization.

#### Get Workflow by ID
```http
GET /api/workflows/:id
```
Returns a specific workflow by ID.

#### Create Workflow
```http
POST /api/workflows
```
Creates a new workflow.

Request body:
```json
{
  "name": "string",
  "description": "string",
  "json_schema": "object"
}
```

#### Execute Workflow
```http
POST /api/workflows/:id/execute
```
Executes a workflow with the provided input data.

Request body:
```json
{
  "input_data": "object"
}
```

#### Archive Workflow
```http
POST /api/workflows/:id/archive
```
Archives a workflow.

#### Clone Workflow
```http
POST /api/workflows/:id/clone
```
Creates a clone of an existing workflow.

#### Create Template from Workflow
```http
POST /api/workflows/:id/template
```
Creates a reusable template from an existing workflow.

### Credentials

#### Get Credentials
```http
GET /api/credentials
```
Returns all credentials accessible to the user's organization.

#### Create Credential
```http
POST /api/credentials
```
Creates a new credential.

Request body:
```json
{
  "name": "string",
  "type": "string",
  "encrypted_value": "string",
  "metadata": "object"
}
```

#### Log Credential Usage
```http
POST /api/credentials/usage
```
Logs credential usage for auditing purposes.

Request body:
```json
{
  "credential_id": "uuid",
  "workflow_id": "uuid",
  "execution_id": "uuid"
}
```

### Billing

#### Create Invoice
```http
POST /api/billing/invoices
```
Creates a new invoice.

Request body:
```json
{
  "organization_id": "uuid",
  "amount": "number",
  "currency": "string",
  "description": "string",
  "due_date": "datetime",
  "items": [
    {
      "description": "string",
      "quantity": "integer",
      "unit_price": "number",
      "total": "number"
    }
  ]
}
```

#### Get Invoices
```http
GET /api/billing/invoices
```
Returns all invoices for the authenticated user's organization.

### AI Templates

#### Create AI Template
```http
POST /api/ai/templates
```
Creates a new AI prompt template.

Request body:
```json
{
  "name": "string",
  "description": "string",
  "template": "string",
  "variables": ["string"],
  "category": "string",
  "metadata": "object"
}
```

#### Get AI Templates
```http
GET /api/ai/templates
```
Returns all AI templates for the authenticated user's organization.

### WebSocket Sessions

#### Start Session
```http
POST /api/websocket/sessions/start
```
Starts a new WebSocket session.

Request body:
```json
{
  "workflow_id": "uuid",
  "client_id": "uuid",
  "metadata": "object"
}
```

#### End Session
```http
POST /api/websocket/sessions/end
```
Ends an active WebSocket session.

Request body:
```json
{
  "session_id": "uuid"
}
```

#### Get Active Sessions
```http
GET /api/websocket/sessions/active
```
Returns all active WebSocket sessions for the authenticated user.

### Metrics

#### Get Usage Metrics
```http
GET /api/metrics/usage
```
Returns usage metrics for the authenticated user.

Query parameters:
- `start_date`: Start date (ISO datetime)
- `end_date`: End date (ISO datetime)

#### Get Workflow Credentials
```http
GET /api/metrics/workflow/:workflowId/credentials
```
Returns credentials associated with a specific workflow.

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "string",
  "message": "string"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

Some endpoints are rate-limited to prevent abuse:
- Workflow execution: 10 requests per minute
- Metrics endpoint: 10 requests per minute
- AI generation: 5 requests per minute

## Stored Procedures

The API uses the following stored procedures:

1. `create_workflow`: Creates a new workflow with initial version
2. `log_workflow_execution`: Logs workflow execution attempts
3. `create_invoice`: Records usage-based billing
4. `save_ai_prompt_template`: Persists AI prompt templates
5. `log_credential_usage`: Tracks credential usage
6. `start_websocket_session`: Activates WebSocket sessions
7. `end_websocket_session`: Closes WebSocket sessions
8. `clone_workflow`: Duplicates workflows
9. `archive_workflow`: Archives workflows
10. `create_template_from_workflow`: Creates templates from workflows
11. `get_user_usage_metrics`: Returns user usage statistics
12. `get_credentials_for_workflow`: Lists accessible credentials

## Security

- All endpoints require JWT authentication
- Credentials are encrypted at rest
- Rate limiting prevents abuse
- Input validation using Zod schemas
- Audit logging for sensitive operations
- WebSocket sessions are user-scoped 