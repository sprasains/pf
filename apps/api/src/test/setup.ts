import '@types/jest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Increase timeout for tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
}); 