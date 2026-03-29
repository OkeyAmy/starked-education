const express = require('express');
const { body, validationResult } = require('express-validator');
const StellarSDK = require('@stellar/stellar-sdk');
const { createClient } = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Initialize Stellar client
const server = new StellarSDK.Horizon.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
const contractId = process.env.CONSCIOUSNESS_CONTRACT_ID;

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/consciousness/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types for neural data
    const allowedTypes = ['.json', '.bin', '.dat', '.npz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .json, .bin, .dat, .npz files are allowed.'));
    }
  }
});

// Neural encoding algorithms
class NeuralEncoder {
  static async encodeConsciousness(neuralData, encodingVersion = 1) {
    try {
      switch (encodingVersion) {
        case 1:
          return await this.encodeV1(neuralData);
        case 2:
          return await this.encodeV2(neuralData);
        default:
          throw new Error(`Unsupported encoding version: ${encodingVersion}`);
      }
    } catch (error) {
      throw new Error(`Neural encoding failed: ${error.message}`);
    }
  }

  static async encodeV1(neuralData) {
    // Basic neural encoding using hash and compression
    const dataString = typeof neuralData === 'string' ? neuralData : JSON.stringify(neuralData);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    // Simulate neural vector encoding (in production, would use actual ML models)
    const neuralVector = Buffer.from(dataString, 'utf8');
    const compressedVector = await this.compressData(neuralVector);
    
    return {
      neuralHash: hash,
      knowledgeVector: Array.from(compressedVector),
      encodingVersion: 1,
      metadata: {
        algorithm: 'basic-neural-hash',
        compression: 'gzip',
        timestamp: Date.now()
      }
    };
  }

  static async encodeV2(neuralData) {
    // Advanced neural encoding with pattern recognition
    const dataString = typeof neuralData === 'string' ? neuralData : JSON.stringify(neuralData);
    
    // Create multiple hash layers for better verification
    const layer1Hash = crypto.createHash('sha256').update(dataString).digest('hex');
    const layer2Hash = crypto.createHash('sha256').update(layer1Hash).digest('hex');
    const finalHash = crypto.createHash('sha256').update(layer2Hash).digest('hex');
    
    // Extract neural patterns (simplified)
    const patterns = this.extractNeuralPatterns(dataString);
    const neuralVector = Buffer.concat([
      Buffer.from(finalHash, 'hex'),
      Buffer.from(JSON.stringify(patterns))
    ]);
    
    const compressedVector = await this.compressData(neuralVector);
    
    return {
      neuralHash: finalHash,
      knowledgeVector: Array.from(compressedVector),
      encodingVersion: 2,
      metadata: {
        algorithm: 'advanced-neural-pattern',
        compression: 'lz4',
        patterns: patterns.length,
        timestamp: Date.now()
      }
    };
  }

  static extractNeuralPatterns(data) {
    // Simplified pattern extraction (in production, use actual ML)
    const patterns = [];
    const words = data.split(/\s+/);
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Extract top patterns
    Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 100)
      .forEach(([word, count]) => {
        patterns.push({ word, frequency: count });
      });
    
