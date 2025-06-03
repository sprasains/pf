import { Router } from 'express';
import { body } from 'express-validator';
import { WorkflowTemplateService } from '../services/workflowTemplate';
import { validateRequest } from '../middleware/validateRequest';
import { isAuthenticated } from '../middleware/auth';
import { WorkflowService } from '../services/workflowService';
import { z } from 'zod';

const router = Router();
const templateService = new WorkflowTemplateService();

/**
 * @swagger
 * /api/workflow-templates:
 *   get:
 *     summary: Get all workflow templates
 *     tags: [Workflow Templates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [prebuilt, user]
 *         description: Filter templates by type
 *     responses:
 *       200:
 *         description: List of workflow templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkflowTemplate'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const type = req.query.type as 'prebuilt' | 'user';
    const templates = await templateService.getTemplates(type);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * @swagger
 * /api/workflow-templates/{id}:
 *   get:
 *     summary: Get a workflow template by ID
 *     tags: [Workflow Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow template details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowTemplate'
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * @swagger
 * /api/workflow-templates/promote/{instanceId}:
 *   post:
 *     summary: Promote a workflow instance to a template
 *     tags: [Workflow Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowTemplate'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/promote/:instanceId',
  isAuthenticated,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('thumbnail').optional().isURL().withMessage('Thumbnail must be a valid URL'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { name, description, thumbnail } = req.body;

      const template = await templateService.promoteInstanceToTemplate(instanceId, {
        name,
        description,
        thumbnail,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error promoting instance to template:', error);
      res.status(500).json({ error: 'Failed to promote instance to template' });
    }
  }
);

/**
 * @swagger
 * /api/workflow-templates/{id}/install:
 *   post:
 *     summary: Install a workflow template to the user's workspace
 *     tags: [Workflow Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Workflow installed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/install',
  isAuthenticated,
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  async (req, res) => {
    try {
      const templateId = req.params.id;
      const userId = req.user!.id;
      const orgId = req.user!.orgId;

      // 1. Get template details including workflow schema
      const template = await templateService.getTemplateById(templateId);

      if (!template || !template.workflowId) {
        return res.status(404).json({ error: 'Template not found or invalid' });
      }

      // Assuming template.workflowId links to a workflow with a current version containing jsonSchema
      // You might need to fetch the actual workflow or workflow version here
      // For now, let's assume template.workflow.currentVersion.jsonSchema holds the definition

      // Placeholder for fetching the actual workflow definition from the linked workflow
       const workflowToClone = await WorkflowService.getWorkflowById(template.workflowId);

       if (!workflowToClone || !workflowToClone.currentVersion) {
           return res.status(500).json({ error: 'Could not retrieve workflow definition from template' });
       }

      // 2. Create a new workflow instance for the user's organization
      const newWorkflow = await WorkflowService.createWorkflow(
        orgId,
        userId,
        {
          name: `${template.name} (Copy)`,
          description: template.description || '',
          jsonSchema: workflowToClone.currentVersion.jsonSchema as any, // Cast to any for now, refine schema later
        }
      );

      // 3. Return the newly created workflow instance
      res.status(201).json(newWorkflow);
    } catch (error) {
      console.error('Error installing template:', error);
      res.status(500).json({ error: 'Failed to install template' });
    }
  }
);

export default router; 