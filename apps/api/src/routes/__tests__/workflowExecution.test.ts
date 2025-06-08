import request from 'supertest';
import express from 'express';
import { WorkflowExecutionService } from '../../services/workflowExecution';

jest.mock('../../middleware/authMiddleware', () => ({
  isAuthenticated: (_req: any, _res: any, next: any) => next()
}));

describe('Workflow Execution Routes', () => {
  let app: express.Application;
  let router: express.Router;
  let startSpy: jest.SpyInstance;
  let stopSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;
  let logsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    startSpy = jest
      .spyOn(WorkflowExecutionService.prototype, 'startWorkflow')
      .mockResolvedValue(undefined as any);
    stopSpy = jest
      .spyOn(WorkflowExecutionService.prototype, 'stopWorkflow')
      .mockResolvedValue(undefined as any);
    statusSpy = jest
      .spyOn(WorkflowExecutionService.prototype, 'getWorkflowStatus')
      .mockResolvedValue({} as any);
    logsSpy = jest
      .spyOn(WorkflowExecutionService.prototype, 'getWorkflowLogs')
      .mockResolvedValue({} as any);

    router = require('../workflowExecution').default;
    app = express();
    app.use(express.json());
    app.use('/workflow', router);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /workflow/workflows/:id/start', () => {
    it('starts a workflow successfully', async () => {
      const response = await request(app)
        .post('/workflow/workflows/1/start')
        .expect(200);

      expect(response.body).toEqual({ message: 'Workflow started successfully' });
      expect(startSpy).toHaveBeenCalledWith('1');
    });

    it('handles errors', async () => {
      startSpy.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .post('/workflow/workflows/1/start')
        .expect(500);

      expect(response.body).toEqual({ error: 'Test error' });
    });
  });

  describe('POST /workflow/workflows/:id/stop', () => {
    it('stops a workflow successfully', async () => {
      const response = await request(app)
        .post('/workflow/workflows/1/stop')
        .expect(200);

      expect(response.body).toEqual({ message: 'Workflow stopped successfully' });
      expect(stopSpy).toHaveBeenCalledWith('1');
    });

    it('handles errors', async () => {
      stopSpy.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .post('/workflow/workflows/1/stop')
        .expect(500);

      expect(response.body).toEqual({ error: 'Test error' });
    });
  });

  describe('GET /workflow/workflows/:id/status', () => {
    it('gets workflow status successfully', async () => {
      const mockStatus = {
        isActive: true,
        lastRun: new Date(),
        nextRun: new Date()
      };
      statusSpy.mockResolvedValueOnce(mockStatus);

      const response = await request(app)
        .get('/workflow/workflows/1/status')
        .expect(200);

      expect(response.body).toEqual(mockStatus);
      expect(statusSpy).toHaveBeenCalledWith('1');
    });

    it('handles errors', async () => {
      statusSpy.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .get('/workflow/workflows/1/status')
        .expect(500);

      expect(response.body).toEqual({ error: 'Test error' });
    });
  });

  describe('GET /workflow/workflows/:id/logs', () => {
    it('gets workflow logs successfully', async () => {
      const mockLogs = {
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Test log'
          }
        ]
      };
      logsSpy.mockResolvedValueOnce(mockLogs);

      const response = await request(app)
        .get('/workflow/workflows/1/logs')
        .expect(200);

      expect(response.body).toEqual(mockLogs);
      expect(logsSpy).toHaveBeenCalledWith('1');
    });

    it('handles errors', async () => {
      logsSpy.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .get('/workflow/workflows/1/logs')
        .expect(500);

      expect(response.body).toEqual({ error: 'Test error' });
    });
  });
});