    return patterns;
  }

  static async compressData(data) {
    return new Promise((resolve, reject) => {
      const zlib = require('zlib');
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }
}

// Upload consciousness to blockchain
router.post('/upload', upload.single('neuralData'), [
  body('ownerPublicKey').isString().isLength({ min: 56, max: 56 }),
  body('encodingVersion').isInt({ min: 1, max: 2 }),
  body('previousConsciousnessId').optional().isString(),
  body('knowledgeTransferData').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ownerPublicKey, encodingVersion, previousConsciousnessId, knowledgeTransferData } = req.body;
    const neuralDataFile = req.file;

    if (!neuralDataFile) {
      return res.status(400).json({ error: 'Neural data file is required' });
    }

    // Read neural data
    const neuralDataBuffer = await fs.readFile(neuralDataFile.path);
    const neuralData = neuralDataBuffer.toString('utf8');

    // Clean up uploaded file
    await fs.unlink(neuralDataFile.path);

    // Encode consciousness
    const encoded = await NeuralEncoder.encodeConsciousness(neuralData, parseInt(encodingVersion));

    // Create continuity proof if previous consciousness exists
    let continuityProof = null;
    if (previousConsciousnessId && knowledgeTransferData) {
      continuityProof = await createContinuityProof(
        previousConsciousnessId,
        knowledgeTransferData,
        ownerPublicKey
      );
    }

    // Upload to Stellar blockchain
    const consciousnessId = await uploadToStellar(
      ownerPublicKey,
      encoded.knowledgeVector,
      encodingVersion,
      continuityProof
    );

    // Store metadata in database
    await storeConsciousnessMetadata({
      consciousnessId,
      ownerPublicKey,
      encodingVersion,
      neuralHash: encoded.neuralHash,
      metadata: encoded.metadata,
      continuityProof,
      createdAt: new Date()
    });

    res.json({
      success: true,
      consciousnessId,
      neuralHash: encoded.neuralHash,
      encodingVersion,
      metadata: encoded.metadata
    });

  } catch (error) {
    console.error('Consciousness upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify consciousness integrity
router.post('/verify', [
  body('consciousnessId').isString(),
  body('verificationHash').isString().isLength({ min: 64, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { consciousnessId, verificationHash } = req.body;

    // Verify on blockchain
    const isValid = await verifyOnStellar(consciousnessId, verificationHash);

    // Update verification status in database
    await updateVerificationStatus(consciousnessId, isValid);

    res.json({
      success: true,
      isValid,
      consciousnessId,
      verifiedAt: new Date()
    });

  } catch (error) {
    console.error('Consciousness verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Transfer consciousness
router.post('/transfer', [
  body('consciousnessId').isString(),
  body('currentOwnerPublicKey').isString().isLength({ min: 56, max: 56 }),
  body('newOwnerPublicKey').isString().isLength({ min: 56, max: 56 }),
  body('transferProof').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { consciousnessId, currentOwnerPublicKey, newOwnerPublicKey, transferProof } = req.body;

    // Verify transfer proof
    const proofValid = await verifyTransferProof(
      consciousnessId,
      currentOwnerPublicKey,
      newOwnerPublicKey,
      transferProof
    );

    if (!proofValid) {
      return res.status(400).json({ error: 'Invalid transfer proof' });
    }

    // Execute transfer on blockchain
    const transferSuccess = await transferOnStellar(
      consciousnessId,
      newOwnerPublicKey,
      transferProof
    );

    if (!transferSuccess) {
      return res.status(500).json({ error: 'Transfer failed on blockchain' });
    }

    // Update ownership in database
    await updateOwnership(consciousnessId, newOwnerPublicKey);

    res.json({
      success: true,
      consciousnessId,
      transferredTo: newOwnerPublicKey,
      transferredAt: new Date()
    });

  } catch (error) {
    console.error('Consciousness transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List consciousness on marketplace
router.post('/marketplace/list', [
  body('consciousnessId').isString(),
  body('ownerPublicKey').isString().isLength({ min: 56, max: 56 }),
  body('price').isFloat({ min: 0 }),
  body('accessDuration').isInt({ min: 3600 }), // Minimum 1 hour
  body('licenseType').isInt({ min: 0, max: 2 }) // 0: Full, 1: ReadOnly, 2: Learning
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { consciousnessId, ownerPublicKey, price, accessDuration, licenseType } = req.body;

    // Verify ownership
    const isOwner = await verifyOwnership(consciousnessId, ownerPublicKey);
    if (!isOwner) {
      return res.status(403).json({ error: 'Not the owner of this consciousness' });
    }

    // List on marketplace
    const listingSuccess = await listOnMarketplace(
      consciousnessId,
      price,
      accessDuration,
      licenseType
    );

    if (!listingSuccess) {
      return res.status(500).json({ error: 'Failed to list on marketplace' });
    }

    // Store listing in database
    await storeMarketplaceListing({
      consciousnessId,
      ownerPublicKey,
      price,
      accessDuration,
      licenseType,
      listedAt: new Date()
    });

    res.json({
      success: true,
      consciousnessId,
      price,
      accessDuration,
      licenseType,
      listedAt: new Date()
    });

  } catch (error) {
    console.error('Marketplace listing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Purchase consciousness access
router.post('/marketplace/purchase', [
  body('consciousnessId').isString(),
  body('buyerPublicKey').isString().isLength({ min: 56, max: 56 }),
  body('paymentProof').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { consciousnessId, buyerPublicKey, paymentProof } = req.body;

    // Process payment and grant access
    const purchaseSuccess = await purchaseConsciousnessAccess(
      consciousnessId,
      buyerPublicKey,
      paymentProof
    );

    if (!purchaseSuccess) {
      return res.status(500).json({ error: 'Purchase failed' });
    }

    // Get access details
    const accessDetails = await getAccessDetails(consciousnessId, buyerPublicKey);

    res.json({
      success: true,
      consciousnessId,
      accessGranted: true,
      accessDetails
    });

  } catch (error) {
    console.error('Consciousness purchase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get consciousness metadata
router.get('/metadata/:consciousnessId', async (req, res) => {
  try {
    const { consciousnessId } = req.params;

    // Get metadata from database
    const metadata = await getConsciousnessMetadata(consciousnessId);
    if (!metadata) {
      return res.status(404).json({ error: 'Consciousness not found' });
    }

    // Get blockchain data
    const blockchainData = await getBlockchainData(consciousnessId);

    res.json({
      success: true,
      metadata,
      blockchain: blockchainData
    });

  } catch (error) {
    console.error('Get consciousness metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get owned consciousnesses
router.get('/owned/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;

    // Get owned consciousnesses from blockchain
    const ownedConsciousnesses = await getOwnedConsciousnesses(publicKey);

    // Get metadata for each
    const consciousnessesWithMetadata = await Promise.all(
      ownedConsciousnesses.map(async (id) => {
        const metadata = await getConsciousnessMetadata(id);
        return { id, metadata };
      })
    );

    res.json({
      success: true,
      consciousnesses: consciousnessesWithMetadata
    });

  } catch (error) {
    console.error('Get owned consciousnesses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions (would be implemented with actual Stellar SDK calls)
async function uploadToStellar(ownerPublicKey, knowledgeVector, encodingVersion, continuityProof) {
  // Implementation for uploading to Stellar blockchain
  // This would interact with the consciousness smart contract
  const consciousnessId = crypto.randomBytes(32).toString('hex');
  return consciousnessId;
}

async function verifyOnStellar(consciousnessId, verificationHash) {
  // Implementation for verification on blockchain
  return true;
}

async function transferOnStellar(consciousnessId, newOwnerPublicKey, transferProof) {
  // Implementation for transfer on blockchain
  return true;
}

async function listOnMarketplace(consciousnessId, price, accessDuration, licenseType) {
  // Implementation for marketplace listing
  return true;
}

async function purchaseConsciousnessAccess(consciousnessId, buyerPublicKey, paymentProof) {
  // Implementation for purchase processing
  return true;
}

async function createContinuityProof(previousId, knowledgeData, publicKey) {
  // Implementation for continuity proof creation
  return {
    previousConsciousnessId: previousId,
    lifetimeTransitionHash: crypto.randomBytes(32).toString('hex'),
    knowledgeTransferRatio: 8500, // 85%
    memoryIntegrityScore: 9200,    // 92%
    createdBy: publicKey,
    createdAt: new Date()
  };
}

async function verifyTransferProof(consciousnessId, currentOwner, newOwner, proof) {
  // Implementation for transfer proof verification
  return true;
}

async function verifyOwnership(consciousnessId, publicKey) {
  // Implementation for ownership verification
  return true;
}

// Database helper functions (would use actual database)
async function storeConsciousnessMetadata(metadata) {
  // Store in database
  console.log('Storing consciousness metadata:', metadata);
}

async function updateVerificationStatus(consciousnessId, isValid) {
  // Update verification status
  console.log('Updating verification status:', consciousnessId, isValid);
}

async function updateOwnership(consciousnessId, newOwner) {
  // Update ownership in database
  console.log('Updating ownership:', consciousnessId, newOwner);
}

async function storeMarketplaceListing(listing) {
  // Store marketplace listing
  console.log('Storing marketplace listing:', listing);
}

async function getConsciousnessMetadata(consciousnessId) {
  // Get metadata from database
  return {
    consciousnessId,
    owner: 'test-owner',
    encodingVersion: 1,
    neuralHash: 'test-hash',
    createdAt: new Date(),
    evolutionStage: 1
  };
}

async function getBlockchainData(consciousnessId) {
  // Get data from blockchain
  return {
    verified: true,
    evolutionStage: 1,
    experienceTimestamp: Date.now()
  };
}

async function getOwnedConsciousnesses(publicKey) {
  // Get owned consciousnesses from blockchain
  return ['test-consciousness-1', 'test-consciousness-2'];
}

async function getAccessDetails(consciousnessId, buyerPublicKey) {
  // Get access details
  return {
    accessGranted: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    licenseType: 1 // ReadOnly
  };
}

module.exports = router;
