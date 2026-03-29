import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import axios from 'axios';

export interface CrossChainMessage {
  messageId: string;
  sender: string;
  sourceChain: number;
  destinationChain: number;
  payload: any;
  messageType: 'CredentialVerification' | 'DataSync' | 'TokenTransfer' | 'GovernanceVote' | 'Custom';
  status: 'Pending' | 'InTransit' | 'Delivered' | 'Failed';
  gasLimit: number;
  nonce: number;
  createdAt: Date;
  deliveredAt?: Date;
}

export interface ProtocolAdapter {
  adapterId: string;
  name: string;
  protocolType: string;
  isActive: boolean;
  supportedChains: number[];
  totalMessages: number;
  successRate: number;
}

interface StateProof {
  proofId: string;
  blockNumber: number;
  stateRoot: string;
  proofData: string;
  timestamp: Date;
  validatorSignatures: string[];
}

export class CrossProtocolBridgeService {
  private redis: Redis | null = null;
  private messages: Map<string, CrossChainMessage> = new Map();
  private adapters: Map<string, ProtocolAdapter> = new Map();
  private supportedChains: Map<number, string> = new Map();
  
  // LayerZero-style messaging endpoints
  private layerzeroEndpoint = process.env.LAYERZERO_ENDPOINT || '';
  private wormholeEndpoint = process.env.WORMHOLE_ENDPOINT || '';

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    
    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || undefined,
      });
      
      // Initialize default chains
      this.initializeDefaultChains();
    } catch (error) {
      console.warn('Redis not available, using in-memory storage');
    }
  }

  /**
   * Initialize default supported chains
   */
  private async initializeDefaultChains(): Promise<void> {
    this.supportedChains.set(0, 'Stellar Mainnet');
    this.supportedChains.set(1, 'Ethereum Mainnet');
    this.supportedChains.set(56, 'BSC');
    this.supportedChains.set(137, 'Polygon');
    this.supportedChains.set(42161, 'Arbitrum');
    this.supportedChains.set(10, 'Optimism');
  }

  /**
   * Register a protocol adapter
   */
  async registerProtocolAdapter(
    name: string,
    protocolType: string,
    supportedChains: number[]
  ): Promise<ProtocolAdapter> {
    const adapterId = uuidv4();
    
    const adapter: ProtocolAdapter = {
      adapterId,
      name,
      protocolType,
      isActive: true,
      supportedChains,
      totalMessages: 0,
      successRate: 100, // Percentage
    };

    this.adapters.set(adapterId, adapter);
    
    if (this.redis) {
      await this.redis.setex(`adapter:${adapterId}`, 86400 * 30, JSON.stringify(adapter));
    }

    return adapter;
  }

  /**
   * Send a cross-chain message
   */
  async sendMessage(
    sender: string,
    destinationChain: number,
    payload: any,
    messageType: CrossChainMessage['messageType'],
    gasLimit: number
  ): Promise<string> {
    // Verify destination chain is supported
    if (!this.supportedChains.has(destinationChain)) {
      throw new Error(`Destination chain ${destinationChain} not supported`);
    }

    const messageId = uuidv4();
    
    // Get nonce for destination
    const nonce = await this.getDestinationNonce(destinationChain);

    const message: CrossChainMessage = {
      messageId,
      sender,
      sourceChain: 0, // Stellar
      destinationChain,
      payload,
      messageType,
      status: 'Pending',
      gasLimit,
      nonce,
      createdAt: new Date(),
    };

    this.messages.set(messageId, message);
    
    // Increment nonce
    await this.incrementDestinationNonce(destinationChain);

    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(`message:${messageId}`, 86400, JSON.stringify(message));
      await this.redis.lpush(`sender-messages:${sender}`, messageId);
    }

    // Emit event
    await this.emitEvent('message_sent', { messageId, sender, destinationChain, messageType });

    return messageId;
  }

  /**
   * Deliver a cross-chain message (called by relayer)
   */
  async deliverMessage(messageId: string, relayer: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status !== 'Pending' && message.status !== 'InTransit') {
      throw new Error('Message cannot be delivered in current status');
    }

    message.status = 'Delivered';
    message.deliveredAt = new Date();

    this.messages.set(messageId, message);
    
    if (this.redis) {
      await this.redis.setex(`message:${messageId}`, 86400, JSON.stringify(message));
    }

    // Update adapter stats
    await this.updateAdapterStats(message.messageType, true);

    // Emit event
    await this.emitEvent('message_delivered', { 
      messageId, 
      destinationChain: message.destinationChain,
      relayer 
    });
  }

  /**
   * Batch multiple messages for gas optimization
   */
  async batchMessages(messageIds: string[]): Promise<string> {
    const batchId = uuidv4();
    
    // Validate all messages exist and are pending
    for (const messageId of messageIds) {
      const message = this.messages.get(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }
      if (message.status !== 'Pending') {
        throw new Error(`Message ${messageId} is not pending`);
      }

      // Update status to InTransit
      message.status = 'InTransit';
      this.messages.set(messageId, message);
    }

    // Store batch
    if (this.redis) {
      await this.redis.setex(`batch:${batchId}`, 86400, JSON.stringify(messageIds));
    }

    // Emit event
    await this.emitEvent('messages_batched', { batchId, count: messageIds.length });

    return batchId;
  }

  /**
   * Submit state proof for verification
   */
  async submitStateProof(
    blockNumber: number,
    stateRoot: string,
    proofData: string,
    validatorSignatures: string[]
  ): Promise<string> {
    const proofId = uuidv4();
    
    const proof: StateProof = {
      proofId,
      blockNumber,
      stateRoot,
      proofData,
      timestamp: new Date(),
      validatorSignatures,
    };

    if (this.redis) {
      await this.redis.setex(`state-proof:${proofId}`, 86400 * 7, JSON.stringify(proof));
    }

    return proofId;
  }

  /**
   * Verify state proof
   */
  async verifyStateProof(proofId: string): Promise<boolean> {
    if (!this.redis) {
      throw new Error('Redis required for proof verification');
    }

    const proofData = await this.redis.get(`state-proof:${proofId}`);
    if (!proofData) {
      throw new Error('Proof not found');
    }

    const proof: StateProof = JSON.parse(proofData);
    
    // Require minimum number of validator signatures
    if (proof.validatorSignatures.length < 3) {
      throw new Error('Insufficient validator signatures');
    }

    // Simplified verification - in production use actual cryptographic verification
    return true;
  }

  /**
   * Get message details
   */
  async getMessage(messageId: string): Promise<CrossChainMessage | null> {
    if (this.redis) {
      const cached = await this.redis.get(`message:${messageId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    return this.messages.get(messageId) || null;
  }

  /**
   * Get messages by sender
   */
  async getMessagesBySender(sender: string): Promise<CrossChainMessage[]> {
    if (this.redis) {
      const messageIds = await this.redis.lrange(`sender-messages:${sender}`, 0, -1);
      const messages: CrossChainMessage[] = [];
      
      for (const messageId of messageIds) {
        const message = await this.getMessage(messageId);
        if (message) {
          messages.push(message);
        }
      }
      
      return messages;
    }
    
    return Array.from(this.messages.values()).filter(m => m.sender === sender);
  }

  /**
   * Get protocol adapter
   */
  async getProtocolAdapter(adapterId: string): Promise<ProtocolAdapter | null> {
    if (this.redis) {
      const cached = await this.redis.get(`adapter:${adapterId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    return this.adapters.get(adapterId) || null;
  }

  /**
   * Calculate gas cost for cross-chain message
   */
  calculateGasCost(destinationChain: number, gasLimit: number): number {
    const gasPrices: Record<number, number> = {
      0: 100, // Stellar
      1: 500, // Ethereum (higher gas)
      56: 50, // BSC
      137: 30, // Polygon
      42161: 40, // Arbitrum
      10: 40, // Optimism
    };

    const gasPrice = gasPrices[destinationChain] || 100;
    return gasPrice * gasLimit;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalMessages: number;
    deliveredMessages: number;
    pendingMessages: number;
    failedMessages: number;
    activeAdapters: number;
  }> {
    const messages = Array.from(this.messages.values());
    
    return {
      totalMessages: messages.length,
      deliveredMessages: messages.filter(m => m.status === 'Delivered').length,
      pendingMessages: messages.filter(m => m.status === 'Pending' || m.status === 'InTransit').length,
      failedMessages: messages.filter(m => m.status === 'Failed').length,
      activeAdapters: Array.from(this.adapters.values()).filter(a => a.isActive).length,
    };
  }

  // ========== Helper Functions ==========

  private async getDestinationNonce(destinationChain: number): Promise<number> {
    const key = `destination-nonce:${destinationChain}`;
    
    if (this.redis) {
      const nonce = await this.redis.get(key);
      return nonce ? parseInt(nonce) : 0;
    }
    
    return 0;
  }

  private async incrementDestinationNonce(destinationChain: number): Promise<void> {
    const key = `destination-nonce:${destinationChain}`;
    
    if (this.redis) {
      await this.redis.incr(key);
    }
  }

  private async updateAdapterStats(messageType: string, success: boolean): Promise<void> {
    // Find relevant adapter and update stats
    // Simplified implementation
  }

  private async emitEvent(event: string, data: any): Promise<void> {
    if (!this.redis) return;

    await this.redis.publish(
      'cross-protocol-events',
      JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export const crossProtocolBridgeService = new CrossProtocolBridgeService();
