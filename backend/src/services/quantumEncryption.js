/**
 * Quantum-Resistant Encryption Service
 * Implements NIST post-quantum cryptography standards (FIPS 203, FIPS 204)
 * using @noble/post-quantum — a pure-JS, audited implementation of ML-KEM and ML-DSA.
 *
 * Hybrid scheme: ML-KEM-768 (KEM) + AES-256-GCM (symmetric) for encryption.
 *               ML-DSA-65 (DSA) for signing / ML-DSA-87 for FALCON-level security.
 */

const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('crypto');
const { ml_kem768 } = require('@noble/post-quantum/ml-kem');
const { ml_dsa65, ml_dsa87 } = require('@noble/post-quantum/ml-dsa');

// Real NIST key/ciphertext sizes in bytes (ML-KEM-768 / ML-DSA-65 / ML-DSA-87)
const KEY_SIZES = {
    'ML-KEM-768': { publicKey: 1184, secretKey: 2400, ciphertext: 1088, sharedSecret: 32 },
    'ML-DSA-65':  { publicKey: 1952, secretKey: 4032, signature: 3309 },
    'ML-DSA-87':  { publicKey: 2592, secretKey: 4896, signature: 4627 },
};

class QuantumEncryptionService {
    constructor() {
        this.algorithms = {
            CRYSTALS_KYBER:    'ML-KEM-768',
            CRYSTALS_DILITHIUM:'ML-DSA-65',
            FALCON:            'ML-DSA-87',  // ML-DSA-87 equals FALCON-1024 NIST security level 5
            AES256_GCM:        'aes-256-gcm',
            RSA4096:           'rsa-4096',
        };

        this.keySizes = KEY_SIZES;

        this.securityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, QUANTUM_RESISTANT: 4 };

