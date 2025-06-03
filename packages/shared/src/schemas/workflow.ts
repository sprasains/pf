import { z } from 'zod';

export const workflowDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  settings: z.object({
    executionMode: z.enum(['manual', 'scheduled', 'webhook']).default('manual'),
    schedule: z.string().optional(),
    retryCount: z.number().min(0).default(3),
    timeout: z.number().min(0).default(3600),
  }).default({}),
  metadata: z.record(z.any()).optional(),
});

export const workflowUpsertSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  definition: workflowDefinitionSchema,
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowUpsert = z.infer<typeof workflowUpsertSchema>; 