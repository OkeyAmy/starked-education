/**
 * Hybrid Encryption System
 * Combines classical and post-quantum cryptography for backward compatibility
 */

const crypto = require('crypto');
const QuantumEncryption = require('./quantumEncryption');
const QuantumKeyManagement = require('./quantumKeyManagement');

class HybridEncryptionService {
    constructor() {
        this.quantumService = QuantumEncryption;
        this.keyManagement = QuantumKeyManagement;
        this.compatibilityModes = {
            CLASSICAL_ONLY: 'classical_only',
            QUANTUM_ONLY: 'quantum_only',
            HYBRID: 'hybrid',
            AUTO_MIGRATE: 'auto_migrate'
        };
        
        this.migrationThresholds = {
            keyAge: 180, // days
            securityLevel: 2, // Migrate to quantum if security level >= 2
            dataSensitivity: ['high', 'critical'] // Migrate sensitive data
        };
    }

    /**
     * Encrypt data with hybrid approach
     */
    async encrypt(data, options = {}) {
        const {
            compatibilityMode = this.compatibilityModes.HYBRID,
            algorithm = 'CRYSTALS_KYBER',
            classicalAlgorithm = 'AES256_GCM',
            sensitivity = 'medium',
            metadata = {}
        } = options;

        try {
            switch (compatibilityMode) {
                case this.compatibilityModes.CLASSICAL_ONLY:
                    return await this._classicalEncrypt(data, classicalAlgorithm, metadata);
                
                case this.compatibilityModes.QUANTUM_ONLY:
                    return await this._quantumEncrypt(data, algorithm, metadata);
                
                case this.compatibilityModes.HYBRID:
                    return await this._hybridEncrypt(data, algorithm, classicalAlgorithm, metadata);
                
                case this.compatibilityModes.AUTO_MIGRATE:
                    return await this._autoMigrateEncrypt(data, algorithm, classicalAlgorithm, sensitivity, metadata);
                
                default:
                    throw new Error(`Invalid compatibility mode: ${compatibilityMode}`);
            }
        } catch (error) {
            console.error('Hybrid encryption failed:', error);
            throw new Error(`Hybrid encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data with automatic detection
     */
    async decrypt(encryptedPackage, options = {}) {
        const {
            privateKey = null,
            quantumPrivateKey = null,
            autoDetect = true
        } = options;

        try {
            if (autoDetect) {
                return await this._autoDecrypt(encryptedPackage, privateKey, quantumPrivateKey);
            } else {
                return await this._manualDecrypt(encryptedPackage, privateKey, quantumPrivateKey);
            }
        } catch (error) {
            console.error('Hybrid decryption failed:', error);
            throw new Error(`Hybrid decryption failed: ${error.message}`);
        }
    }

    /**
     * Migrate encrypted data to quantum-resistant format
     */
    async migrateToQuantum(oldEncryptedPackage, targetAlgorithm = 'CRYSTALS_KYBER') {
        try {
            // Detect encryption type
            const encryptionType = this._detectEncryptionType(oldEncryptedPackage);
            
            if (encryptionType === 'quantum') {
                return {
                    status: 'already_migrated',
                    package: oldEncryptedPackage,
                    message: 'Data is already quantum-encrypted'
                };
            }
            
            // Generate new quantum key pair
            const keyPair = await this.keyManagement.generateAndStoreKey(
                `migration_${Date.now()}`,
                targetAlgorithm,
                { purpose: 'migration' }
            );
            
            // Decrypt with classical method
            const decryptedData = await this._classicalDecrypt(oldEncryptedPackage);
            
            // Re-encrypt with quantum method
            const newEncryptedPackage = await this._quantumEncrypt(
                decryptedData,
                targetAlgorithm,
                { migratedFrom: encryptionType, migrationTimestamp: new Date().toISOString() }
            );
            
            return {
                status: 'migrated',
                oldPackage: oldEncryptedPackage,
                newPackage: newEncryptedPackage,
                keyId: keyPair.keyId,
                algorithm: targetAlgorithm,
                migrationTimestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Migration to quantum failed:', error);
            throw new Error(`Migration to quantum failed: ${error.message}`);
        }
    }

    /**
     * Create dual-encrypted package for maximum compatibility
     */
    async createDualEncrypted(data, classicalKey, quantumKey, metadata = {}) {
        try {
            // Classical encryption
            const classicalEncrypted = await this._classicalEncrypt(data, 'AES256_GCM', {
                ...metadata,
                encryptionLayer: 'classical'
            });
            
            // Quantum encryption
            const quantumEncrypted = await this._quantumEncrypt(data, 'CRYSTALS_KYBER', {
                ...metadata,
                encryptionLayer: 'quantum'
            });
            
            return {
                type: 'dual_encrypted',
                version: '1.0',
                classical: classicalEncrypted,
                quantum: quantumEncrypted,
                metadata: {
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    dualEncryption: true
                }
            };
            
        } catch (error) {
            console.error('Dual encryption failed:', error);
            throw new Error(`Dual encryption failed: ${error.message}`);
        }
    }

    /**
     * Perform compatibility test across different encryption methods
     */
    async performCompatibilityTest(testData) {
        const results = {
            timestamp: new Date().toISOString(),
            testData: testData,
            encryptionMethods: {},
            crossCompatibility: {},
            performanceMetrics: {}
        };

        try {
            // Test individual methods
            const methods = [
                { name: 'classical_aes256', mode: this.compatibilityModes.CLASSICAL_ONLY },
                { name: 'quantum_kyber', mode: this.compatibilityModes.QUANTUM_ONLY },
                { name: 'hybrid', mode: this.compatibilityModes.HYBRID },
                { name: 'auto_migrate', mode: this.compatibilityModes.AUTO_MIGRATE }
            ];

            for (const method of methods) {
                const startTime = Date.now();
                
                try {
                    const encrypted = await this.encrypt(testData, {
                        compatibilityMode: method.mode,
                        metadata: { testMethod: method.name }
                    });
                    
                    const decrypted = await this.decrypt(encrypted, { autoDetect: true });
                    
                    const endTime = Date.now();
                    const executionTime = endTime - startTime;
                    
                    results.encryptionMethods[method.name] = {
                        success: true,
                        executionTime,
                        encryptedSize: JSON.stringify(encrypted).length,
                        verification: JSON.stringify(decrypted) === JSON.stringify(testData)
                    };
                    
                    results.performanceMetrics[method.name] = {
                        encryptionTime: executionTime / 2, // Approximate
                        decryptionTime: executionTime / 2,
                        throughput: testData.length / (executionTime / 1000) // bytes per second
                    };
                    
                } catch (error) {
                    results.encryptionMethods[method.name] = {
                        success: false,
                        error: error.message
                    };
                }
            }

            // Test cross-compatibility
            results.crossCompatibility = await this._testCrossCompatibility(testData);
            
        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    /**
     * Analyze encryption security level
     */
    analyzeSecurityLevel(encryptedPackage) {
        const analysis = {
            timestamp: new Date().toISOString(),
            encryptionType: this._detectEncryptionType(encryptedPackage),
            securityLevel: 'unknown',
            quantumResistance: false,
            recommendations: []
        };

        switch (analysis.encryptionType) {
            case 'quantum':
                analysis.securityLevel = 'high';
                analysis.quantumResistance = true;
                analysis.recommendations.push('Quantum-resistant encryption is active');
                break;
            
            case 'hybrid':
                analysis.securityLevel = 'high';
                analysis.quantumResistance = true;
                analysis.recommendations.push('Hybrid encryption provides both compatibility and quantum resistance');
                break;
            
            case 'classical':
                analysis.securityLevel = 'medium';
                analysis.quantumResistance = false;
                analysis.recommendations.push('Consider migrating to quantum-resistant encryption');
                analysis.recommendations.push('Classical encryption vulnerable to quantum attacks');
                break;
            
            case 'dual':
                analysis.securityLevel = 'maximum';
                analysis.quantumResistance = true;
                analysis.recommendations.push('Dual encryption provides maximum security and compatibility');
                break;
        }

        // Check algorithm strength
        if (encryptedPackage.algorithm) {
            if (encryptedPackage.algorithm.includes('4096') || 
                encryptedPackage.algorithm.includes('KYBER') ||
                encryptedPackage.algorithm.includes('DILITHIUM')) {
                analysis.algorithmStrength = 'strong';
            } else if (encryptedPackage.algorithm.includes('2048') || 
                      encryptedPackage.algorithm.includes('256')) {
                analysis.algorithmStrength = 'medium';
            } else {
                analysis.algorithmStrength = 'weak';
                analysis.recommendations.push('Upgrade to stronger cryptographic algorithms');
            }
        }

        return analysis;
    }

    // Private helper methods

    async _classicalEncrypt(data, algorithm, metadata) {
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
        const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
        
        return {
            type: 'classical_encrypted',
            algorithm,
            encryptedData: encrypted.toString('base64'),
            key: key.toString('base64'),
            iv: iv.toString('base64'),
            metadata: {
                ...metadata,
                encryptedAt: new Date().toISOString(),
                encryptionMethod: 'classical'
            }
        };
    }

    async _quantumEncrypt(data, algorithm, metadata) {
        const keyPair = await this.keyManagement.generateAndStoreKey(
            `temp_${Date.now()}`,
            algorithm,
            metadata
        );
        
        const encrypted = await this.quantumService.encrypt(
            data,
            keyPair.publicKey,
            algorithm,
            metadata
        );
        
        return {
            type: 'quantum_encrypted',
            ...encrypted,
            keyId: keyPair.keyId,
            metadata: {
                ...encrypted.metadata,
                ...metadata,
                encryptedAt: new Date().toISOString(),
                encryptionMethod: 'quantum'
            }
        };
    }

    async _hybridEncrypt(data, quantumAlgorithm, classicalAlgorithm, metadata) {
        const [classicalResult, quantumResult] = await Promise.all([
            this._classicalEncrypt(data, classicalAlgorithm, { ...metadata, layer: 'classical' }),
            this._quantumEncrypt(data, quantumAlgorithm, { ...metadata, layer: 'quantum' })
        ]);
        
        return {
            type: 'hybrid_encrypted',
            version: '1.0',
            classical: classicalResult,
            quantum: quantumResult,
            metadata: {
                ...metadata,
                encryptedAt: new Date().toISOString(),
                encryptionMethod: 'hybrid'
            }
        };
    }

    async _autoMigrateEncrypt(data, quantumAlgorithm, classicalAlgorithm, sensitivity, metadata) {
        // Decide encryption method based on sensitivity and other factors
        if (this.migrationThresholds.dataSensitivity.includes(sensitivity)) {
            return await this._quantumEncrypt(data, quantumAlgorithm, {
                ...metadata,
                migrationReason: 'high_sensitivity',
                sensitivity
            });
        } else {
            return await this._hybridEncrypt(data, quantumAlgorithm, classicalAlgorithm, {
                ...metadata,
                migrationReason: 'compatibility',
                sensitivity
            });
        }
    }

    async _classicalDecrypt(encryptedPackage) {
        const decipher = crypto.createDecipher(
            encryptedPackage.algorithm,
            Buffer.from(encryptedPackage.key, 'base64')
        );
        
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedPackage.encryptedData, 'base64')),
            decipher.final()
        ]);
        
        try {
            return JSON.parse(decrypted.toString());
        } catch {
            return decrypted;
        }
    }

    async _autoDecrypt(encryptedPackage, privateKey, quantumPrivateKey) {
        const encryptionType = this._detectEncryptionType(encryptedPackage);
        
        switch (encryptionType) {
            case 'classical':
                return await this._classicalDecrypt(encryptedPackage);
            
            case 'quantum':
                if (!quantumPrivateKey) {
                    throw new Error('Quantum private key required for quantum decryption');
                }
                return await this.quantumService.decrypt(encryptedPackage, quantumPrivateKey, encryptedPackage.algorithm);
            
            case 'hybrid':
                // Try quantum first, fallback to classical
                try {
                    if (quantumPrivateKey) {
                        return await this.quantumService.decrypt(encryptedPackage.quantum, quantumPrivateKey, encryptedPackage.quantum.algorithm);
                    }
                } catch (error) {
                    console.warn('Quantum decryption failed, trying classical:', error.message);
                }
                return await this._classicalDecrypt(encryptedPackage.classical);
            
            case 'dual':
                // Try both methods
                if (quantumPrivateKey) {
                    try {
                        return await this.quantumService.decrypt(encryptedPackage.quantum, quantumPrivateKey, encryptedPackage.quantum.algorithm);
                    } catch (error) {
                        console.warn('Quantum decryption failed in dual mode, trying classical:', error.message);
                    }
                }
                return await this._classicalDecrypt(encryptedPackage.classical);
            
            default:
                throw new Error(`Unknown encryption type: ${encryptionType}`);
        }
    }

    async _manualDecrypt(encryptedPackage, privateKey, quantumPrivateKey) {
        // Implementation for manual decryption with explicit key selection
        return await this._autoDecrypt(encryptedPackage, privateKey, quantumPrivateKey);
    }

    _detectEncryptionType(encryptedPackage) {
        if (encryptedPackage.type === 'classical_encrypted') {
            return 'classical';
        } else if (encryptedPackage.type === 'quantum_encrypted') {
            return 'quantum';
        } else if (encryptedPackage.type === 'hybrid_encrypted') {
            return 'hybrid';
        } else if (encryptedPackage.type === 'dual_encrypted') {
            return 'dual';
        } else {
            // Try to detect based on structure
            if (encryptedPackage.classical && encryptedPackage.quantum) {
                return 'hybrid';
            } else if (encryptedPackage.encryptedSessionKey) {
                return 'quantum';
            } else if (encryptedPackage.key && encryptedPackage.iv) {
                return 'classical';
            }
            return 'unknown';
        }
    }

    async _testCrossCompatibility(testData) {
        const compatibility = {};
        
        try {
            // Test encryption with one method, decryption with another
            const classicalEncrypted = await this._classicalEncrypt(testData, 'AES256_GCM');
            const quantumEncrypted = await this._quantumEncrypt(testData, 'CRYSTALS_KYBER');
            
            // Test various combinations
            compatibility.classical_to_classical = {
                success: true,
                result: await this._classicalDecrypt(classicalEncrypted)
            };
            
            compatibility.quantum_to_quantum = {
                success: true,
                result: await this.quantumService.decrypt(quantumEncrypted, quantumEncrypted.privateKey, quantumEncrypted.algorithm)
            };
            
        } catch (error) {
            compatibility.error = error.message;
        }
        
        return compatibility;
    }
}

module.exports = new HybridEncryptionService();
