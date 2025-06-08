import request from 'supertest';
import app from '../src/index';

describe('Admin Routes', () => {
  it('GET /api/health - should return 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('Protected route should 401 without token', async () => {
    const res = await request(app).get('/api/admin/protected');
    expect(res.statusCode).toBe(401);
  });

  // Add more once token strategy is active
});
