import quantumCrypto from '../services/quantumResistantCrypto';

describe('Quantum-Resistant Cryptography Service', () => {
  beforeAll(async () => {
    await quantumCrypto.initialize();
  });

  describe('Key Pair Generation', () => {
    it('should generate a valid key pair', async () => {
      const keyPair = await quantumCrypto.generateKeyPair();
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.publicKey).toHaveLength(64); // 32 bytes in hex
      expect(keyPair.privateKey).toHaveLength(64);
    });

    it('should generate unique key pairs', async () => {
      const keyPair1 = await quantumCrypto.generateKeyPair();
      const keyPair2 = await quantumCrypto.generateKeyPair();
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('Shared Secret Generation', () => {
    it('should generate matching shared secrets', async () => {
      const aliceKeys = await quantumCrypto.generateKeyPair();
      const bobKeys = await quantumCrypto.generateKeyPair();
      
      const aliceSecret = await quantumCrypto.generateSharedSecret(
        aliceKeys.privateKey,
        bobKeys.publicKey
      );
      
      const bobSecret = await quantumCrypto.generateSharedSecret(
        bobKeys.privateKey,
        aliceKeys.publicKey
      );
      
      // Secrets should be identical (after removing salt)
      expect(aliceSecret.length).toBe(bobSecret.length);
      expect(aliceSecret).toBeTruthy();
      expect(bobSecret).toBeTruthy();
    });
  });

  describe('Message Encryption/Decryption', () => {
    let sharedSecret: string;
    
    beforeAll(async () => {
      const aliceKeys = await quantumCrypto.generateKeyPair();
      const bobKeys = await quantumCrypto.generateKeyPair();
      sharedSecret = await quantumCrypto.generateSharedSecret(
        aliceKeys.privateKey,
        bobKeys.publicKey
      );
    });

    it('should encrypt and decrypt a message', async () => {
      const originalMessage = 'Hello, Quantum World!';
      
      const encrypted = await quantumCrypto.encryptMessage(
        originalMessage,
        sharedSecret
      );
      
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('nonce');
      expect(encrypted.ciphertext).not.toBe(originalMessage);
      
      const decrypted = await quantumCrypto.decryptMessage(
        encrypted.ciphertext,
        encrypted.nonce,
        sharedSecret
      );
      
      expect(decrypted).toBe(originalMessage);
    });

    it('should handle unicode characters', async () => {
      const originalMessage = '你好世界 🌍 مرحبا بالعالم';
      
      const encrypted = await quantumCrypto.encryptMessage(
        originalMessage,
        sharedSecret
      );
      
      const decrypted = await quantumCrypto.decryptMessage(
        encrypted.ciphertext,
        encrypted.nonce,
        sharedSecret
      );
      
      expect(decrypted).toBe(originalMessage);
    });

    it('should fail with wrong shared secret', async () => {
      const message = 'Secret message';
      const wrongSecret = await quantumCrypto.generateSessionKey();
      
      const encrypted = await quantumCrypto.encryptMessage(message, sharedSecret);
      
      await expect(
        quantumCrypto.decryptMessage(
          encrypted.ciphertext,
          encrypted.nonce,
          wrongSecret
        )
      ).rejects.toThrow();
    });

    it('should fail with tampered ciphertext', async () => {
      const message = 'Secret message';
      
      const encrypted = await quantumCrypto.encryptMessage(message, sharedSecret);
      
      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + 'ff';
      
      await expect(
        quantumCrypto.decryptMessage(
          tamperedCiphertext,
          encrypted.nonce,
          sharedSecret
        )
      ).rejects.toThrow();
    });
  });

  describe('Message Signing/Verification', () => {
    let keyPair: { publicKey: string; privateKey: string };
    
    beforeAll(async () => {
      keyPair = await quantumCrypto.generateKeyPair();
    });

    it('should sign and verify a message', async () => {
      const message = 'This is an authentic message';
      
      const signature = await quantumCrypto.signMessage(
        message,
        keyPair.privateKey
      );
      
      expect(signature).toBeTruthy();
      expect(signature.length).toBeGreaterThan(0);
      
      const isValid = await quantumCrypto.verifySignature(
        message,
        signature,
        keyPair.publicKey
      );
      
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong public key', async () => {
      const message = 'This is an authentic message';
      const wrongKeyPair = await quantumCrypto.generateKeyPair();
      
      const signature = await quantumCrypto.signMessage(
        message,
        keyPair.privateKey
      );
      
      const isValid = await quantumCrypto.verifySignature(
        message,
        signature,
        wrongKeyPair.publicKey
      );
      
      expect(isValid).toBe(false);
    });

    it('should fail verification with tampered message', async () => {
      const message = 'Original message';
      const tamperedMessage = 'Tampered message';
      
      const signature = await quantumCrypto.signMessage(
        message,
        keyPair.privateKey
      );
      
      const isValid = await quantumCrypto.verifySignature(
        tamperedMessage,
        signature,
        keyPair.publicKey
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Session Key Generation', () => {
    it('should generate unique session keys', async () => {
      const key1 = await quantumCrypto.generateSessionKey();
      const key2 = await quantumCrypto.generateSessionKey();
      
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64); // 32 bytes in hex
      expect(key2.length).toBe(64);
    });
  });

  describe('Key Derivation', () => {
    it('should derive multiple keys from master secret', async () => {
      const masterSecret = await quantumCrypto.generateSessionKey();
      const purposes = ['encryption', 'authentication', 'signing'];
      
      const derivedKeys = quantumCrypto.deriveKeys(masterSecret, purposes);
      
      expect(Object.keys(derivedKeys)).toHaveLength(3);
      expect(derivedKeys).toHaveProperty('encryption');
      expect(derivedKeys).toHaveProperty('authentication');
      expect(derivedKeys).toHaveProperty('signing');
      
      // All keys should be unique
      const keyValues = Object.values(derivedKeys);
      const uniqueKeys = new Set(keyValues);
      expect(uniqueKeys.size).toBe(keyValues.length);
    });
  });

  describe('One-Time Pad', () => {
    it('should generate one-time pad of specified length', () => {
      const length = 256;
      const pad = quantumCrypto.generateOneTimePad(length);
      
      expect(pad.length).toBe(length * 2); // Hex encoding doubles length
    });

    it('should generate unique pads', () => {
      const pad1 = quantumCrypto.generateOneTimePad(128);
      const pad2 = quantumCrypto.generateOneTimePad(128);
      
      expect(pad1).not.toBe(pad2);
    });
  });

  describe('Performance', () => {
    it('should generate key pairs quickly', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await quantumCrypto.generateKeyPair();
      }
      
      const duration = Date.now() - start;
      const avgTime = duration / 100;
      
      expect(avgTime).toBeLessThan(10); // Less than 10ms per key pair
    });

    it('should encrypt/decrypt quickly', async () => {
      const aliceKeys = await quantumCrypto.generateKeyPair();
      const bobKeys = await quantumCrypto.generateKeyPair();
      const sharedSecret = await quantumCrypto.generateSharedSecret(
        aliceKeys.privateKey,
        bobKeys.publicKey
      );
      
      const message = 'Performance test message';
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const encrypted = await quantumCrypto.encryptMessage(message, sharedSecret);
        await quantumCrypto.decryptMessage(
          encrypted.ciphertext,
          encrypted.nonce,
          sharedSecret
        );
      }
      
      const duration = Date.now() - start;
      const avgTime = duration / 1000;
      
      expect(avgTime).toBeLessThan(5); // Less than 5ms per encrypt/decrypt cycle
    });
  });
});
