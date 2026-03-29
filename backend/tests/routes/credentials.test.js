const request = require('supertest');
const app = require('../../src/index');
const userData = require('../fixtures/userData');

// Mock the credential service
jest.mock('../../src/services/credentialService', () => ({
  credentialService: {
    createCredential: jest.fn(),
    getCredential: jest.fn(),
    getCredentialsByRecipient: jest.fn(),
    getCredentialsByIssuer: jest.fn(),
    verifyCredential: jest.fn(),
    revokeCredential: jest.fn(),
    updateCredential: jest.fn(),
    searchCredentials: jest.fn(),
    getCredentialStats: jest.fn()
  }
}));

// Mock Stellar and IPFS services
jest.mock('../../src/services/stellarService', () => ({
  stellarService: {
    verifySignature: jest.fn(),
    createTransaction: jest.fn(),
    submitTransaction: jest.fn()
  }
}));

jest.mock('../../src/services/ipfsService', () => ({
  ipfsService: {
    uploadToIPFS: jest.fn(),
    downloadFromIPFS: jest.fn(),
    pinFile: jest.fn(),
    unpinFile: jest.fn()
  }
}));

const { credentialService } = require('../../src/services/credentialService');
const { stellarService } = require('../../src/services/stellarService');
const { ipfsService } = require('../../src/services/ipfsService');

