import { Router } from 'express';
import { WorkflowExecutionService } from '../services/workflowExecution';
import { authenticate } from '../middleware/auth';

const router = Router();
const workflowExecutionService = new WorkflowExecutionService(prisma);

router.post('/workflows/:id/start', authenticate, async (req, res) => {
  try {
    await workflowExecutionService.startWorkflow(req.params.id);
    res.status(200).json({ message: 'Workflow started successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:id/stop', authenticate, async (req, res) => {
  try {
    await workflowExecutionService.stopWorkflow(req.params.id);
    res.status(200).json({ message: 'Workflow stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows/:id/status', authenticate, async (req, res) => {
  try {
    const status = await workflowExecutionService.getWorkflowStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows/:id/logs', authenticate, async (req, res) => {
  try {
    const logs = await workflowExecutionService.getWorkflowLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 