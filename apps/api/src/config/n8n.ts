import { Tenant } from '@prisma/client';

interface N8nConfig {
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

export function createN8nConfig(tenant: Tenant): N8nConfig {
  return {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    webhookUrl: `${process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'}/${tenant.slug}`,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
  };
}

export function getN8nHeaders(tenant: Tenant) {
  return {
    'X-N8N-API-KEY': process.env.N8N_API_KEY || '',
    'X-N8N-TENANT-ID': tenant.id,
    'X-N8N-TENANT-SLUG': tenant.slug,
  };
}

export async function initializeN8nWorkflow(tenant: Tenant, workflowData: any) {
  const config = createN8nConfig(tenant);
  const headers = getN8nHeaders(tenant);

  try {
    // Create workflow in n8n
    const response = await fetch(`${config.baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...workflowData,
        name: `${tenant.slug}-${workflowData.name}`,
        tags: [tenant.slug],
        settings: {
          ...workflowData.settings,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create workflow in n8n');
    }

    return await response.json();
  } catch (error) {
    console.error('Error initializing n8n workflow:', error);
    throw error;
  }
}

export async function executeN8nWorkflow(tenant: Tenant, workflowId: string, data: any) {
  const config = createN8nConfig(tenant);
  const headers = getN8nHeaders(tenant);

  try {
    const response = await fetch(
      `${config.baseUrl}/api/v1/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          data,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to execute workflow in n8n');
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing n8n workflow:', error);
    throw error;
  }
} 