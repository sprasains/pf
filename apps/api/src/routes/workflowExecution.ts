import { Router } from 'express';
import { WorkflowExecutionService } from '../services/workflowExecution';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();
const workflowExecutionService = new WorkflowExecutionService(prisma);

router.post('/workflows/:id/start', isAuthenticated, async (req, res) => {
  try {
    await workflowExecutionService.startWorkflow(req.params.id);
    res.status(200).json({ message: 'Workflow started successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/workflows/:id/stop', isAuthenticated, async (req, res) => {
  try {
    await workflowExecutionService.stopWorkflow(req.params.id);
    res.status(200).json({ message: 'Workflow stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/workflows/:id/status', isAuthenticated, async (req, res) => {
  try {
    const status = await workflowExecutionService.getWorkflowStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/workflows/:id/logs', isAuthenticated, async (req, res) => {
  try {
    const logs = await workflowExecutionService.getWorkflowLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router; 