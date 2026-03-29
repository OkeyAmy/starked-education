/**
 * Test Setup
 * Global test setup and configuration
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test database configuration
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.STELLAR_DISTRIBUTION_ACCOUNT = 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set up test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to create test users
  createTestUser: async (overrides = {}) => {
    const defaultUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      username: 'testuser',
      role: 'student',
      ...overrides
    };
    return defaultUser;
  },

  // Helper to create test courses
  createTestCourse: async (overrides = {}) => {
    const defaultCourse = {
      title: 'Test Course',
      description: 'A test course',
      price: 99.99,
      metadata: {
        level: 'beginner',
        duration: 40,
        maxStudents: 100,
        isPublished: true
      },
      ...overrides
    };
    return defaultCourse;
  },

  // Helper to create test enrollment
  createTestEnrollment: async (overrides = {}) => {
    const defaultEnrollment = {
      userId: 'test-user-id',
      courseId: 'test-course-id',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'stellar',
      amountPaid: 0,
      totalAmount: 99.99,
      currency: 'USD',
      ...overrides
    };
    return defaultEnrollment;
  },

  // Helper to generate test Stellar addresses
  generateTestStellarAddress: () => {
    return 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q';
  },

  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random strings
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

// Mock external services
jest.mock('../src/services/StellarPaymentService', () => ({
  StellarPaymentService: jest.fn().mockImplementation(() => ({
    validatePaymentParameters: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    createPaymentTransaction: jest.fn().mockResolvedValue({
      transactionXDR: 'mock-transaction-xdr',
      paymentId: 'mock-payment-id'
    }),
    submitTransaction: jest.fn().mockResolvedValue({
      transactionHash: 'mock-transaction-hash',
      amount: '100',
      assetCode: 'XLM'
    }),
    checkAccountExists: jest.fn().mockResolvedValue(true),
    getAccountBalance: jest.fn().mockResolvedValue([
      { asset: 'XLM', balance: '1000.0000000' }
    ]),
    getSupportedAssets: jest.fn().mockReturnValue([
      { code: 'XLM', name: 'Stellar Lumens', decimals: 7 }
    ])
  }))
}));

// Mock database connections
jest.mock('../src/config/database', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true)
}));

// Set up global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Clean up after all tests
afterAll(async () => {
  // Clean up any test data
  // Close database connections
  // Clear any mocks
  jest.clearAllMocks();
});

// Reset modules before each test
beforeEach(() => {
  jest.clearAllMocks();
});
