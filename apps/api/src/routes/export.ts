/// <reference path="../types/custom.d.ts" />
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { isAuthenticated } from '../middleware/authMiddleware';
import { auditLog } from '../utils/audit';
import { stripe } from '../lib/stripe';
import { logger } from '../utils/logger';
import { Queue } from 'bull';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Rate limiting middleware
const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many export requests, please try again later',
});

// Initialize Bull queue for background processing
const exportQueue = new Queue('exports', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const exportOptionsSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx', 'pdf']),
  type: z.enum(['workflow', 'analytics', 'billing']),
  dateRange: z.tuple([z.date(), z.date()]).optional(),
  includeMetadata: z.boolean().optional(),
  templateId: z.string().optional(),
});

// Process export job
exportQueue.process(async (job) => {
  const { userId, options } = job.data;
  const { format, type, dateRange, includeMetadata, templateId } = options;

  try {
    // Get data based on type
    let data;
    switch (type) {
      case 'workflow':
        data = await getWorkflowData(userId, dateRange);
        break;
      case 'analytics':
        data = await getAnalyticsData(userId, dateRange);
        break;
      case 'billing':
        data = await getBillingData(userId, dateRange);
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Apply template if specified
    if (templateId) {
      const template = await prisma.exportTemplate.findUnique({
        where: { id: templateId },
      });
      if (template) {
        data = applyTemplate(data, template);
      }
    }

    // Generate file based on format
    const filename = `export-${type}-${Date.now()}`;
    let filePath;
    switch (format) {
      case 'csv':
        filePath = await generateCSV(data, filename);
        break;
      case 'xlsx':
        filePath = await generateExcel(data, filename);
        break;
      case 'pdf':
        filePath = await generatePDF(data, filename);
        break;
      case 'json':
        filePath = await generateJSON(data, filename);
        break;
      default:
        throw new Error('Invalid export format');
    }

    // Upload to S3
    const fileContent = await fs.readFile(filePath);
    const s3Key = `exports/${userId}/${path.basename(filePath)}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || 'pumpflix-exports',
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(format),
    }));

    // Clean up local file
    await fs.unlink(filePath);

    // Update job status
    await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Export job failed:', error);
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: 'failed' },
    });
    throw error;
  }
});

// Schedule export
router.post('/schedule', isAuthenticated, async (req, res) => {
  try {
    const options = exportOptionsSchema.parse(req.body);
    const userId = req.user!.id;

    // Create export job record
    const job = await prisma.exportJob.create({
      data: {
        userId,
        type: options.type,
        status: 'pending',
        format: options.format,
      },
    });

    // Add to queue
    await exportQueue.add(
      { userId, options },
      { jobId: job.id }
    );

    return sendSuccess(res, { jobId: job.id });
  } catch (error) {
    logger.error('Error scheduling export:', error);
    return sendError(res, 'Failed to schedule export');
  }
});

// Check export status
router.get('/status/:jobId', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      return sendError(res, 'Export job not found', 404);
    }

    return sendSuccess(res, {
      status: job.status,
      fileUrl: job.fileUrl,
    });
  } catch (error) {
    logger.error('Error checking export status:', error);
    return sendError(res, 'Failed to check export status');
  }
});

// Export workflow
router.get('/workflows/:id/export', isAuthenticated, exportLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { includeMetadata } = req.query;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
        metadata: includeMetadata === 'true',
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if user has access to this workflow
    if (workflow.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Log export event
    await auditLog({
      type: 'EXPORT',
      userId: req.user!.id,
      orgId: req.user!.orgId,
      metadata: {
        workflowId: id,
        includeMetadata: includeMetadata === 'true',
      },
    });

    res.json({
      workflow: {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      ...(includeMetadata === 'true' && {
        metadata: workflow.metadata,
        thumbnail: workflow.thumbnail,
      }),
    });
  } catch (error) {
    console.error('Error exporting workflow:', error);
    res.status(500).json({ error: 'Failed to export workflow' });
  }
});

// Export analytics
router.get('/analytics/export', isAuthenticated, exportLimiter, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateRange = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse({ from, to });

    let analytics;
    if (req.user!.isAdmin) {
      // Admin gets global analytics
      analytics = await prisma.$transaction([
        prisma.workflowExecution.groupBy({
          by: ['status'],
          _count: true,
          where: {
            createdAt: {
              gte: dateRange.from ? new Date(dateRange.from) : undefined,
              lte: dateRange.to ? new Date(dateRange.to) : undefined,
            },
          },
        }),
        prisma.user.groupBy({
          by: ['plan'],
          _count: true,
        }),
        prisma.workflowExecution.findMany({
          where: {
            createdAt: {
              gte: dateRange.from ? new Date(dateRange.from) : undefined,
              lte: dateRange.to ? new Date(dateRange.to) : undefined,
            },
          },
          include: {
            workflow: true,
          },
        }),
      ]);
    } else {
      // Regular users get org-specific analytics
      analytics = await prisma.$transaction([
        prisma.workflowExecution.groupBy({
          by: ['status'],
          _count: true,
          where: {
            workflow: {
              orgId: req.user!.orgId,
            },
            createdAt: {
              gte: dateRange.from ? new Date(dateRange.from) : undefined,
              lte: dateRange.to ? new Date(dateRange.to) : undefined,
            },
          },
        }),
        prisma.workflowExecution.findMany({
          where: {
            workflow: {
              orgId: req.user!.orgId,
            },
            createdAt: {
              gte: dateRange.from ? new Date(dateRange.from) : undefined,
              lte: dateRange.to ? new Date(dateRange.to) : undefined,
            },
          },
          include: {
            workflow: true,
          },
        }),
      ]);
    }

    // Log export event
    await auditLog({
      type: 'EXPORT',
      userId: req.user!.id,
      orgId: req.user!.orgId,
      metadata: {
        type: 'analytics',
        dateRange,
      },
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Export billing history
router.get('/billing/history', isAuthenticated, exportLimiter, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateRange = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse({ from, to });

    // Get customer ID from user's org
    const org = await prisma.organization.findUnique({
      where: { id: req.user!.orgId },
      select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
      return res.status(404).json({ error: 'No billing history found' });
    }

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      created: {
        gte: dateRange.from ? new Date(dateRange.from).getTime() / 1000 : undefined,
        lte: dateRange.to ? new Date(dateRange.to).getTime() / 1000 : undefined,
      },
    });

    // Get subscription history
    const subscriptions = await stripe.subscriptions.list({
      customer: org.stripeCustomerId,
      created: {
        gte: dateRange.from ? new Date(dateRange.from).getTime() / 1000 : undefined,
        lte: dateRange.to ? new Date(dateRange.to).getTime() / 1000 : undefined,
      },
    });

    // Log export event
    await auditLog({
      type: 'EXPORT',
      userId: req.user!.id,
      orgId: req.user!.orgId,
      metadata: {
        type: 'billing',
        dateRange,
      },
    });

    res.json({
      invoices: invoices.data,
      subscriptions: subscriptions.data,
    });
  } catch (error) {
    console.error('Error exporting billing history:', error);
    res.status(500).json({ error: 'Failed to export billing history' });
  }
});

// Get templates with filtering and search
router.get('/templates', isAuthenticated, async (req, res) => {
  try {
    const { 
      category,
      type,
      search,
      tags,
      format,
      version,
    } = req.query;

    let templates = await prisma.exportTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdBy: req.user!.id },
          { orgId: req.user!.orgId },
        ],
        ...(category && { category: category as string }),
        ...(type && { type: type as string }),
        ...(format && { format: format as string }),
        ...(version && { version: parseInt(version as string) }),
        ...(tags && {
          tags: {
            hasSome: (tags as string).split(','),
          },
        }),
      },
    });

    // Apply search if provided
    if (search) {
      const searchTerms = (search as string).toLowerCase().split(' ');
      templates = templates.filter(template => {
        const searchableText = [
          template.name,
          template.description,
          template.category,
          template.type,
          ...(template.tags || []),
        ].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    return sendSuccess(res, templates);
  } catch (error) {
    logger.error('Error fetching export templates:', error);
    return sendError(res, 'Failed to fetch export templates');
  }
});

// Get template versions
router.get('/templates/:templateId/versions', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const versions = await prisma.exportTemplate.findMany({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { createdBy: req.user!.id },
          { orgId: req.user!.orgId },
        ],
      },
      select: {
        version: true,
        updatedAt: true,
        createdBy: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return sendSuccess(res, versions);
  } catch (error) {
    logger.error('Error fetching template versions:', error);
    return sendError(res, 'Failed to fetch template versions');
  }
});

// Create template version
router.post('/templates/:templateId/versions', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const templateData = exportTemplateSchema.parse(req.body);

    // Get latest version
    const latestVersion = await prisma.exportTemplate.findFirst({
      where: { id: templateId },
      orderBy: { version: 'desc' },
    });

    if (!latestVersion) {
      return sendError(res, 'Template not found', 404);
    }

    // Create new version
    const newVersion = await prisma.exportTemplate.create({
      data: {
        ...templateData,
        id: templateId,
        version: latestVersion.version + 1,
        createdBy: req.user!.id,
        orgId: req.user!.orgId,
      },
    });

    return sendSuccess(res, newVersion);
  } catch (error) {
    logger.error('Error creating template version:', error);
    return sendError(res, 'Failed to create template version');
  }
});

// Get template by version
router.get('/templates/:templateId/versions/:version', isAuthenticated, async (req, res) => {
  try {
    const { templateId, version } = req.params;
    const template = await prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        version: parseInt(version),
        OR: [
          { isPublic: true },
          { createdBy: req.user!.id },
          { orgId: req.user!.orgId },
        ],
      },
    });

    if (!template) {
      return sendError(res, 'Template version not found', 404);
    }

    return sendSuccess(res, template);
  } catch (error) {
    logger.error('Error fetching template version:', error);
    return sendError(res, 'Failed to fetch template version');
  }
});

// Rollback to previous version
router.post('/templates/:templateId/rollback/:version', isAuthenticated, async (req, res) => {
  try {
    const { templateId, version } = req.params;
    const targetVersion = await prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        version: parseInt(version),
        OR: [
          { isPublic: true },
          { createdBy: req.user!.id },
          { orgId: req.user!.orgId },
        ],
      },
    });

    if (!targetVersion) {
      return sendError(res, 'Template version not found', 404);
    }

    // Create new version with target version's data
    const newVersion = await prisma.exportTemplate.create({
      data: {
        ...targetVersion,
        version: targetVersion.version + 1,
        createdBy: req.user!.id,
        orgId: req.user!.orgId,
      },
    });

    return sendSuccess(res, newVersion);
  } catch (error) {
    logger.error('Error rolling back template version:', error);
    return sendError(res, 'Failed to rollback template version');
  }
});

// Schedule template-based export
router.post('/schedule-template/:templateId', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { dateRange, filters } = req.body;

    const template = await prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { createdBy: req.user!.id },
          { orgId: req.user!.orgId },
        ],
      },
    });

    if (!template) {
      return sendError(res, 'Template not found', 404);
    }

    // Create export job
    const job = await prisma.exportJob.create({
      data: {
        userId: req.user!.id,
        type: template.type,
        status: 'pending',
        format: template.format,
        metadata: {
          templateId,
          dateRange,
          filters,
        },
      },
    });

    // Add to queue
    await exportQueue.add(
      {
        userId: req.user!.id,
        options: {
          format: template.format,
          type: template.type,
          dateRange,
          filters,
          templateId,
        },
      },
      { jobId: job.id }
    );

    return sendSuccess(res, { jobId: job.id });
  } catch (error) {
    logger.error('Error scheduling template export:', error);
    return sendError(res, 'Failed to schedule template export');
  }
});

// Helper functions
async function getWorkflowData(userId: string, dateRange?: [Date, Date]) {
  const where = {
    userId,
    ...(dateRange && {
      createdAt: {
        gte: dateRange[0],
        lte: dateRange[1],
      },
    }),
  };

  return prisma.workflow.findMany({
    where,
    include: {
      executions: true,
    },
  });
}

async function getAnalyticsData(userId: string, dateRange?: [Date, Date]) {
  const where = {
    userId,
    ...(dateRange && {
      createdAt: {
        gte: dateRange[0],
        lte: dateRange[1],
      },
    }),
  };

  return prisma.executionLog.findMany({
    where,
    include: {
      workflow: true,
    },
  });
}

async function getBillingData(userId: string, dateRange?: [Date, Date]) {
  const where = {
    userId,
    ...(dateRange && {
      createdAt: {
        gte: dateRange[0],
        lte: dateRange[1],
      },
    }),
  };

  return prisma.billingHistory.findMany({
    where,
    include: {
      subscription: true,
    },
  });
}

function applyTemplate(data: any[], template: any) {
  return data.map(item => {
    const filtered: Record<string, any> = {};
    template.fields.forEach((field: string) => {
      filtered[field] = item[field];
    });
    return filtered;
  });
}

async function generateCSV(data: any[], filename: string) {
  const filePath = `/tmp/${filename}.csv`;
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: Object.keys(data[0]).map(key => ({ id: key, title: key })),
  });

  await csvWriter.writeRecords(data);
  return filePath;
}

async function generateExcel(data: any[], filename: string) {
  const filePath = `/tmp/${filename}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers
  worksheet.addRow(Object.keys(data[0]));

  // Add data
  data.forEach(item => {
    worksheet.addRow(Object.values(item));
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

async function generatePDF(data: any[], filename: string) {
  const filePath = `/tmp/${filename}.pdf`;
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  // Add title
  doc.fontSize(16).text('Export Report', { align: 'center' });
  doc.moveDown();

  // Add table
  const table = {
    headers: Object.keys(data[0]),
    rows: data.map(item => Object.values(item)),
  };

  doc.table(table, {
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
    prepareRow: () => doc.font('Helvetica').fontSize(10),
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function generateJSON(data: any[], filename: string) {
  const filePath = `/tmp/${filename}.json`;
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

function getContentType(format: string) {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

export default router; 