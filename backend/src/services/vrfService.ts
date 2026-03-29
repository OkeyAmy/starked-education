import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import crypto from 'crypto';

interface VRFRequest {
  requestId: string;
  requester: string;
  seed: string;
  purpose: string;
  context: string;
  blockNumber: number;
  isFulfilled: boolean;
  randomValue?: string;
  proof?: string;
  createdAt: Date;
}

interface EntropySource {
  sourceId: string;
  name: string;
  provider: string;
  weight: number;
  isActive: boolean;
  totalContributions: number;
}

interface RandomnessBeacon {
  beaconId: string;
  entropyHash: string;
  timestamp: Date;
  blockNumber: number;
  contributors: string[];
  isVerified: boolean;
}

export class VRFService {
  private redis: Redis | null = null;
  private beacons: Map<string, RandomnessBeacon> = new Map();
  private requests: Map<string, VRFRequest> = new Map();

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    
    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || undefined,
      });
      
      // Initialize default beacon if none exists
      this.initializeDefaultBeacon();
    } catch (error) {
      console.warn('Redis not available, using in-memory storage');
    }
  }

  /**
   * Initialize default randomness beacon
   */
  private async initializeDefaultBeacon(): Promise<void> {
    const entropyHash = this.generateEntropyHash(crypto.randomBytes(32));
    const beacon: RandomnessBeacon = {
      beaconId: 'default',
      entropyHash,
      timestamp: new Date(),
      blockNumber: 1,
      contributors: ['blockchain-entropy'],
      isVerified: true,
    };

    this.beacons.set('default', beacon);
    
    if (this.redis) {
      await this.redis.setex('beacon:default', 86400, JSON.stringify(beacon));
    }
  }

  /**
   * Register an entropy source
   */
  async registerEntropySource(
    name: string,
    provider: string,
    weight: number
  ): Promise<EntropySource> {
    if (weight > 10000) {
      throw new Error('Weight must be <= 10000');
    }

    const sourceId = uuidv4();
    const source: EntropySource = {
      sourceId,
      name,
      provider,
      weight,
      isActive: true,
      totalContributions: 0,
    };

    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(`entropy-source:${sourceId}`, 86400 * 30, JSON.stringify(source));
    }

    return source;
  }

  /**
   * Request verifiable randomness
   */
  async requestRandomness(
    requester: string,
    seed: string,
    purpose: string,
    context: string
  ): Promise<string> {
    const requestId = uuidv4();
    
    const request: VRFRequest = {
      requestId,
      requester,
      seed,
      purpose,
      context,
      blockNumber: await this.getCurrentBlockNumber(),
      isFulfilled: false,
      createdAt: new Date(),
    };

    this.requests.set(requestId, request);

    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(`vrf-request:${requestId}`, 86400, JSON.stringify(request));
      
      // Index by user
      await this.redis.lpush(`user-requests:${requester}`, requestId);
    }

    // Emit event
    await this.emitEvent('randomness_requested', { requestId, requester, purpose });

    return requestId;
  }

  /**
   * Submit entropy contribution from registered source
   */
  async submitEntropy(
    sourceId: string,
    requestId: string,
    entropy: string
  ): Promise<void> {
    const source = await this.getEntropySource(sourceId);
    if (!source) {
      throw new Error('Entropy source not found');
    }

    if (!source.isActive) {
      throw new Error('Entropy source is not active');
    }

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('VRF request not found');
    }

    if (request.isFulfilled) {
      throw new Error('Request already fulfilled');
    }

    // Aggregate entropy
    const aggregatedSeed = this.aggregateEntropy(request.seed, entropy);
    request.seed = aggregatedSeed;

    // Update source stats
    source.totalContributions += 1;
    
    this.requests.set(requestId, request);
    
    if (this.redis) {
      await this.redis.setex(`vrf-request:${requestId}`, 86400, JSON.stringify(request));
      await this.redis.setex(`entropy-source:${sourceId}`, 86400 * 30, JSON.stringify(source));
    }
  }

  /**
   * Fulfill VRF request with final random value and proof
   */
  async fulfillRandomness(
    requestId: string,
    randomValue: string,
    proof: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('VRF request not found');
    }

    if (request.isFulfilled) {
      throw new Error('Request already fulfilled');
    }

    request.isFulfilled = true;
    request.randomValue = randomValue;
    request.proof = proof;

    this.requests.set(requestId, request);
    
    if (this.redis) {
      await this.redis.setex(`vrf-request:${requestId}`, 86400, JSON.stringify(request));
    }

    // Emit event
    await this.emitEvent('randomness_fulfilled', { 
      requestId, 
      randomValue,
      purpose: request.purpose 
    });
  }

  /**
   * Create randomness beacon from aggregated entropy
   */
  async createBeacon(
    entropyHash: string,
    contributors: string[]
  ): Promise<string> {
    const beaconId = uuidv4();
    
    const beacon: RandomnessBeacon = {
      beaconId,
      entropyHash,
      timestamp: new Date(),
      blockNumber: await this.getCurrentBlockNumber(),
      contributors,
      isVerified: true,
    };

    this.beacons.set(beaconId, beacon);
    
    if (this.redis) {
      await this.redis.setex(`beacon:${beaconId}`, 86400, JSON.stringify(beacon));
      await this.redis.set('latest-beacon-id', beaconId);
    }

    return beaconId;
  }

  /**
   * Generate random number for specific purpose
   */
  async generateRandomForPurpose(
    requester: string,
    purpose: string,
    seed: string,
    min: number,
    max: number
  ): Promise<number> {
    // Get latest beacon
    const beacon = await this.getLatestBeacon();
    if (!beacon) {
      throw new Error('No randomness beacon available');
    }

    // Combine seed with beacon entropy
    const combined = this.combineSeeds(seed, beacon.entropyHash);
    
    // Generate random value in range
    const randomValue = this.randomInRange(combined, min, max);

    // Log usage
    await this.emitEvent('random_generated', {
      purpose,
      requester,
      randomValue,
    });

    return randomValue;
  }

  /**
   * Commit to a value (commit-reveal scheme)
   */
  async commit(
    committer: string,
    commitmentHash: string,
    validUntil: Date
  ): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis required for commit-reveal');
    }

    const key = `commitment:${committer}:${Date.now()}`;
    const ttl = Math.floor((validUntil.getTime() - Date.now()) / 1000);
    
    await this.redis.setex(key, ttl, JSON.stringify({
      hash: commitmentHash,
      validUntil: validUntil.toISOString(),
      createdAt: new Date().toISOString(),
    }));
  }

  /**
   * Reveal committed value
   */
  async reveal(
    committer: string,
    revealedValue: string
  ): Promise<boolean> {
    if (!this.redis) {
      throw new Error('Redis required for commit-reveal');
    }

    // Find commitment (simplified - in production use specific key)
    const keys = await this.redis.keys(`commitment:${committer}:*`);
    if (keys.length === 0) {
      throw new Error('No commitment found');
    }

    const commitmentData = await this.redis.get(keys[0]);
    if (!commitmentData) {
      throw new Error('Commitment not found');
    }

    const commitment = JSON.parse(commitmentData);
    
    // Verify the reveal matches the commitment
    const computedHash = this.hashReveal(revealedValue);
    if (computedHash !== commitment.hash) {
      throw new Error('Reveal does not match commitment');
    }

    // Clean up
    await this.redis.del(keys[0]);

    return true;
  }

  /**
   * Get VRF request details
   */
  async getRequest(requestId: string): Promise<VRFRequest | null> {
    if (this.redis) {
      const cached = await this.redis.get(`vrf-request:${requestId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    return this.requests.get(requestId) || null;
  }

  /**
   * Get requests by user
   */
  async getRequestsByUser(requester: string): Promise<VRFRequest[]> {
    if (this.redis) {
      const requestIds = await this.redis.lrange(`user-requests:${requester}`, 0, -1);
      const requests: VRFRequest[] = [];
      
      for (const requestId of requestIds) {
        const request = await this.getRequest(requestId);
        if (request) {
          requests.push(request);
        }
      }
      
      return requests;
    }
    
    return Array.from(this.requests.values()).filter(r => r.requester === requester);
  }

  /**
   * Get entropy source
   */
  async getEntropySource(sourceId: string): Promise<EntropySource | null> {
    if (this.redis) {
      const cached = await this.redis.get(`entropy-source:${sourceId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    return null;
  }

  /**
   * Get latest beacon
   */
  async getLatestBeacon(): Promise<RandomnessBeacon | null> {
    if (this.redis) {
      const beaconId = await this.redis.get('latest-beacon-id');
      if (beaconId) {
        const cached = await this.redis.get(`beacon:${beaconId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    }
    
    // Return most recent from memory
    const beacons = Array.from(this.beacons.values());
    return beacons.length > 0 ? beacons[beacons.length - 1] : null;
  }

  /**
   * Verify randomness proof
   */
  async verifyProof(requestId: string, proof: string): Promise<boolean> {
    const request = await this.getRequest(requestId);
    if (!request || !request.proof) {
      return false;
    }
    
    return request.proof === proof;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalRequests: number;
    fulfilledRequests: number;
    activeSources: number;
    totalBeacons: number;
  }> {
    const requests = Array.from(this.requests.values());
    const fulfilledCount = requests.filter(r => r.isFulfilled).length;
    
    return {
      totalRequests: requests.length,
      fulfilledRequests: fulfilledCount,
      activeSources: 1, // Default blockchain entropy
      totalBeacons: this.beacons.size,
    };
  }

  // ========== Helper Functions ==========

  private generateEntropyHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private aggregateEntropy(entropy1: string, entropy2: string): string {
    const combined = Buffer.concat([
      Buffer.from(entropy1, 'hex'),
      Buffer.from(entropy2, 'hex')
    ]);
    return this.generateEntropyHash(combined);
  }

  private combineSeeds(seed1: string, seed2: string): Buffer {
    const combined = Buffer.concat([
      Buffer.from(seed1, 'hex'),
      Buffer.from(seed2, 'hex')
    ]);
    return Buffer.from(this.generateEntropyHash(combined), 'hex');
  }

  private randomInRange(data: Buffer, min: number, max: number): number {
    const range = max - min + 1;
    const value = data.readUInt32BE(0);
    return min + (value % range);
  }

  private hashReveal(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async getCurrentBlockNumber(): Promise<number> {
    // Simplified - in production, get from blockchain
    return Math.floor(Date.now() / 1000);
  }

  private async emitEvent(event: string, data: any): Promise<void> {
    if (!this.redis) return;

    await this.redis.publish(
      'vrf-events',
      JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export const vrfService = new VRFService();
