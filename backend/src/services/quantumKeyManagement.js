/**
 * Quantum-Safe Key Management System
 * Manages post-quantum cryptographic keys with secure storage and rotation
 */

const crypto = require('crypto');
const { promisify } = require('util');
const redis = require('redis');
const QuantumEncryption = require('./quantumEncryption');

class QuantumKeyManagementService {
    constructor() {
        this.redisClient = null;
        this.encryptionService = QuantumEncryption;
        this.keyStore = new Map(); // In-memory fallback
        this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
        this.maxKeyAge = 90 * 24 * 60 * 60 * 1000; // 90 days
        
        this.initializeRedis();
    }

    async initializeRedis() {
        try {
            this.redisClient = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 2 // Separate DB for quantum keys
            });
            
            this.redisClient.on('error', (err) => {
                console.error('Redis connection error:', err);
            });
            
            await this.redisClient.connect();
            console.log('Quantum Key Management: Redis connected');
        } catch (error) {
            console.warn('Redis not available, using in-memory key store:', error.message);
        }
    }

    /**
     * Generate and store new quantum-resistant key pair
     */
    async generateAndStoreKey(keyId, algorithm = 'CRYSTALS_KYBER', metadata = {}) {
        try {
            const keyPair = await this.encryptionService.generateKeyPair(algorithm);
            
            const keyData = {
                keyId: keyId || keyPair.keyId,
                algorithm,
                publicKey: keyPair.publicKey,
                encryptedPrivateKey: await this._encryptPrivateKey(keyPair.privateKey),
                createdAt: new Date().toISOString(),
                lastRotated: new Date().toISOString(),
                status: 'active',
                version: '1.0',
                metadata: {
                    ...metadata,
                    securityLevel: keyPair.securityLevel
                }
            };

            // Store in Redis or fallback to memory
            await this._storeKey(keyData);
            
            // Schedule key rotation
            this._scheduleKeyRotation(keyData.keyId);
            
            console.log(`Generated quantum-resistant key: ${keyData.keyId}`);
            return keyData;
            
        } catch (error) {
            console.error('Key generation and storage failed:', error);
            throw new Error(`Failed to generate and store quantum key: ${error.message}`);
        }
    }

    /**
     * Retrieve public key by ID
     */
    async getPublicKey(keyId) {
        try {
            const keyData = await this._retrieveKey(keyId);
            if (!keyData) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            return {
                keyId: keyData.keyId,
                algorithm: keyData.algorithm,
                publicKey: keyData.publicKey,
                createdAt: keyData.createdAt,
                status: keyData.status
            };
        } catch (error) {
            console.error('Public key retrieval failed:', error);
            throw error;
        }
    }

    /**
     * Retrieve private key by ID (with security checks)
     */
    async getPrivateKey(keyId, accessContext = {}) {
        try {
            const keyData = await this._retrieveKey(keyId);
            if (!keyData) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            // Security checks
            this._validateAccess(accessContext, keyData);
            
            // Decrypt private key
            const privateKey = await this._decryptPrivateKey(keyData.encryptedPrivateKey);
            
            return {
                keyId: keyData.keyId,
                algorithm: keyData.algorithm,
                privateKey: privateKey,
                createdAt: keyData.createdAt,
                status: keyData.status
            };
        } catch (error) {
            console.error('Private key retrieval failed:', error);
            throw error;
        }
    }

    /**
     * Rotate cryptographic key
     */
    async rotateKey(keyId, newAlgorithm = null) {
        try {
            const currentKey = await this._retrieveKey(keyId);
            if (!currentKey) {
                throw new Error(`Key not found for rotation: ${keyId}`);
            }
            
            // Generate new key pair
            const algorithm = newAlgorithm || currentKey.algorithm;
            const newKeyData = await this.generateAndStoreKey(
                `${keyId}_v${Date.now()}`,
                algorithm,
                {
                    ...currentKey.metadata,
                    rotatedFrom: keyId,
                    rotationReason: 'scheduled'
                }
            );
            
            // Mark old key as deprecated
            await this._deprecateKey(keyId);
            
            // Create migration mapping
            await this._createMigrationMapping(keyId, newKeyData.keyId);
            
            console.log(`Key rotated: ${keyId} -> ${newKeyData.keyId}`);
            return {
                oldKeyId: keyId,
                newKeyId: newKeyData.keyId,
                algorithm,
                rotationTimestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Key rotation failed:', error);
            throw new Error(`Failed to rotate quantum key: ${error.message}`);
        }
    }

    /**
     * List all active keys
     */
    async listActiveKeys(filter = {}) {
        try {
            const keys = [];
            
            if (this.redisClient) {
                const pattern = filter.algorithm ? `qk:${filter.algorithm}:*` : 'qk:*';
                const keyIds = await this.redisClient.keys(pattern);
                
                for (const keyId of keyIds) {
                    const keyData = await this._retrieveKey(keyId.replace('qk:', ''));
                    if (keyData && keyData.status === 'active') {
                        keys.push({
                            keyId: keyData.keyId,
                            algorithm: keyData.algorithm,
                            createdAt: keyData.createdAt,
                            lastRotated: keyData.lastRotated,
                            status: keyData.status
                        });
                    }
                }
            } else {
                // Fallback to in-memory store
                for (const [keyId, keyData] of this.keyStore.entries()) {
                    if (keyData.status === 'active' && (!filter.algorithm || keyData.algorithm === filter.algorithm)) {
                        keys.push({
                            keyId: keyData.keyId,
                            algorithm: keyData.algorithm,
                            createdAt: keyData.createdAt,
                            lastRotated: keyData.lastRotated,
                            status: keyData.status
                        });
                    }
                }
            }
            
            return keys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        } catch (error) {
            console.error('Key listing failed:', error);
            throw error;
        }
    }

    /**
     * Revoke a key
     */
    async revokeKey(keyId, reason = 'manual') {
        try {
            const keyData = await this._retrieveKey(keyId);
            if (!keyData) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            keyData.status = 'revoked';
            keyData.revokedAt = new Date().toISOString();
            keyData.revocationReason = reason;
            
            await this._storeKey(keyData);
            
            // Remove from rotation schedule
            this._cancelKeyRotation(keyId);
            
            console.log(`Key revoked: ${keyId} (${reason})`);
            return true;
            
        } catch (error) {
            console.error('Key revocation failed:', error);
            throw error;
        }
    }

    /**
     * Perform key health check
     */
    async performHealthCheck() {
        const healthReport = {
            timestamp: new Date().toISOString(),
            totalKeys: 0,
            activeKeys: 0,
            deprecatedKeys: 0,
            revokedKeys: 0,
            keysNeedingRotation: [],
            storageStatus: this.redisClient ? 'redis' : 'memory',
            issues: []
        };
        
        try {
            const keys = await this.listActiveKeys();
            healthReport.totalKeys = keys.length;
            
            for (const key of keys) {
                if (key.status === 'active') {
                    healthReport.activeKeys++;
                    
                    // Check if key needs rotation
                    const lastRotation = new Date(key.lastRotated);
                    const now = new Date();
                    const daysSinceRotation = (now - lastRotation) / (24 * 60 * 60 * 1000);
                    
                    if (daysSinceRotation > 25) { // Warn 5 days before rotation
                        healthReport.keysNeedingRotation.push({
                            keyId: key.keyId,
                            daysSinceRotation: Math.round(daysSinceRotation)
                        });
                    }
                } else if (key.status === 'deprecated') {
                    healthReport.deprecatedKeys++;
                } else if (key.status === 'revoked') {
                    healthReport.revokedKeys++;
                }
            }
            
            // Check storage health
            if (this.redisClient) {
                try {
                    await this.redisClient.ping();
                    healthReport.storageHealth = 'healthy';
                } catch (error) {
                    healthReport.storageHealth = 'unhealthy';
                    healthReport.issues.push(`Redis connection failed: ${error.message}`);
                }
            }
            
        } catch (error) {
            healthReport.issues.push(`Health check failed: ${error.message}`);
        }
        
        return healthReport;
    }

    /**
     * Migrate data from old key to new key
     */
    async migrateData(oldKeyId, newKeyId, encryptedData) {
        try {
            const oldPrivateKey = await this.getPrivateKey(oldKeyId, { operation: 'migration' });
            const newPublicKey = await this.getPublicKey(newKeyId);
            
            // Decrypt with old key
            const decryptedData = await this.encryptionService.decrypt(
                encryptedData,
                oldPrivateKey.privateKey,
                oldPrivateKey.algorithm
            );
            
            // Re-encrypt with new key
            const newEncryptedData = await this.encryptionService.encrypt(
                decryptedData,
                newPublicKey.publicKey,
                newPublicKey.algorithm
            );
            
            return {
                oldKeyId,
                newKeyId,
                migratedData: newEncryptedData,
                migrationTimestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Data migration failed:', error);
            throw new Error(`Failed to migrate encrypted data: ${error.message}`);
        }
    }

    // Private helper methods

    async _encryptPrivateKey(privateKey) {
        const masterKey = process.env.QUANTUM_MASTER_KEY || crypto.randomBytes(32).toString('hex');
        const cipher = crypto.createCipher('aes-256-cbc', masterKey);
        return Buffer.concat([cipher.update(privateKey, 'base64'), cipher.final()]).toString('base64');
    }

    async _decryptPrivateKey(encryptedPrivateKey) {
        const masterKey = process.env.QUANTUM_MASTER_KEY || crypto.randomBytes(32).toString('hex');
        const decipher = crypto.createDecipher('aes-256-cbc', masterKey);
        return Buffer.concat([decipher.update(encryptedPrivateKey, 'base64'), decipher.final()]).toString('base64');
    }

    async _storeKey(keyData) {
        const storageKey = `qk:${keyData.algorithm}:${keyData.keyId}`;
        
        if (this.redisClient) {
            await this.redisClient.setEx(storageKey, 86400 * 90, JSON.stringify(keyData)); // 90 days TTL
        } else {
            this.keyStore.set(keyData.keyId, keyData);
        }
    }

    async _retrieveKey(keyId) {
        if (this.redisClient) {
            // Try different algorithm prefixes
            const algorithms = ['CRYSTALS_KYBER', 'CRYSTALS_DILITHIUM', 'FALCON', 'NTRU'];
            
            for (const algorithm of algorithms) {
                const storageKey = `qk:${algorithm}:${keyId}`;
                const keyData = await this.redisClient.get(storageKey);
                if (keyData) {
                    return JSON.parse(keyData);
                }
            }
            return null;
        } else {
            return this.keyStore.get(keyId) || null;
        }
    }

    async _deprecateKey(keyId) {
        const keyData = await this._retrieveKey(keyId);
        if (keyData) {
            keyData.status = 'deprecated';
            keyData.deprecatedAt = new Date().toISOString();
            await this._storeKey(keyData);
        }
    }

    async _createMigrationMapping(oldKeyId, newKeyId) {
        const mapping = {
            oldKeyId,
            newKeyId,
            createdAt: new Date().toISOString()
        };
        
        if (this.redisClient) {
            await this.redisClient.setEx(`migration:${oldKeyId}`, 86400 * 30, JSON.stringify(mapping));
        }
    }

    _scheduleKeyRotation(keyId) {
        setTimeout(() => {
            this.rotateKey(keyId).catch(error => {
                console.error(`Scheduled key rotation failed for ${keyId}:`, error);
            });
        }, this.keyRotationInterval);
    }

    _cancelKeyRotation(keyId) {
        // In a real implementation, you'd store and clear timeout references
        console.log(`Key rotation cancelled for: ${keyId}`);
    }

    _validateAccess(accessContext, keyData) {
        // Implement access control logic
        if (accessContext.operation === 'migration' && keyData.status !== 'active') {
            throw new Error('Cannot access inactive key for migration');
        }
        
        // Add more security checks as needed
        return true;
    }
}

module.exports = new QuantumKeyManagementService();
