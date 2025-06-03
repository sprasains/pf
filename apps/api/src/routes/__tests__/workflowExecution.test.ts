import request from 'supertest';
import express from 'express';
import { WorkflowExecutionService } from '../../services/workflowExecution';
import workflowExecutionRoutes from '../workflowExecution';

jest.mock('../../services/workflowExecution');
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => next()
}));

describe('Workflow Execution Routes', () => {
  let app: express.Application;
  let workflowExecutionService: jest.Mocked<WorkflowExecutionService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/workflow', workflowExecutionRoutes);

    workflowExecutionService = new WorkflowExecutionService({} as any) as jest.Mocked<WorkflowExecutionService>;
  });

  describe('POST /workflow/workflows/:id/start', () => {
    it('should start a workflow successfully', async () => {
      workflowExecutionService.startWorkflow.mockResolvedValue();

      const response = await request(app)
        .post('/workflow/workflows/1/start')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Workflow started successfully'
      });
      expect(workflowExecutionService.startWorkflow).toHaveBeenCalledWith('1');
    });

    it('should handle errors', async () => {
      workflowExecutionService.startWorkflow.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .post('/workflow/workflows/1/start')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Test error'
      });
    });
  });

  describe('POST /workflow/workflows/:id/stop', () => {
    it('should stop a workflow successfully', async () => {
      workflowExecutionService.stopWorkflow.mockResolvedValue();

      const response = await request(app)
        .post('/workflow/workflows/1/stop')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Workflow stopped successfully'
      });
      expect(workflowExecutionService.stopWorkflow).toHaveBeenCalledWith('1');
    });

    it('should handle errors', async () => {
      workflowExecutionService.stopWorkflow.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .post('/workflow/workflows/1/stop')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Test error'
      });
    });
  });

  describe('GET /workflow/workflows/:id/status', () => {
    it('should get workflow status successfully', async () => {
      const mockStatus = {
        isActive: true,
        lastRun: new Date(),
        nextRun: new Date()
      };

      workflowExecutionService.getWorkflowStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/workflow/workflows/1/status')
        .expect(200);

      expect(response.body).toEqual(mockStatus);
      expect(workflowExecutionService.getWorkflowStatus).toHaveBeenCalledWith('1');
    });

    it('should handle errors', async () => {
      workflowExecutionService.getWorkflowStatus.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/workflow/workflows/1/status')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Test error'
      });
    });
  });

  describe('GET /workflow/workflows/:id/logs', () => {
    it('should get workflow logs successfully', async () => {
      const mockLogs = {
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Test log'
          }
        ]
      };

      workflowExecutionService.getWorkflowLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/workflow/workflows/1/logs')
        .expect(200);

      expect(response.body).toEqual(mockLogs);
      expect(workflowExecutionService.getWorkflowLogs).toHaveBeenCalledWith('1');
    });

    it('should handle errors', async () => {
      workflowExecutionService.getWorkflowLogs.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/workflow/workflows/1/logs')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Test error'
      });
    });
  });
}); 