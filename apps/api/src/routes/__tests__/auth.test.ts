import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';
import { logger } from '../../utils/logger';

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Mock Prisma responses
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: userData.email,
        name: userData.name,
        role: 'USER',
        orgId: '1',
        tenantId: '1',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('name', userData.name);
    });

    it('should return 400 if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      // Mock Prisma to return an existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: userData.email,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: '', // Empty name
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid input');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock Passport local strategy
      jest.spyOn(require('passport'), 'authenticate').mockImplementation((strategy, callback) => {
        callback(null, {
          id: '1',
          email: loginData.email,
          name: 'Test User',
          role: 'USER',
          orgId: '1',
          tenantId: '1',
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user).toHaveProperty('email', loginData.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock Passport local strategy to fail
      jest.spyOn(require('passport'), 'authenticate').mockImplementation((strategy, callback) => {
        callback(null, false, { message: 'Invalid credentials' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data when authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        orgId: '1',
        tenantId: '1',
      };

      // Mock authentication
      jest.spyOn(require('express-session'), 'Session').mockImplementation(() => ({
        user: mockUser,
      }));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['connect.sid=test-session']);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should return 401 when not authenticated', async () => {
      // Mock no authentication
      jest.spyOn(require('express-session'), 'Session').mockImplementation(() => ({
        user: null,
      }));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['connect.sid=test-session']);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['connect.sid=test-session']);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
}); 