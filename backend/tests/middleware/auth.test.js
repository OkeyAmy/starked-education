const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ipfsAuth, optionalIpfsAuth, verifyToken, hasPermission, checkRateLimit } = require('../../src/middleware/ipfsAuth');
const { createIpfsError } = require('../../src/utils/ipfsUtils');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
      file: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    
    // Reset global rate limit
    global.ipfsRateLimit = {};
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const payload = { userId: 'test-user', role: 'student' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      const result = verifyToken(token);
      
      expect(result.userId).toBe(payload.userId);
      expect(result.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const payload = { userId: 'test-user', role: 'student' };
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });
      
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe('hasPermission', () => {
    it('should grant admin users all permissions', () => {
      const adminUser = { role: 'admin', id: 'admin-1' };
      
      expect(hasPermission(adminUser, 'upload')).toBe(true);
      expect(hasPermission(adminUser, 'download')).toBe(true);
      expect(hasPermission(adminUser, 'pin')).toBe(true);
    });

    it('should grant instructors upload, download, and pin permissions', () => {
      const instructorUser = { role: 'instructor', id: 'instructor-1' };
      
      expect(hasPermission(instructorUser, 'upload')).toBe(true);
      expect(hasPermission(instructorUser, 'download')).toBe(true);
      expect(hasPermission(instructorUser, 'pin')).toBe(true);
    });

    it('should grant students download permissions only', () => {
      const studentUser = { role: 'student', id: 'student-1' };
      
      expect(hasPermission(studentUser, 'upload')).toBe(false);
      expect(hasPermission(studentUser, 'download')).toBe(true);
      expect(hasPermission(studentUser, 'pin')).toBe(false);
    });

    it('should grant guests download permissions only', () => {
      const guestUser = { role: 'guest', id: 'guest-1' };
      
      expect(hasPermission(guestUser, 'upload')).toBe(false);
      expect(hasPermission(guestUser, 'download')).toBe(true);
      expect(hasPermission(guestUser, 'pin')).toBe(false);
    });

    it('should deny unknown roles all permissions', () => {
      const unknownUser = { role: 'unknown', id: 'unknown-1' };
      
      expect(hasPermission(unknownUser, 'upload')).toBe(false);
      expect(hasPermission(unknownUser, 'download')).toBe(false);
      expect(hasPermission(unknownUser, 'pin')).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      global.ipfsRateLimit = {};
    });

    it('should allow operations within rate limits', () => {
      const studentUser = { role: 'student', id: 'student-1' };
      
      expect(() => checkRateLimit(studentUser, 'download')).not.toThrow();
      expect(global.ipfsRateLimit['student-1:download']).toBe(1);
    });

    it('should throw error when rate limit exceeded', () => {
      const guestUser = { role: 'guest', id: 'guest-1' };
      
      // Guest users have 5 uploads per hour limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(guestUser, 'upload');
      }
      
      expect(() => checkRateLimit(guestUser, 'upload')).toThrow('Rate limit exceeded');
    });

    it('should handle different rate limits for different roles', () => {
      const instructorUser = { role: 'instructor', id: 'instructor-1' };
      const studentUser = { role: 'student', id: 'student-1' };
      
      // Instructors can upload 50 times per hour
      for (let i = 0; i < 50; i++) {
        checkRateLimit(instructorUser, 'upload');
      }
      
      expect(() => checkRateLimit(instructorUser, 'upload')).toThrow();
      
      // Students can only upload 10 times per hour
      for (let i = 0; i < 10; i++) {
        checkRateLimit(studentUser, 'upload');
      }
      
      expect(() => checkRateLimit(studentUser, 'upload')).toThrow();
    });
  });

  describe('ipfsAuth middleware', () => {
    it('should authenticate valid requests', async () => {
      const payload = { userId: 'test-user', role: 'student' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = ipfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toEqual(payload);
      expect(mockReq.ipfsOperation).toBe('download');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests without authorization header', async () => {
      const middleware = ipfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid authorization format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';
      
      const middleware = ipfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization token required'
      });
    });

    it('should reject requests with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';
      
      const middleware = ipfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
    });

    it('should reject requests with insufficient permissions', async () => {
      const payload = { userId: 'test-user', role: 'student' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = ipfsAuth('upload'); // Students can't upload
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions for this operation'
      });
    });

    it('should reject requests when rate limit exceeded', async () => {
      const payload = { userId: 'test-user', role: 'guest' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      // Exceed rate limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(payload, 'upload');
      }
      
      const middleware = ipfsAuth('upload');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rate limit exceeded'
      });
    });
  });

  describe('optionalIpfsAuth middleware', () => {
    it('should pass through requests without authentication', async () => {
      const middleware = optionalIpfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockReq.ipfsOperation).toBe('download');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate valid requests when token provided', async () => {
      const payload = { userId: 'test-user', role: 'student' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = optionalIpfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toEqual(payload);
      expect(mockReq.ipfsOperation).toBe('download');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through requests with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';
      
      const middleware = optionalIpfsAuth('download');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockReq.ipfsOperation).toBe('download');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject authenticated requests with insufficient permissions', async () => {
      const payload = { userId: 'test-user', role: 'student' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = optionalIpfsAuth('upload'); // Students can't upload
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions for this operation'
      });
    });
  });

  describe('validateContentAccess middleware', () => {
    // Note: This would need to be imported from the actual middleware file
    // For now, we'll test the concept since the actual implementation is in ipfsAuth.js
    
    it('should allow access for admin users', async () => {
      const mockValidateContentAccess = require('../../src/middleware/ipfsAuth').validateContentAccess;
      
      mockReq.user = { role: 'admin', id: 'admin-1' };
      mockReq.params = { cid: 'QmTest123' };
      
      await mockValidateContentAccess(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access without user (public content)', async () => {
      const mockValidateContentAccess = require('../../src/middleware/ipfsAuth').validateContentAccess;
      
      mockReq.user = undefined;
      mockReq.params = { cid: 'QmTest123' };
      
      await mockValidateContentAccess(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateFileSize middleware', () => {
    it('should allow files within size limit', async () => {
      const mockValidateFileSize = require('../../src/middleware/ipfsAuth').validateFileSize;
      
      mockReq.file = { size: 1024 }; // 1KB file
      
      await mockValidateFileSize(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject files exceeding size limit', async () => {
      const mockValidateFileSize = require('../../src/middleware/ipfsAuth').validateFileSize;
      
      mockReq.file = { size: 100 * 1024 * 1024 }; // 100MB file (assuming limit is smaller)
      
      await mockValidateFileSize(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File size exceeds maximum limit'
      });
    });

    it('should pass through when no file is provided', async () => {
      const mockValidateFileSize = require('../../src/middleware/ipfsAuth').validateFileSize;
      
      mockReq.file = null;
      
      await mockValidateFileSize(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
