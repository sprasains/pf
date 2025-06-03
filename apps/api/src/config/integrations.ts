import { z } from 'zod';

export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  credentialSchema: z.ZodObject<any>;
  documentationUrl: string;
}

export const integrationProviders: Record<string, IntegrationProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    description: 'Connect to Google services like Gmail, Calendar, and Drive',
    icon: 'google',
    credentialSchema: z.object({
      clientId: z.string().min(1, 'Client ID is required'),
      clientSecret: z.string().min(1, 'Client Secret is required'),
      redirectUri: z.string().url('Valid redirect URI is required')
    }),
    documentationUrl: 'https://developers.google.com/identity/protocols/oauth2'
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Connect to Slack workspaces for messaging and notifications',
    icon: 'slack',
    credentialSchema: z.object({
      botToken: z.string().min(1, 'Bot Token is required'),
      appToken: z.string().min(1, 'App Token is required'),
      signingSecret: z.string().min(1, 'Signing Secret is required')
    }),
    documentationUrl: 'https://api.slack.com/authentication/basics'
  },
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Connect to GitHub repositories and manage code',
    icon: 'github',
    credentialSchema: z.object({
      clientId: z.string().min(1, 'Client ID is required'),
      clientSecret: z.string().min(1, 'Client Secret is required'),
      webhookSecret: z.string().min(1, 'Webhook Secret is required')
    }),
    documentationUrl: 'https://docs.github.com/en/developers/apps/building-oauth-apps'
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Connect to Stripe for payment processing',
    icon: 'stripe',
    credentialSchema: z.object({
      apiKey: z.string().min(1, 'API Key is required'),
      webhookSecret: z.string().min(1, 'Webhook Secret is required')
    }),
    documentationUrl: 'https://stripe.com/docs/api'
  },
  aws: {
    id: 'aws',
    name: 'AWS',
    description: 'Connect to Amazon Web Services',
    icon: 'aws',
    credentialSchema: z.object({
      accessKeyId: z.string().min(1, 'Access Key ID is required'),
      secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
      region: z.string().min(1, 'Region is required')
    }),
    documentationUrl: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html'
  },
  azure: {
    id: 'azure',
    name: 'Azure',
    description: 'Connect to Microsoft Azure services',
    icon: 'azure',
    credentialSchema: z.object({
      clientId: z.string().min(1, 'Client ID is required'),
      clientSecret: z.string().min(1, 'Client Secret is required'),
      tenantId: z.string().min(1, 'Tenant ID is required'),
      subscriptionId: z.string().min(1, 'Subscription ID is required')
    }),
    documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app'
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    description: 'Connect to Jira for project management',
    icon: 'jira',
    credentialSchema: z.object({
      apiToken: z.string().min(1, 'API Token is required'),
      email: z.string().email('Valid email is required'),
      domain: z.string().min(1, 'Domain is required')
    }),
    documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/oauth-2-authorization-code-grants-3lo-for-apps/'
  },
  zoom: {
    id: 'zoom',
    name: 'Zoom',
    description: 'Connect to Zoom for video conferencing',
    icon: 'zoom',
    credentialSchema: z.object({
      apiKey: z.string().min(1, 'API Key is required'),
      apiSecret: z.string().min(1, 'API Secret is required'),
      webhookSecret: z.string().min(1, 'Webhook Secret is required')
    }),
    documentationUrl: 'https://marketplace.zoom.us/docs/guides/build/server-to-server-oauth-app/'
  }
}; 