describe('Credential API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/credentials', () => {
    it('should create a new credential successfully', async () => {
      const mockCredential = userData.credentials.validCredential;
      const createdCredential = { ...mockCredential, id: 'cred_123', createdAt: new Date() };
      
      credentialService.createCredential.mockResolvedValue(createdCredential);
      stellarService.verifySignature.mockResolvedValue(true);
      ipfsService.uploadToIPFS.mockResolvedValue('QmTest123456789');

      const response = await request(app)
        .post('/api/credentials')
        .send(mockCredential);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdCredential);
      expect(credentialService.createCredential).toHaveBeenCalledWith(mockCredential);
    });

    it('should validate credential creation data', async () => {
      const invalidCredential = userData.credentials.invalidCredential;

      const response = await request(app)
        .post('/api/credentials')
        .send(invalidCredential);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should verify issuer signature on creation', async () => {
      const mockCredential = userData.credentials.validCredential;
      
      stellarService.verifySignature.mockResolvedValue(false); // Invalid signature

      const response = await request(app)
        .post('/api/credentials')
        .send(mockCredential);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid signature');
    });

    it('should upload credential metadata to IPFS', async () => {
      const mockCredential = userData.credentials.validCredential;
      const createdCredential = { ...mockCredential, id: 'cred_123', ipfsHash: 'QmTest123456789' };
      
      credentialService.createCredential.mockResolvedValue(createdCredential);
      stellarService.verifySignature.mockResolvedValue(true);
      ipfsService.uploadToIPFS.mockResolvedValue('QmTest123456789');

      const response = await request(app)
        .post('/api/credentials')
        .send(mockCredential);

      expect(ipfsService.uploadToIPFS).toHaveBeenCalledWith(mockCredential.metadata);
      expect(response.body.data.ipfsHash).toBe('QmTest123456789');
    });

    it('should handle IPFS upload failures', async () => {
      const mockCredential = userData.credentials.validCredential;
      
      stellarService.verifySignature.mockResolvedValue(true);
      ipfsService.uploadToIPFS.mockRejectedValue(new Error('IPFS upload failed'));

      const response = await request(app)
        .post('/api/credentials')
        .send(mockCredential);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('IPFS upload failed');
    });

    it('should handle duplicate credential creation', async () => {
      const mockCredential = userData.credentials.validCredential;
      
      stellarService.verifySignature.mockResolvedValue(true);
      credentialService.createCredential.mockRejectedValue(new Error('Credential already exists'));

      const response = await request(app)
        .post('/api/credentials')
        .send(mockCredential);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/credentials/:credentialId', () => {
    it('should retrieve specific credential', async () => {
      const mockCredential = userData.credentials.validCredential;
      
      credentialService.getCredential.mockResolvedValue(mockCredential);

      const response = await request(app)
        .get('/api/credentials/cred_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCredential);
      expect(credentialService.getCredential).toHaveBeenCalledWith('cred_123');
    });

    it('should handle non-existent credential', async () => {
      credentialService.getCredential.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/credentials/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credential not found');
    });

    it('should retrieve credential metadata from IPFS if needed', async () => {
      const mockCredential = { ...userData.credentials.validCredential, ipfsHash: 'QmTest123456789' };
      const ipfsMetadata = { additionalData: 'from IPFS' };
      
      credentialService.getCredential.mockResolvedValue(mockCredential);
      ipfsService.downloadFromIPFS.mockResolvedValue(ipfsMetadata);

      const response = await request(app)
        .get('/api/credentials/cred_123');

      expect(ipfsService.downloadFromIPFS).toHaveBeenCalledWith('QmTest123456789');
      expect(response.status).toBe(200);
    });

    it('should handle IPFS download failures', async () => {
      const mockCredential = { ...userData.credentials.validCredential, ipfsHash: 'QmTest123456789' };
      
      credentialService.getCredential.mockResolvedValue(mockCredential);
      ipfsService.downloadFromIPFS.mockRejectedValue(new Error('IPFS download failed'));

      const response = await request(app)
        .get('/api/credentials/cred_123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/credentials/recipient/:recipientAddress', () => {
    it('should retrieve credentials by recipient', async () => {
      const mockCredentials = [
        userData.credentials.validCredential,
        userData.helpers.generateCredential({ recipient: 'GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP' })
      ];
      
      credentialService.getCredentialsByRecipient.mockResolvedValue(mockCredentials);

      const response = await request(app)
        .get('/api/credentials/recipient/GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCredentials);
      expect(credentialService.getCredentialsByRecipient).toHaveBeenCalledWith('GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP');
    });

    it('should handle pagination for recipient credentials', async () => {
      const mockResult = {
        credentials: [],
        total: 0,
        page: 2,
        limit: 5,
        hasMore: false
      };
      
      credentialService.getCredentialsByRecipient.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/credentials/recipient/GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP?page=2&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(5);
    });

    it('should validate recipient address format', async () => {
      const response = await request(app)
        .get('/api/credentials/recipient/invalid-address');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(e => e.param === 'recipientAddress')).toBe(true);
    });

    it('should handle empty credentials list', async () => {
      credentialService.getCredentialsByRecipient.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/credentials/recipient/GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/credentials/issuer/:issuerAddress', () => {
    it('should retrieve credentials by issuer', async () => {
      const mockCredentials = [
        userData.credentials.validCredential,
        userData.helpers.generateCredential({ issuer: 'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF' })
      ];
      
      credentialService.getCredentialsByIssuer.mockResolvedValue(mockCredentials);

      const response = await request(app)
        .get('/api/credentials/issuer/GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCredentials);
      expect(credentialService.getCredentialsByIssuer).toHaveBeenCalledWith('GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF');
    });

    it('should handle issuer credentials with filters', async () => {
      const mockResult = {
        credentials: [userData.credentials.validCredential],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false
      };
      
      credentialService.getCredentialsByIssuer.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/credentials/issuer/GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF?type=course_completion&status=active');

      expect(response.status).toBe(200);
      expect(credentialService.getCredentialsByIssuer).toHaveBeenCalledWith(
        'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF',
        { type: 'course_completion', status: 'active' }
      );
    });
  });

  describe('POST /api/credentials/:credentialId/verify', () => {
    it('should verify credential successfully', async () => {
      const mockVerificationResult = {
        isValid: true,
        verifiedAt: new Date(),
        verificationDetails: {
          signatureValid: true,
          issuerValid: true,
          notExpired: true,
          notRevoked: true
        }
      };
      
      credentialService.verifyCredential.mockResolvedValue(mockVerificationResult);
      stellarService.verifySignature.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/credentials/cred_123/verify');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVerificationResult);
      expect(credentialService.verifyCredential).toHaveBeenCalledWith('cred_123');
    });

    it('should detect expired credentials', async () => {
      const expiredCredential = userData.credentials.expiredCredential;
      const mockVerificationResult = {
        isValid: false,
        verifiedAt: new Date(),
        verificationDetails: {
          signatureValid: true,
          issuerValid: true,
          notExpired: false,
          notRevoked: true
        },
        reason: 'Credential has expired'
      };
      
      credentialService.verifyCredential.mockResolvedValue(mockVerificationResult);

      const response = await request(app)
        .post('/api/credentials/cred_expired/verify');

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.reason).toBe('Credential has expired');
    });

    it('should detect revoked credentials', async () => {
      const mockVerificationResult = {
        isValid: false,
        verifiedAt: new Date(),
        verificationDetails: {
          signatureValid: true,
          issuerValid: true,
          notExpired: true,
          notRevoked: false
        },
        reason: 'Credential has been revoked'
      };
      
      credentialService.verifyCredential.mockResolvedValue(mockVerificationResult);

      const response = await request(app)
        .post('/api/credentials/cred_revoked/verify');

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.reason).toBe('Credential has been revoked');
    });

    it('should handle verification errors', async () => {
      credentialService.verifyCredential.mockRejectedValue(new Error('Verification failed'));

      const response = await request(app)
        .post('/api/credentials/cred_123/verify');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/credentials/:credentialId/revoke', () => {
    it('should revoke credential successfully', async () => {
      const revokeData = {
        reason: 'Issued in error',
        revokedBy: 'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF'
      };
      const mockRevokedCredential = {
        ...userData.credentials.validCredential,
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: revokeData.reason,
        revokedBy: revokeData.revokedBy
      };
      
      stellarService.verifySignature.mockResolvedValue(true);
      credentialService.revokeCredential.mockResolvedValue(mockRevokedCredential);

      const response = await request(app)
        .post('/api/credentials/cred_123/revoke')
        .send(revokeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('revoked');
      expect(credentialService.revokeCredential).toHaveBeenCalledWith('cred_123', revokeData);
    });

    it('should verify revoker authority', async () => {
      const revokeData = {
        reason: 'Test revocation',
        revokedBy: 'GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP' // Not the issuer
      };
      
      stellarService.verifySignature.mockResolvedValue(false); // Unauthorized

      const response = await request(app)
        .post('/api/credentials/cred_123/revoke')
        .send(revokeData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized to revoke');
    });

    it('should validate revocation data', async () => {
      const invalidRevokeData = {
        reason: '', // empty
        revokedBy: 'invalid-address'
      };

      const response = await request(app)
        .post('/api/credentials/cred_123/revoke')
        .send(invalidRevokeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle revocation of already revoked credentials', async () => {
      const revokeData = {
        reason: 'Test revocation',
        revokedBy: 'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF'
      };
      
      stellarService.verifySignature.mockResolvedValue(true);
      credentialService.revokeCredential.mockRejectedValue(new Error('Credential already revoked'));

      const response = await request(app)
        .post('/api/credentials/cred_123/revoke')
        .send(revokeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/credentials/:credentialId', () => {
    it('should update credential successfully', async () => {
      const updateData = {
        title: 'Updated Certificate Title',
        description: 'Updated description'
      };
      const updatedCredential = {
        ...userData.credentials.validCredential,
        ...updateData,
        updatedAt: new Date()
      };
      
      stellarService.verifySignature.mockResolvedValue(true);
      credentialService.updateCredential.mockResolvedValue(updatedCredential);

      const response = await request(app)
        .put('/api/credentials/cred_123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedCredential);
      expect(credentialService.updateCredential).toHaveBeenCalledWith('cred_123', updateData);
    });

    it('should verify update authority', async () => {
      const updateData = { title: 'Updated Title' };
      
      stellarService.verifySignature.mockResolvedValue(false); // Unauthorized

      const response = await request(app)
        .put('/api/credentials/cred_123')
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        title: '', // empty
        description: 'a' // too short
      };

      const response = await request(app)
        .put('/api/credentials/cred_123')
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/credentials/search', () => {
    it('should search credentials with filters', async () => {
      const searchParams = {
        query: 'blockchain',
        type: 'course_completion',
        issuer: 'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF',
        status: 'active',
        page: 1,
        limit: 10
      };
      const mockSearchResult = {
        credentials: [userData.credentials.validCredential],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false
      };
      
      credentialService.searchCredentials.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/credentials/search')
        .query(searchParams);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResult);
      expect(credentialService.searchCredentials).toHaveBeenCalledWith(searchParams);
    });

    it('should handle empty search results', async () => {
      const searchParams = { query: 'nonexistent' };
      const mockSearchResult = {
        credentials: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      };
      
      credentialService.searchCredentials.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/credentials/search')
        .query(searchParams);

      expect(response.status).toBe(200);
      expect(response.body.data.credentials).toEqual([]);
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/credentials/search')
        .query({ page: -1, limit: 1000 }); // Invalid parameters

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/credentials/stats', () => {
    it('should retrieve credential statistics', async () => {
      const mockStats = {
        totalCredentials: 1000,
        activeCredentials: 850,
        revokedCredentials: 50,
        expiredCredentials: 100,
        credentialsByType: {
          course_completion: 600,
          achievement: 250,
          certification: 150
        },
        credentialsByIssuer: {
          'GD7YEH5CKZ5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF5Z5J5WDF': 400,
          'GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP': 300
        },
        recentActivity: [
          {
            action: 'created',
            credentialId: 'cred_123',
            timestamp: new Date()
          }
        ]
      };
      
      credentialService.getCredentialStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/credentials/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle stats retrieval errors', async () => {
      credentialService.getCredentialStats.mockRejectedValue(new Error('Stats error'));

      const response = await request(app)
        .get('/api/credentials/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/credentials')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent credential operations', async () => {
      const credential1 = userData.helpers.generateCredential();
      const credential2 = userData.helpers.generateCredential();

      credentialService.createCredential
        .mockResolvedValueOnce({ ...credential1, id: 'cred_1' })
        .mockResolvedValueOnce({ ...credential2, id: 'cred_2' });

      stellarService.verifySignature.mockResolvedValue(true);
      ipfsService.uploadToIPFS.mockResolvedValue('QmTest123');

      const [response1, response2] = await Promise.all([
        request(app).post('/api/credentials').send(credential1),
        request(app).post('/api/credentials').send(credential2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should handle rate limiting on credential operations', async () => {
      stellarService.verifySignature.mockResolvedValue(true);
      credentialService.createCredential.mockRejectedValue(new Error('Rate limit exceeded'));

      const responses = await Promise.all(
        Array(10).fill().map(() =>
          request(app).post('/api/credentials').send(userData.credentials.validCredential)
        )
      );

      expect(responses.some(r => r.status === 429)).toBe(true);
    });

    it('should handle large credential metadata', async () => {
      const largeCredential = {
        ...userData.credentials.validCredential,
        metadata: {
          ...userData.credentials.validCredential.metadata,
          largeData: 'x'.repeat(1000000) // 1MB of data
        }
      };

      stellarService.verifySignature.mockResolvedValue(true);
      ipfsService.uploadToIPFS.mockRejectedValue(new Error('Data too large'));

      const response = await request(app)
        .post('/api/credentials')
        .send(largeCredential);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      stellarService.verifySignature.mockImplementation(() => 
        new Promise((resolve, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await request(app)
        .post('/api/credentials')
        .send(userData.credentials.validCredential);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
