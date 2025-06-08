import request from 'supertest';
import express from 'express';
import integrationRoutes from '../integration';
import { IntegrationService } from '../../services/integration';
import { isAuthenticated } from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/validation';

jest.mock('../../services/integration');
jest.mock('../../middleware/authMiddleware');
jest.mock('../../middleware/validation');

describe('Integration Routes', () => {
  let app: express.Application;

  const mockUser = {
    id: 'user123',
    orgId: 'org123'
  };

  const mockCredential = {
    id: 'cred123',
    userId: mockUser.id,
    orgId: mockUser.orgId,
    provider: 'google',
    credentials: { apiKey: 'test-key' },
    label: 'Test Integration',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/integrations', integrationRoutes);

    (isAuthenticated as jest.Mock).mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    (validateRequest as jest.Mock).mockImplementation((schema) => (req, res, next) => {
      next();
    });

    jest.clearAllMocks();
  });

  describe('POST /api/integrations/credentials', () => {
    it('should create credential successfully', async () => {
      (IntegrationService.createCredential as jest.Mock).mockResolvedValueOnce(mockCredential);

      const response = await request(app)
        .post('/api/integrations/credentials')
        .send({
          provider: 'google',
          credentials: { apiKey: 'test-key' },
          label: 'Test Integration'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCredential);
      expect(IntegrationService.createCredential).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.orgId,
        'google',
        { apiKey: 'test-key' },
        'Test Integration'
      );
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      (IntegrationService.createCredential as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/api/integrations/credentials')
        .send({
          provider: 'google',
          credentials: { apiKey: 'test-key' },
          label: 'Test Integration'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/integrations/credentials/:id', () => {
    it('should get credential successfully', async () => {
      (IntegrationService.getCredential as jest.Mock).mockResolvedValueOnce(mockCredential);

      const response = await request(app)
        .get('/api/integrations/credentials/cred123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCredential);
      expect(IntegrationService.getCredential).toHaveBeenCalledWith(
        'cred123',
        mockUser.id,
        mockUser.orgId
      );
    });

    it('should handle not found credential', async () => {
      const error = new Error('Credential not found');
      (IntegrationService.getCredential as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .get('/api/integrations/credentials/cred123');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/integrations/credentials', () => {
    it('should list credentials successfully', async () => {
      (IntegrationService.listCredentials as jest.Mock).mockResolvedValueOnce([mockCredential]);

      const response = await request(app)
        .get('/api/integrations/credentials');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockCredential]);
      expect(IntegrationService.listCredentials).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.orgId,
        undefined
      );
    });

    it('should filter by provider', async () => {
      await request(app)
        .get('/api/integrations/credentials?provider=google');

      expect(IntegrationService.listCredentials).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.orgId,
        'google'
      );
    });
  });

  describe('PATCH /api/integrations/credentials/:id', () => {
    it('should update credential successfully', async () => {
      const updatedCredential = {
        ...mockCredential,
        label: 'Updated Label'
      };

      (IntegrationService.updateCredential as jest.Mock).mockResolvedValueOnce(updatedCredential);

      const response = await request(app)
        .patch('/api/integrations/credentials/cred123')
        .send({
          label: 'Updated Label'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedCredential);
      expect(IntegrationService.updateCredential).toHaveBeenCalledWith(
        'cred123',
        mockUser.id,
        mockUser.orgId,
        { label: 'Updated Label' }
      );
    });

    it('should handle not found credential', async () => {
      const error = new Error('Credential not found');
      (IntegrationService.updateCredential as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .patch('/api/integrations/credentials/cred123')
        .send({
          label: 'Updated Label'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/integrations/credentials/:id', () => {
    it('should delete credential successfully', async () => {
      (IntegrationService.deleteCredential as jest.Mock).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/api/integrations/credentials/cred123');

      expect(response.status).toBe(204);
      expect(IntegrationService.deleteCredential).toHaveBeenCalledWith(
        'cred123',
        mockUser.id,
        mockUser.orgId
      );
    });

    it('should handle not found credential', async () => {
      const error = new Error('Credential not found');
      (IntegrationService.deleteCredential as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .delete('/api/integrations/credentials/cred123');

      expect(response.status).toBe(404);
    });
  });
}); 