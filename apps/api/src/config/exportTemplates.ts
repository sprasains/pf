import { z } from 'zod';

// Enhanced filter schema
const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'between', 'in']),
  value: z.any(),
  value2: z.any().optional(), // For 'between' operator
});

// Computed field schema
const computedFieldSchema = z.object({
  name: z.string(),
  expression: z.string(),
  description: z.string(),
  type: z.enum(['number', 'string', 'date', 'boolean']),
});

// Enhanced template schema
export const exportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['operations', 'product', 'finance', 'support', 'analytics', 'billing']),
  type: z.enum(['usage', 'billing', 'audit', 'analytics']),
  version: z.number().default(1),
  fields: z.array(z.string()),
  computedFields: z.array(computedFieldSchema).optional(),
  format: z.enum(['csv', 'json', 'xlsx', 'pdf']),
  filters: z.object({
    dateRange: z.object({
      required: z.boolean(),
      default: z.enum(['last7days', 'last30days', 'last90days', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear', 'custom']).optional(),
      custom: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
    }),
    customFilters: z.array(filterSchema).optional(),
    status: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    workflows: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    dayOfWeek: z.number().optional(),
    dayOfMonth: z.number().optional(),
    time: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  metadata: z.object({
    includeCharts: z.boolean().optional(),
    groupBy: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    maxRows: z.number().optional(),
    includeMetadata: z.boolean().optional(),
    chartTypes: z.array(z.string()).optional(),
  }).optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

export type ExportTemplate = z.infer<typeof exportTemplateSchema>;

// New templates for specific business roles
export const DEFAULT_EXPORT_TEMPLATES: ExportTemplate[] = [
  // Operations Templates
  {
    id: 'workflow-success-failure-audit',
    name: 'Workflow Success/Failure Audit',
    description: 'Detailed audit of workflow execution success and failure patterns',
    category: 'operations',
    type: 'analytics',
    version: 1,
    fields: [
      'workflowId',
      'workflowName',
      'executionCount',
      'successCount',
      'failureCount',
      'averageDuration',
      'lastExecution',
      'errorTypes',
      'retryCount',
    ],
    computedFields: [
      {
        name: 'successRate',
        expression: 'successCount / executionCount * 100',
        description: 'Percentage of successful executions',
        type: 'number',
      },
      {
        name: 'failureRate',
        expression: 'failureCount / executionCount * 100',
        description: 'Percentage of failed executions',
        type: 'number',
      },
    ],
    format: 'xlsx',
    filters: {
      dateRange: {
        required: true,
        default: 'last30days',
      },
      customFilters: [
        {
          field: 'status',
          operator: 'in',
          value: ['success', 'error'],
        },
      ],
    },
    metadata: {
      includeCharts: true,
      groupBy: 'workflow',
      sortBy: 'failureCount',
      sortOrder: 'desc',
      chartTypes: ['bar', 'line'],
    },
    tags: ['operations', 'audit', 'performance'],
  },
  // Product Templates
  {
    id: 'feature-adoption-per-workflow',
    name: 'Feature Adoption per Workflow',
    description: 'Analysis of feature usage and adoption patterns across workflows',
    category: 'product',
    type: 'analytics',
    version: 1,
    fields: [
      'workflowId',
      'workflowName',
      'featureName',
      'usageCount',
      'uniqueUsers',
      'firstUsed',
      'lastUsed',
      'averageUsagePerUser',
    ],
    computedFields: [
      {
        name: 'adoptionRate',
        expression: 'uniqueUsers / totalUsers * 100',
        description: 'Percentage of users who have used this feature',
        type: 'number',
      },
      {
        name: 'usageTrend',
        expression: 'usageCount / daysSinceFirstUse',
        description: 'Average daily usage rate',
        type: 'number',
      },
    ],
    format: 'pdf',
    filters: {
      dateRange: {
        required: true,
        default: 'last90days',
      },
    },
    metadata: {
      includeCharts: true,
      groupBy: 'feature',
      chartTypes: ['heatmap', 'trend'],
    },
    tags: ['product', 'adoption', 'analytics'],
  },
  // Finance Templates
  {
    id: 'monthly-execution-cost-summary',
    name: 'Monthly Execution vs Plan Cost Summary',
    description: 'Comprehensive cost analysis of workflow executions against plan limits',
    category: 'finance',
    type: 'billing',
    version: 1,
    fields: [
      'month',
      'planType',
      'executionCount',
      'baseCost',
      'overageCost',
      'totalCost',
      'planLimit',
      'utilizationRate',
    ],
    computedFields: [
      {
        name: 'costPerExecution',
        expression: 'totalCost / executionCount',
        description: 'Average cost per execution',
        type: 'number',
      },
      {
        name: 'overagePercentage',
        expression: 'overageCost / totalCost * 100',
        description: 'Percentage of costs from overages',
        type: 'number',
      },
    ],
    format: 'xlsx',
    filters: {
      dateRange: {
        required: true,
        default: 'thisMonth',
      },
    },
    metadata: {
      includeCharts: true,
      groupBy: 'planType',
      chartTypes: ['bar', 'pie'],
    },
    tags: ['finance', 'cost', 'billing'],
  },
  // Support Templates
  {
    id: 'top-failing-workflows',
    name: 'Top 10 Failing Workflows by User',
    description: 'Analysis of most problematic workflows and their impact on users',
    category: 'support',
    type: 'analytics',
    version: 1,
    fields: [
      'userId',
      'userName',
      'workflowId',
      'workflowName',
      'failureCount',
      'errorTypes',
      'lastFailure',
      'averageResolutionTime',
      'supportTickets',
    ],
    computedFields: [
      {
        name: 'failureImpact',
        expression: 'failureCount * averageResolutionTime',
        description: 'Total impact of failures in minutes',
        type: 'number',
      },
      {
        name: 'ticketRatio',
        expression: 'supportTickets / failureCount',
        description: 'Support tickets per failure',
        type: 'number',
      },
    ],
    format: 'pdf',
    filters: {
      dateRange: {
        required: true,
        default: 'last30days',
      },
      customFilters: [
        {
          field: 'status',
          operator: 'equals',
          value: 'error',
        },
      ],
    },
    metadata: {
      includeCharts: true,
      groupBy: 'user',
      sortBy: 'failureCount',
      sortOrder: 'desc',
      maxRows: 10,
      chartTypes: ['bar', 'scatter'],
    },
    tags: ['support', 'troubleshooting', 'users'],
  },
  {
    id: 'weekly-execution-digest',
    name: 'Weekly Execution Digest',
    description: 'Comprehensive weekly report of workflow executions and performance metrics',
    category: 'analytics',
    type: 'analytics',
    version: 1,
    fields: [
      'workflowName',
      'executionCount',
      'successRate',
      'averageDuration',
      'errorCount',
      'lastExecution',
      'userCount',
    ],
    format: 'xlsx',
    filters: {
      dateRange: {
        required: true,
        default: 'last7days',
      },
      status: ['success', 'error', 'pending'],
    },
    metadata: {
      includeCharts: true,
      groupBy: 'workflow',
    },
    tags: ['analytics', 'performance'],
  },
  {
    id: 'active-users-breakdown',
    name: 'Active Users Breakdown',
    description: 'Detailed analysis of user activity and engagement',
    category: 'usage',
    type: 'usage',
    version: 1,
    fields: [
      'userId',
      'userName',
      'workflowCount',
      'executionCount',
      'lastActive',
      'totalDuration',
      'successRate',
    ],
    format: 'pdf',
    filters: {
      dateRange: {
        required: true,
        default: 'last30days',
      },
    },
    metadata: {
      includeCharts: true,
      groupBy: 'user',
    },
    tags: ['usage', 'analytics'],
  },
  {
    id: 'workflow-failures-retries',
    name: 'Workflow Failures & Retries',
    description: 'Analysis of workflow failures, retry patterns, and error trends',
    category: 'analytics',
    type: 'analytics',
    version: 1,
    fields: [
      'workflowId',
      'workflowName',
      'errorType',
      'errorCount',
      'retryCount',
      'averageRetryTime',
      'resolutionTime',
      'affectedUsers',
    ],
    format: 'csv',
    filters: {
      dateRange: {
        required: true,
        default: 'last30days',
      },
      status: ['error'],
    },
    metadata: {
      includeErrorDetails: true,
      groupBy: 'errorType',
    },
    tags: ['analytics', 'error'],
  },
  {
    id: 'trial-conversions-overview',
    name: 'Trial Conversions Overview',
    description: 'Analysis of trial users, conversion rates, and upgrade patterns',
    category: 'analytics',
    type: 'analytics',
    version: 1,
    fields: [
      'userId',
      'trialStartDate',
      'trialEndDate',
      'conversionDate',
      'planType',
      'workflowCount',
      'executionCount',
      'conversionValue',
    ],
    format: 'xlsx',
    filters: {
      dateRange: {
        required: true,
        default: 'last90days',
      },
    },
    metadata: {
      includeCharts: true,
      groupBy: 'planType',
    },
    tags: ['analytics', 'conversion'],
  },
  {
    id: 'organization-billing-summary',
    name: 'Organization Billing Summary',
    description: 'Comprehensive billing and usage summary for organizations',
    category: 'billing',
    type: 'billing',
    version: 1,
    fields: [
      'orgId',
      'orgName',
      'planType',
      'billingPeriod',
      'totalAmount',
      'usageMetrics',
      'overageCharges',
      'discounts',
      'netAmount',
    ],
    format: 'pdf',
    filters: {
      dateRange: {
        required: true,
        default: 'last30days',
      },
    },
    metadata: {
      includeCharts: true,
      groupBy: 'organization',
    },
    tags: ['finance', 'billing'],
  },
];

// Helper functions
export const getTemplateById = (templateId: string): ExportTemplate | undefined => {
  return DEFAULT_EXPORT_TEMPLATES.find(template => template.id === templateId);
};

export const getTemplatesByCategory = (category: ExportTemplate['category']): ExportTemplate[] => {
  return DEFAULT_EXPORT_TEMPLATES.filter(template => template.category === category);
};

export const getTemplatesByType = (type: ExportTemplate['type']): ExportTemplate[] => {
  return DEFAULT_EXPORT_TEMPLATES.filter(template => template.type === type);
};

export const searchTemplates = (query: string): ExportTemplate[] => {
  const searchTerms = query.toLowerCase().split(' ');
  return DEFAULT_EXPORT_TEMPLATES.filter(template => {
    const searchableText = [
      template.name,
      template.description,
      template.category,
      template.type,
      ...(template.tags || []),
    ].join(' ').toLowerCase();
    return searchTerms.every(term => searchableText.includes(term));
  });
};

export const validateTemplate = (template: unknown): ExportTemplate => {
  return exportTemplateSchema.parse(template);
}; 