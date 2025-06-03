import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const tenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  orgId: z.string(),
});

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  orgId: z.string(),
  tenantId: z.string(),
});

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.record(z.any()),
  isActive: z.boolean().default(true),
  tenantId: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  organizationName: z.string().min(1),
  organizationSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const integrationCredentialSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string(),
  credentials: z.record(z.string()),
  scopes: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  userId: z.string(),
  orgId: z.string(),
  tenantId: z.string(),
});

export const createCredentialSchema = z.object({
  provider: z.string(),
  label: z.string(),
  credentials: z.record(z.string()),
  scopes: z.array(z.string()).optional(),
});

export const updateCredentialSchema = z.object({
  label: z.string().optional(),
  credentials: z.record(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
});

export const workflowTemplateSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['prebuilt', 'ai']),
  name: z.string().min(1),
  description: z.string(),
  thumbnail: z.string(),
  n8nJson: z.record(z.any()),
  requiredCredentials: z.array(z.string()),
  inputVariables: z.array(z.string()),
  createdAt: z.string(),
});

export const workflowInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string().nullable(),
  userId: z.string(),
  orgId: z.string(),
  finalJson: z.record(z.any()),
  promptText: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const createWorkflowTemplateSchema = z.object({
  sourceType: z.enum(['prebuilt', 'ai']),
  name: z.string().min(1),
  description: z.string(),
  thumbnail: z.string(),
  n8nJson: z.record(z.any()),
  requiredCredentials: z.array(z.string()),
  inputVariables: z.array(z.string()),
});

export const createWorkflowInstanceSchema = z.object({
  templateId: z.string().optional(),
  userId: z.string(),
  orgId: z.string(),
  finalJson: z.record(z.any()),
  promptText: z.string().optional(),
});

export const updateWorkflowTemplateSchema = z.object({
  sourceType: z.enum(['prebuilt', 'ai']).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  n8nJson: z.record(z.any()).optional(),
  requiredCredentials: z.array(z.string()).optional(),
  inputVariables: z.array(z.string()).optional(),
});

export const updateWorkflowInstanceSchema = z.object({
  templateId: z.string().optional(),
  finalJson: z.record(z.any()).optional(),
  promptText: z.string().optional(),
});

export type Organization = z.infer<typeof organizationSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type User = z.infer<typeof userSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type IntegrationCredential = z.infer<typeof integrationCredentialSchema>;
export type CreateCredential = z.infer<typeof createCredentialSchema>;
export type UpdateCredential = z.infer<typeof updateCredentialSchema>;
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;
export type WorkflowInstance = z.infer<typeof workflowInstanceSchema>;
export type CreateWorkflowTemplate = z.infer<typeof createWorkflowTemplateSchema>;
export type CreateWorkflowInstance = z.infer<typeof createWorkflowInstanceSchema>;
export type UpdateWorkflowTemplate = z.infer<typeof updateWorkflowTemplateSchema>;
export type UpdateWorkflowInstance = z.infer<typeof updateWorkflowInstanceSchema>; 