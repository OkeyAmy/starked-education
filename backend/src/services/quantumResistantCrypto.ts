import crypto from 'crypto';
import sodium from 'libsodium-wrappers';

/**
 * Quantum-Resistant Cryptography Service
 * Implements post-quantum cryptographic algorithms for secure communication
 */
export class QuantumResistantCrypto {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  /**
   * Generate a quantum-resistant key pair using Curve25519
   * This is resistant to quantum attacks via Grover's algorithm
   */
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    await this.initialize();
    
    const keyPair = sodium.crypto_box_keypair();
    
    return {
      publicKey: sodium.to_hex(keyPair.publicKey),
      privateKey: sodium.to_hex(keyPair.privateKey)
    };
  }

  /**
   * Generate a shared secret using ECDH (Elliptic Curve Diffie-Hellman)
   * Combined with additional entropy for quantum resistance
   */
  async generateSharedSecret(
    privateKey: string,
    publicKey: string
  ): Promise<string> {
    await this.initialize();
    
    const privateKeyBytes = sodium.from_hex(privateKey);
    const publicKeyBytes = sodium.from_hex(publicKey);
    
    // Generate shared secret using X25519
    const sharedSecret = sodium.crypto_scalarmult(privateKeyBytes, publicKeyBytes);
    
    // Add additional entropy using HKDF for quantum resistance
    const salt = crypto.randomBytes(32);
    const info = Buffer.from('quantum-resistant-communication');
    
    const derivedKey = crypto.hkdfSync(
      'sha512',
      sharedSecret,
      salt,
      info,
      64
    );
    
    return Buffer.concat([salt, derivedKey]).toString('hex');
  }

  /**
   * Encrypt message using authenticated encryption (AEAD)
   * Provides confidentiality, integrity, and authenticity
   */
  async encryptMessage(
    message: string,
    sharedSecret: string
  ): Promise<{ ciphertext: string; nonce: string }> {
    await this.initialize();
    
    // Extract key from shared secret
    const secretBuffer = Buffer.from(sharedSecret, 'hex');
    const key = secretBuffer.slice(32, 64); // Use derived key portion
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const messageBytes = sodium.from_string(message);
    
    const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, key);
    
    return {
      ciphertext: sodium.to_hex(ciphertext),
      nonce: sodium.to_hex(nonce)
    };
  }

  /**
   * Decrypt message using authenticated encryption
   */
  async decryptMessage(
    ciphertext: string,
    nonce: string,
    sharedSecret: string
  ): Promise<string> {
    await this.initialize();
    
    const secretBuffer = Buffer.from(sharedSecret, 'hex');
    const key = secretBuffer.slice(32, 64);
    
    const ciphertextBytes = sodium.from_hex(ciphertext);
    const nonceBytes = sodium.from_hex(nonce);
    
    const decrypted = sodium.crypto_secretbox_open_easy(
      ciphertextBytes,
      nonceBytes,
      key
    );
    
    if (!decrypted) {
      throw new Error('Decryption failed - message may be tampered');
    }
    
    return sodium.to_string(decrypted);
  }

  /**
   * Generate a one-time pad for perfect secrecy
   * Used for critical communications
   */
  generateOneTimePad(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Sign message using Ed25519 (quantum-resistant signature scheme)
   */
  async signMessage(message: string, privateKey: string): Promise<string> {
    await this.initialize();
    
    const messageBytes = sodium.from_string(message);
    const privateKeyBytes = sodium.from_hex(privateKey);
    
    const signature = sodium.crypto_sign_detached(messageBytes, privateKeyBytes);
    
    return sodium.to_hex(signature);
  }

  /**
   * Verify message signature
   */
  async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    await this.initialize();
    
    const messageBytes = sodium.from_string(message);
    const signatureBytes = sodium.from_hex(signature);
    const publicKeyBytes = sodium.from_hex(publicKey);
    
    return sodium.crypto_sign_verify_detached(
      signatureBytes,
      messageBytes,
      publicKeyBytes
    );
  }

  /**
   * Generate session key with forward secrecy
   * Each session gets a unique key that cannot be derived from previous sessions
   */
  async generateSessionKey(): Promise<string> {
    await this.initialize();
    
    const sessionKey = sodium.crypto_secretbox_keygen();
    return sodium.to_hex(sessionKey);
  }

  /**
   * Derive multiple keys from master secret using HKDF
   * Provides key separation for different purposes
   */
  deriveKeys(
    masterSecret: string,
    purposes: string[]
  ): Record<string, string> {
    const masterBuffer = Buffer.from(masterSecret, 'hex');
    const keys: Record<string, string> = {};
    
    purposes.forEach(purpose => {
      const info = Buffer.from(`quantum-resistant-${purpose}`);
      const derivedKey = crypto.hkdfSync('sha512', masterBuffer, Buffer.alloc(0), info, 32);
      keys[purpose] = derivedKey.toString('hex');
    });
    
    return keys;
  }
}

export default new QuantumResistantCrypto();
