/// <reference path="../types/custom.d.ts" />
import express from 'express';
import { PrismaClient, TemplateVersionStatus } from '@prisma/client';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const router = express.Router();

// SemVer validation regex
const semverRegex = /^(\d+)\.(\d+)\.(\d+)(-[\w]+)?$/;

// Validation schemas
const versionCreateSchema = z.object({
  version: z.string().regex(semverRegex, 'Invalid version format. Use MAJOR.MINOR.PATCH[-TAG].'),
  changeNotes: z.string().min(1, 'Change notes are required'),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(TemplateVersionStatus).default(TemplateVersionStatus.DRAFT),
  schema: z.record(z.any()),
  performanceNotes: z.string().optional(),
});

const versionUpdateSchema = z.object({
  changeNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(TemplateVersionStatus).optional(),
  performanceNotes: z.string().optional(),
  validationResults: z.record(z.any()).optional(),
  usageStats: z.record(z.any()).optional(),
});

// List all templates with optional filtering
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { category, type, search, tags, status } = req.query;

    const templates = await prisma.exportTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdBy: req.user.id },
          { orgId: req.user.orgId },
        ],
        ...(category && { category: category as string }),
        ...(type && { type: type as string }),
        ...(tags && {
          tags: {
            hasSome: (tags as string).split(','),
          },
        }),
      },
      include: {
        versions: {
          where: status ? { status: status as TemplateVersionStatus } : undefined,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Apply search if provided
    if (search) {
      const searchTerms = (search as string).toLowerCase().split(' ');
      const filteredTemplates = templates.filter(template => {
        const searchableText = [
          template.name,
          template.description,
          template.category,
          template.type,
          ...(template.tags || []),
        ].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
      return sendSuccess(res, filteredTemplates);
    }

    return sendSuccess(res, templates);
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return sendError(res, 'Failed to fetch templates');
  }
});

// Create new version
router.post('/:templateId/versions', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const versionData = versionCreateSchema.parse(req.body);

    // Check if template exists and user has access
    const template = await prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { createdBy: req.user.id },
          { orgId: req.user.orgId },
        ],
      },
    });

    if (!template) {
      return sendError(res, 'Template not found or access denied', 404);
    }

    // Check if version already exists
    const exists = await prisma.exportTemplateVersion.findFirst({
      where: { templateId, version: versionData.version },
    });

    if (exists) {
      return sendError(res, 'Version already exists for this template', 409);
    }

    // Create new version
    const newVersion = await prisma.exportTemplateVersion.create({
      data: {
        ...versionData,
        templateId,
        createdBy: req.user.id,
        createdByEmail: req.user.email,
      },
    });

    // If this is the first version or explicitly set as current, update template
    if (versionData.status === TemplateVersionStatus.RELEASED) {
      await prisma.exportTemplate.update({
        where: { id: templateId },
        data: { currentVersion: newVersion.version },
      });
    }

    return sendSuccess(res, newVersion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.errors);
    }
    logger.error('Error creating template version:', error);
    return sendError(res, 'Failed to create template version');
  }
});

// List versions of a template
router.get('/:templateId/versions', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if template exists and user has access
    const template = await prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { createdBy: req.user.id },
          { orgId: req.user.orgId },
        ],
      },
    });

    if (!template) {
      return sendError(res, 'Template not found or access denied', 404);
    }

    const versions = await prisma.exportTemplateVersion.findMany({
      where: {
        templateId,
        ...(status && { status: status as TemplateVersionStatus }),
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, versions);
  } catch (error) {
    logger.error('Error fetching template versions:', error);
    return sendError(res, 'Failed to fetch template versions');
  }
});

// Update version metadata
router.patch('/versions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = versionUpdateSchema.parse(req.body);

    // Check if version exists and user has access
    const version = await prisma.exportTemplateVersion.findFirst({
      where: {
        id,
        OR: [
          { template: { isPublic: true } },
          { createdBy: req.user.id },
          { template: { orgId: req.user.orgId } },
        ],
      },
    });

    if (!version) {
      return sendError(res, 'Version not found or access denied', 404);
    }

    // If updating status to RELEASED, update template's current version
    if (updates.status === TemplateVersionStatus.RELEASED) {
      await prisma.exportTemplate.update({
        where: { id: version.templateId },
        data: { currentVersion: version.version },
      });
    }

    const updated = await prisma.exportTemplateVersion.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.errors);
    }
    logger.error('Error updating template version:', error);
    return sendError(res, 'Failed to update template version');
  }
});

// Compare two versions
router.get('/versions/:id/compare/:otherId', isAuthenticated, async (req, res) => {
  try {
    const { id, otherId } = req.params;

    const [version1, version2] = await Promise.all([
      prisma.exportTemplateVersion.findFirst({
        where: {
          id,
          OR: [
            { template: { isPublic: true } },
            { createdBy: req.user.id },
            { template: { orgId: req.user.orgId } },
          ],
        },
      }),
      prisma.exportTemplateVersion.findFirst({
        where: {
          id: otherId,
          OR: [
            { template: { isPublic: true } },
            { createdBy: req.user.id },
            { template: { orgId: req.user.orgId } },
          ],
        },
      }),
    ]);

    if (!version1 || !version2) {
      return sendError(res, 'One or both versions not found or access denied', 404);
    }

    if (version1.templateId !== version2.templateId) {
      return sendError(res, 'Cannot compare versions from different templates', 400);
    }

    // Compare schemas and return differences
    const diff = {
      version1: version1.version,
      version2: version2.version,
      changes: {
        schema: compareSchemas(version1.schema, version2.schema),
        metadata: {
          changeNotes: version2.changeNotes,
          performanceNotes: version2.performanceNotes,
          tags: version2.tags,
        },
      },
    };

    return sendSuccess(res, diff);
  } catch (error) {
    logger.error('Error comparing template versions:', error);
    return sendError(res, 'Failed to compare template versions');
  }
});

// Helper function to compare schemas
function compareSchemas(schema1: any, schema2: any) {
  const changes: Record<string, any> = {};
  
  // Compare fields
  const fields1 = new Set(Object.keys(schema1));
  const fields2 = new Set(Object.keys(schema2));
  
  // Added fields
  changes.added = Array.from(fields2).filter(field => !fields1.has(field));
  
  // Removed fields
  changes.removed = Array.from(fields1).filter(field => !fields2.has(field));
  
  // Modified fields
  changes.modified = Array.from(fields1)
    .filter(field => fields2.has(field))
    .filter(field => JSON.stringify(schema1[field]) !== JSON.stringify(schema2[field]))
    .map(field => ({
      field,
      oldValue: schema1[field],
      newValue: schema2[field],
    }));

  return changes;
}

export default router; 