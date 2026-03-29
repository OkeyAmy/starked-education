import { Request, Response } from 'express';
import quantumCrypto from '../services/quantumResistantCrypto';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

/**
 * Controller for secure communication endpoints
 */
export class SecureCommController {
  /**
   * Generate quantum-resistant key pair for user
   */
  async generateKeyPair(req: Request, res: Response): Promise<void> {
    try {
      const keyPair = await quantumCrypto.generateKeyPair();
      
      res.json({
        success: true,
        data: {
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey
        },
        message: 'Quantum-resistant key pair generated'
      });
    } catch (error) {
      console.error('Error generating key pair:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate key pair'
      });
    }
  }

  /**
   * Establish shared secret between two users
   */
  async establishSharedSecret(req: Request, res: Response): Promise<void> {
    try {
      const { privateKey, peerPublicKey, userId, peerId } = req.body;

      if (!privateKey || !peerPublicKey || !userId || !peerId) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const sharedSecret = await quantumCrypto.generateSharedSecret(
        privateKey,
        peerPublicKey
      );

      // Store shared secret in Redis with expiration
      const secretKey = `shared-secret:${userId}:${peerId}`;
      await redis.setex(secretKey, 86400, sharedSecret); // 24 hours

      res.json({
        success: true,
        data: {
          sharedSecret,
          expiresIn: 86400
        },
        message: 'Shared secret established'
      });
    } catch (error) {
      console.error('Error establishing shared secret:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to establish shared secret'
      });
    }
  }

  /**
   * Encrypt message for secure transmission
   */
  async encryptMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, sharedSecret } = req.body;

      if (!message || !sharedSecret) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const encrypted = await quantumCrypto.encryptMessage(message, sharedSecret);

      res.json({
        success: true,
        data: encrypted,
        message: 'Message encrypted successfully'
      });
    } catch (error) {
      console.error('Error encrypting message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to encrypt message'
      });
    }
  }

  /**
   * Decrypt received message
   */
  async decryptMessage(req: Request, res: Response): Promise<void> {
    try {
      const { ciphertext, nonce, sharedSecret } = req.body;

      if (!ciphertext || !nonce || !sharedSecret) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const decrypted = await quantumCrypto.decryptMessage(
        ciphertext,
        nonce,
        sharedSecret
      );

      res.json({
        success: true,
        data: { message: decrypted },
        message: 'Message decrypted successfully'
      });
    } catch (error) {
      console.error('Error decrypting message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decrypt message - may be tampered'
      });
    }
  }

  /**
   * Sign message for authenticity
   */
  async signMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, privateKey } = req.body;

      if (!message || !privateKey) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const signature = await quantumCrypto.signMessage(message, privateKey);

      res.json({
        success: true,
        data: { signature },
        message: 'Message signed successfully'
      });
    } catch (error) {
      console.error('Error signing message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sign message'
      });
    }
  }

  /**
   * Verify message signature
   */
  async verifySignature(req: Request, res: Response): Promise<void> {
    try {
      const { message, signature, publicKey } = req.body;

      if (!message || !signature || !publicKey) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const isValid = await quantumCrypto.verifySignature(
        message,
        signature,
        publicKey
      );

      res.json({
        success: true,
        data: { isValid },
        message: isValid ? 'Signature is valid' : 'Signature is invalid'
      });
    } catch (error) {
      console.error('Error verifying signature:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify signature'
      });
    }
  }

  /**
   * Get communication statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const [sessionKeys, messageKeys, roomKeys] = await Promise.all([
        redis.keys('secure-session:*'),
        redis.keys(`messages:${userId}`),
        redis.keys('secure-room:*')
      ]);

      res.json({
        success: true,
        data: {
          activeSessions: sessionKeys.length,
          pendingMessages: messageKeys.length,
          activeRooms: roomKeys.length
        }
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics'
      });
    }
  }
}

export default new SecureCommController();