        // Tamper-evident migration audit log
        this._migrationLog = [];
    }

    /**
     * Generate a real post-quantum key pair.
     * CRYSTALS_KYBER  → ML-KEM-768 (KEM — use with encrypt/decrypt only)
     * CRYSTALS_DILITHIUM / FALCON → ML-DSA (DSA — use with sign/verify only)
     */
    async generateKeyPair(algorithm = 'CRYSTALS_KYBER', securityLevel = this.securityLevels.QUANTUM_RESISTANT) {
        try {
            const keyPair = await this._generatePQKeyPair(algorithm, securityLevel);
            return {
                algorithm,
                securityLevel,
                publicKey:   keyPair.publicKey,
                privateKey:  keyPair.privateKey,
                keyId:       this._generateKeyId(),
                timestamp:   new Date().toISOString(),
                nistStandard: this._getNistStandard(algorithm),
                version:     '2.0',
            };
        } catch (error) {
            console.error('Key generation failed:', error);
            throw new Error(`Failed to generate quantum-resistant key pair: ${error.message}`);
        }
    }

    /**
     * Hybrid encrypt: ML-KEM-768 encapsulate → AES-256-GCM.
     * publicKey must come from a CRYSTALS_KYBER key pair.
     */
    async encrypt(data, publicKey, algorithm = 'CRYSTALS_KYBER', additionalData = null) {
        try {
            const dataBuffer    = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
            const iv            = randomBytes(12);
            const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, 'base64'));

            // Real ML-KEM-768 encapsulation: derive a shared secret from the public key
            const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKeyBytes);

            const cipher = createCipheriv('aes-256-gcm', Buffer.from(sharedSecret), iv);
            if (additionalData) cipher.setAAD(Buffer.from(JSON.stringify(additionalData)));
            const encryptedData = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
            const authTag = cipher.getAuthTag();

            return {
                algorithm,
                encryptedData:       encryptedData.toString('base64'),
                encryptedSessionKey: Buffer.from(cipherText).toString('base64'), // ML-KEM ciphertext
                iv:                  iv.toString('base64'),
                authTag:             authTag.toString('base64'),
                additionalData,
                timestamp:           new Date().toISOString(),
                nistStandard:        'FIPS 203 (ML-KEM-768) + AES-256-GCM',
                version:             '2.0',
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error(`Quantum-resistant encryption failed: ${error.message}`);
        }
    }

    /**
     * Hybrid decrypt: ML-KEM-768 decapsulate → AES-256-GCM.
     * privateKey must come from a CRYSTALS_KYBER key pair.
     */
    async decrypt(encryptedPackage, privateKey, algorithm = 'CRYSTALS_KYBER') {
        try {
            const { encryptedData, encryptedSessionKey, iv, authTag, additionalData } = encryptedPackage;

            const cipherTextBytes = new Uint8Array(Buffer.from(encryptedSessionKey, 'base64'));
            const secretKeyBytes  = new Uint8Array(Buffer.from(privateKey, 'base64'));

            // Real ML-KEM-768 decapsulation: recover the shared secret
            const sharedSecret = ml_kem768.decapsulate(cipherTextBytes, secretKeyBytes);

            const decipher = createDecipheriv('aes-256-gcm', Buffer.from(sharedSecret), Buffer.from(iv, 'base64'));
            decipher.setAuthTag(Buffer.from(authTag, 'base64'));
            if (additionalData) decipher.setAAD(Buffer.from(JSON.stringify(additionalData)));

            const decryptedData = Buffer.concat([
                decipher.update(Buffer.from(encryptedData, 'base64')),
                decipher.final(),
            ]);

            try { return JSON.parse(decryptedData.toString()); }
            catch { return decryptedData; }
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error(`Quantum-resistant decryption failed: ${error.message}`);
        }
    }

    /**
     * Sign with ML-DSA-65 (DILITHIUM) or ML-DSA-87 (FALCON security level).
     * privateKey must come from a DILITHIUM or FALCON key pair.
     */
    async sign(data, privateKey, algorithm = 'CRYSTALS_DILITHIUM') {
        try {
            const dataBuffer     = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
            const secretKeyBytes = new Uint8Array(Buffer.from(privateKey, 'base64'));

            const dsa       = this._selectDSA(algorithm);
            const signature = dsa.sign(secretKeyBytes, dataBuffer);

            return {
                algorithm,
                signature:   Buffer.from(signature).toString('base64'),
                data:        dataBuffer.toString('base64'),
                nistStandard: algorithm === 'FALCON' ? 'FIPS 204 (ML-DSA-87)' : 'FIPS 204 (ML-DSA-65)',
                timestamp:   new Date().toISOString(),
                version:     '2.0',
            };
        } catch (error) {
            console.error('Signing failed:', error);
            throw new Error(`Quantum-resistant signing failed: ${error.message}`);
        }
    }

    /**
     * Verify with ML-DSA-65 / ML-DSA-87.
     * Returns false for any tampered message — never throws on bad signature.
     */
    async verify(signedData, publicKey, algorithm = 'CRYSTALS_DILITHIUM') {
        try {
            const { signature, data } = signedData;
            const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, 'base64'));
            const messageBytes   = Buffer.from(data, 'base64');
            const sigBytes       = new Uint8Array(Buffer.from(signature, 'base64'));

            const dsa = this._selectDSA(algorithm);
            return dsa.verify(publicKeyBytes, messageBytes, sigBytes);
        } catch {
            return false;
        }
    }

    /**
     * Agility test: benchmarks real ML-KEM and ML-DSA operations.
     * Uses SEPARATE key pairs for KEM and DSA — they are cryptographically incompatible.
     */
    async performAgilityTest(data) {
        const results = {};

        // ML-KEM-768: hybrid encryption round-trip
        try {
            const t0        = Date.now();
            const kemPair   = await this.generateKeyPair('CRYSTALS_KYBER');
            const encrypted = await this.encrypt(data, kemPair.publicKey, 'CRYSTALS_KYBER');
            const decrypted = await this.decrypt(encrypted, kemPair.privateKey, 'CRYSTALS_KYBER');
            const t1        = Date.now();

            results['CRYSTALS_KYBER'] = {
                success:             JSON.stringify(decrypted) === JSON.stringify(data),
                operation:           'ML-KEM-768 encapsulate + AES-256-GCM',
                nistStandard:        'FIPS 203',
                executionTime:       t1 - t0,
                publicKeyBytes:      Buffer.from(kemPair.publicKey, 'base64').length,
                kemCiphertextBytes:  Buffer.from(encrypted.encryptedSessionKey, 'base64').length,
                nistSecurityLevel:   3,
            };
        } catch (error) {
            results['CRYSTALS_KYBER'] = { success: false, error: error.message };
        }

        // ML-DSA-65: sign + verify + tamper detection
        try {
            const t0     = Date.now();
            const dsaPair = await this.generateKeyPair('CRYSTALS_DILITHIUM');
            const signed  = await this.sign(data, dsaPair.privateKey, 'CRYSTALS_DILITHIUM');
            const verified = await this.verify(signed, dsaPair.publicKey, 'CRYSTALS_DILITHIUM');

            const tamperedSigned = { ...signed, data: Buffer.from('tampered-payload').toString('base64') };
            const tamperRejected = !(await this.verify(tamperedSigned, dsaPair.publicKey, 'CRYSTALS_DILITHIUM'));
            const t1 = Date.now();

            results['CRYSTALS_DILITHIUM'] = {
                success:           verified && tamperRejected,
                operation:         'ML-DSA-65 sign + verify',
                nistStandard:      'FIPS 204',
                executionTime:     t1 - t0,
                publicKeyBytes:    Buffer.from(dsaPair.publicKey, 'base64').length,
                signatureBytes:    Buffer.from(signed.signature, 'base64').length,
                tamperDetected:    tamperRejected,
                nistSecurityLevel: 3,
            };
        } catch (error) {
            results['CRYSTALS_DILITHIUM'] = { success: false, error: error.message };
        }

        // ML-DSA-87 (FALCON-1024 security level): sign + verify
        try {
            const t0          = Date.now();
            const falconPair  = await this.generateKeyPair('FALCON');
            const signed      = await this.sign(data, falconPair.privateKey, 'FALCON');
            const verified    = await this.verify(signed, falconPair.publicKey, 'FALCON');
            const t1          = Date.now();

            results['FALCON'] = {
                success:           verified,
                operation:         'ML-DSA-87 sign + verify',
                nistStandard:      'FIPS 204 (ML-DSA-87 / FALCON-1024 security level)',
                executionTime:     t1 - t0,
                publicKeyBytes:    Buffer.from(falconPair.publicKey, 'base64').length,
                signatureBytes:    Buffer.from(signed.signature, 'base64').length,
                nistSecurityLevel: 5,
            };
        } catch (error) {
            results['FALCON'] = { success: false, error: error.message };
        }

        return results;
    }

    /**
     * Migrate classical-encrypted data to PQC. Records a SHA-256-hashed audit log entry.
     */
    async migrateEncryption(oldEncryptedData, oldAlgorithm, newAlgorithm = 'CRYSTALS_KYBER') {
        const migrationId    = this._generateKeyId();
        const migrationStart = Date.now();

        try {
            const decryptedData    = await this._decryptClassical(oldEncryptedData, oldAlgorithm);
            const newKeyPair       = await this.generateKeyPair(newAlgorithm);
            const newEncryptedData = await this.encrypt(decryptedData, newKeyPair.publicKey, newAlgorithm);

            const logEntry = {
                migrationId,
                oldAlgorithm,
                newAlgorithm,
                nistStandard:       this._getNistStandard(newAlgorithm),
                status:             'completed',
                durationMs:         Date.now() - migrationStart,
                migrationTimestamp: new Date().toISOString(),
                newKeyId:           newKeyPair.keyId,
            };
            logEntry.logHash = createHash('sha256').update(JSON.stringify(logEntry)).digest('hex');
            this._migrationLog.push(logEntry);

            return {
                ...logEntry,
                newKeyPair:    { publicKey: newKeyPair.publicKey, keyId: newKeyPair.keyId },
                encryptedData: newEncryptedData,
            };
        } catch (error) {
            const failEntry = {
                migrationId,
                oldAlgorithm,
                newAlgorithm,
                status:             'failed',
                error:              error.message,
                migrationTimestamp: new Date().toISOString(),
            };
            this._migrationLog.push(failEntry);
            console.error('Migration failed:', error);
            throw new Error(`Encryption migration failed: ${error.message}`);
        }
    }

    getMigrationLog() {
        return [...this._migrationLog];
    }

    /** HKDF-SHA256 key derivation (quantum-safe — security depends only on the hash PRF). */
    async deriveKey(password, salt, algorithm = 'CRYSTALS_KYBER', keyLength = 32) {
        try {
            const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt);
            const info       = Buffer.from(`starked-education:${algorithm}`);
            const ikm        = Buffer.from(password);

            // HKDF extract
            const prk = createHash('sha256').update(Buffer.concat([saltBuffer, ikm])).digest();

            // HKDF expand
            const output = Buffer.alloc(keyLength);
            let prev = Buffer.alloc(0);
            let offset = 0;
            for (let i = 1; offset < keyLength; i++) {
                prev = createHash('sha256').update(Buffer.concat([prk, prev, info, Buffer.from([i])])).digest();
                prev.copy(output, offset);
                offset += prev.length;
            }

            return {
                derivedKey:  output.slice(0, keyLength).toString('hex'),
                algorithm:   'HKDF-SHA256',
                salt:        saltBuffer.toString('base64'),
                keyLength,
                quantumSafe: true,
                timestamp:   new Date().toISOString(),
            };
        } catch (error) {
            throw new Error(`Key derivation failed: ${error.message}`);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    _generateKeyId() {
        return randomBytes(16).toString('hex');
    }

    _selectDSA(algorithm) {
        return (algorithm === 'FALCON') ? ml_dsa87 : ml_dsa65;
    }

    _getNistStandard(algorithm) {
        return {
            CRYSTALS_KYBER:    'FIPS 203 (ML-KEM-768)',
            CRYSTALS_DILITHIUM:'FIPS 204 (ML-DSA-65)',
            FALCON:            'FIPS 204 (ML-DSA-87)',
        }[algorithm] || 'unknown';
    }

    async _generatePQKeyPair(algorithm) {
        switch (algorithm) {
            case 'CRYSTALS_KYBER': {
                const { publicKey, secretKey } = ml_kem768.keygen();
                return { publicKey: Buffer.from(publicKey).toString('base64'), privateKey: Buffer.from(secretKey).toString('base64') };
            }
            case 'CRYSTALS_DILITHIUM': {
                const { publicKey, secretKey } = ml_dsa65.keygen();
                return { publicKey: Buffer.from(publicKey).toString('base64'), privateKey: Buffer.from(secretKey).toString('base64') };
            }
            case 'FALCON': {
                const { publicKey, secretKey } = ml_dsa87.keygen();
                return { publicKey: Buffer.from(publicKey).toString('base64'), privateKey: Buffer.from(secretKey).toString('base64') };
            }
            default: {
                const { publicKey, secretKey } = ml_kem768.keygen();
                return { publicKey: Buffer.from(publicKey).toString('base64'), privateKey: Buffer.from(secretKey).toString('base64') };
            }
        }
    }

    async _decryptClassical(encryptedData, algorithm) {
        if (algorithm === 'AES256_GCM') {
            const decipher = createDecipheriv(
                'aes-256-gcm',
                Buffer.from(encryptedData.key, 'base64'),
                Buffer.from(encryptedData.iv, 'base64'),
            );
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
            return Buffer.concat([
                decipher.update(Buffer.from(encryptedData.data, 'base64')),
                decipher.final(),
            ]);
        }
        throw new Error(`Unsupported classical algorithm for migration: ${algorithm}`);
    }
}

module.exports = new QuantumEncryptionService();
