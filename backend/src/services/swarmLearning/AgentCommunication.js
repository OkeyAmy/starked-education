const EventEmitter = require('events');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class AgentCommunication extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      encryptionEnabled: options.encryptionEnabled !== false,
      authenticationEnabled: options.authenticationEnabled !== false,
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      messageTimeout: options.messageTimeout || 30000, // 30 seconds
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      ...options
    };

    this.messageQueue = [];
    this.activeConnections = new Map();
    this.messageHistory = new Map();
    this.messageHandlers = new Map();
    this.encryptionKeys = new Map();
    
    // Message types
    this.MESSAGE_TYPES = {
      KNOWLEDGE_SHARE: 'knowledge_share',
      COORDINATION: 'coordination',
      CONSENSUS_REQUEST: 'consensus_request',
      CONSENSUS_RESPONSE: 'consensus_response',
      HEARTBEAT: 'heartbeat',
      EMERGENCY: 'emergency',
      DISCOVERY: 'discovery',
      TASK_ASSIGNMENT: 'task_assignment',
      PERFORMANCE_REPORT: 'performance_report'
    };
  }

  /**
   * Initialize communication system
   */
  async initialize(agentId) {
    this.agentId = agentId;
    
    // Generate encryption keys
    if (this.config.encryptionEnabled) {
      await this._generateEncryptionKeys();
    }
    
    // Setup message handlers
    this._setupMessageHandlers();
    
    // Start message processing
    this._startMessageProcessor();
    
    logger.info(`Agent communication initialized for: ${agentId}`);
  }

  /**
   * Generate encryption keys for secure communication
   */
  async _generateEncryptionKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    this.encryptionKeys.set('public', publicKey);
    this.encryptionKeys.set('private', privateKey);
    
    logger.info('Encryption keys generated');
  }

  /**
   * Setup message handlers for different message types
   */
  _setupMessageHandlers() {
    this.messageHandlers.set(this.MESSAGE_TYPES.KNOWLEDGE_SHARE, this._handleKnowledgeShare.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.COORDINATION, this._handleCoordination.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.CONSENSUS_REQUEST, this._handleConsensusRequest.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.CONSENSUS_RESPONSE, this._handleConsensusResponse.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.HEARTBEAT, this._handleHeartbeat.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.EMERGENCY, this._handleEmergency.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.DISCOVERY, this._handleDiscovery.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.TASK_ASSIGNMENT, this._handleTaskAssignment.bind(this));
    this.messageHandlers.set(this.MESSAGE_TYPES.PERFORMANCE_REPORT, this._handlePerformanceReport.bind(this));
  }

  /**
   * Start message processor
   */
  _startMessageProcessor() {
    setInterval(() => {
      this._processMessageQueue();
    }, 100); // Process every 100ms
  }

  /**
   * Process message queue
   */
  _processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    const message = this.messageQueue.shift();
    this._processMessage(message);
  }

  /**
   * Process incoming message
   */
  async _processMessage(message) {
    try {
      // Verify message integrity
      if (!await this._verifyMessage(message)) {
        logger.warn(`Message verification failed: ${message.id}`);
        return;
      }
      
      // Decrypt message if encrypted
      if (message.encrypted) {
        message.payload = await this._decryptMessage(message.payload);
      }
      
      // Route to appropriate handler
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        await handler(message);
      } else {
        logger.warn(`No handler for message type: ${message.type}`);
      }
      
      // Store in message history
      this._storeMessage(message);
      
    } catch (error) {
      logger.error(`Error processing message: ${error.message}`);
      this.emit('messageError', { message, error });
    }
  }

  /**
   * Verify message integrity and authenticity
   */
  async _verifyMessage(message) {
    if (!this.config.authenticationEnabled) return true;
    
    try {
      // Verify signature
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(JSON.stringify(message.payload));
      verifier.update(message.timestamp);
      
      const isValid = verifier.verify(message.senderPublicKey, message.signature, 'base64');
      
      // Check timestamp (prevent replay attacks)
      const messageAge = Date.now() - new Date(message.timestamp).getTime();
      const isRecent = messageAge < this.config.messageTimeout;
      
      return isValid && isRecent;
    } catch (error) {
      logger.error(`Message verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Decrypt message payload
   */
  async _decryptMessage(encryptedPayload) {
    try {
      const privateKey = this.encryptionKeys.get('private');
      return crypto.privateDecrypt(privateKey, Buffer.from(encryptedPayload, 'base64')).toString();
    } catch (error) {
      logger.error(`Message decryption error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store message in history
   */
  _storeMessage(message) {
    if (!this.messageHistory.has(message.sender)) {
      this.messageHistory.set(message.sender, []);
    }
    
    const senderHistory = this.messageHistory.get(message.sender);
    senderHistory.push({
      id: message.id,
      type: message.type,
      timestamp: message.timestamp,
      size: JSON.stringify(message.payload).length
    });
    
    // Keep only last 100 messages per sender
    if (senderHistory.length > 100) {
      senderHistory.shift();
    }
  }

  /**
   * Send message to specific agent
   */
  async sendMessage(recipientId, messageType, payload, options = {}) {
    const message = await this._createMessage(recipientId, messageType, payload, options);
    
    try {
      // Send through appropriate channel
      await this._sendThroughChannel(message);
      
      this.emit('messageSent', { messageId: message.id, recipientId, messageType });
      return message.id;
      
    } catch (error) {
      logger.error(`Failed to send message: ${error.message}`);
      
      // Retry if configured
      if (options.retry !== false && this.config.retryAttempts > 0) {
        await this._retryMessage(message, options);
      }
      
      throw error;
    }
  }

  /**
   * Create message with proper formatting and security
   */
  async _createMessage(recipientId, messageType, payload, options = {}) {
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    let messagePayload = payload;
    let encrypted = false;
    
    // Encrypt if required
    if (this.config.encryptionEnabled && options.encrypt !== false) {
      messagePayload = await this._encryptPayload(payload, recipientId);
      encrypted = true;
    }
    
    const message = {
      id: messageId,
      sender: this.agentId,
      recipient: recipientId,
      type: messageType,
      payload: messagePayload,
      timestamp,
      encrypted,
      priority: options.priority || 'normal',
      ttl: options.ttl || 3
    };
    
    // Add signature if authentication enabled
    if (this.config.authenticationEnabled) {
      message.senderPublicKey = this.encryptionKeys.get('public');
      message.signature = this._signMessage(message);
    }
    
    return message;
  }

  /**
   * Encrypt message payload
   */
  async _encryptPayload(payload, recipientId) {
    try {
      // In a real implementation, you would use the recipient's public key
      // For now, we'll use symmetric encryption for simplicity
      const cipher = crypto.createCipher('aes-256-cbc', 'encryption-key');
      let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      logger.error(`Message encryption error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sign message for authentication
   */
  _signMessage(message) {
    const privateKey = this.encryptionKeys.get('private');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(JSON.stringify(message.payload));
    signer.update(message.timestamp);
    return signer.sign(privateKey, 'base64');
  }

  /**
   * Send message through appropriate channel
   */
  async _sendThroughChannel(message) {
    // In a real implementation, this would use actual network communication
    // For now, we'll simulate the sending process
    
    const connection = this.activeConnections.get(message.recipient);
    
    if (!connection) {
      throw new Error(`No active connection to ${message.recipient}`);
    }
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Simulate message delivery
    this.emit('messageDelivered', { messageId: message.id, recipient: message.recipient });
  }

  /**
   * Retry message sending
   */
  async _retryMessage(message, options) {
    let attempts = 0;
    const maxAttempts = options.retryAttempts || this.config.retryAttempts;
    const retryDelay = options.retryDelay || this.config.retryDelay;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        await this._sendThroughChannel(message);
        
        logger.info(`Message retry successful after ${attempts} attempts`);
        return;
        
      } catch (error) {
        logger.warn(`Message retry ${attempts} failed: ${error.message}`);
        
        if (attempts >= maxAttempts) {
          this.emit('messageFailed', { messageId: message.id, recipient: message.recipient, attempts });
          throw new Error(`Message failed after ${maxAttempts} attempts`);
        }
      }
    }
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcastMessage(recipientIds, messageType, payload, options = {}) {
    const promises = recipientIds.map(recipientId => 
      this.sendMessage(recipientId, messageType, payload, options)
    );
    
    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.emit('broadcastCompleted', { 
        successful, 
        failed, 
        total: recipientIds.length 
      });
      
      return { successful, failed, results };
      
    } catch (error) {
      logger.error(`Broadcast failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Establish connection with another agent
   */
  async establishConnection(agentId, agentInfo) {
    try {
      // Exchange public keys if encryption enabled
      let remotePublicKey = null;
      if (this.config.encryptionEnabled) {
        remotePublicKey = await this._exchangePublicKey(agentId);
      }
      
      // Store connection info
      this.activeConnections.set(agentId, {
        id: agentId,
        info: agentInfo,
        publicKey: remotePublicKey,
        established: new Date().toISOString(),
        status: 'active',
        messageCount: 0,
        lastActivity: new Date().toISOString()
      });
      
      // Send handshake
      await this._sendHandshake(agentId);
      
      logger.info(`Connection established with agent: ${agentId}`);
      this.emit('connectionEstablished', { agentId });
      
    } catch (error) {
      logger.error(`Failed to establish connection with ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exchange public keys with another agent
   */
  async _exchangePublicKey(agentId) {
    // In a real implementation, this would involve a secure key exchange protocol
    // For now, we'll simulate the exchange
    return crypto.randomBytes(256).toString('base64');
  }

  /**
   * Send handshake message
   */
  async _sendHandshake(agentId) {
    const handshakePayload = {
      agentId: this.agentId,
      capabilities: this._getAgentCapabilities(),
      timestamp: new Date().toISOString()
    };
    
    await this.sendMessage(agentId, this.MESSAGE_TYPES.DISCOVERY, handshakePayload);
  }

  /**
   * Get agent capabilities for handshake
   */
  _getAgentCapabilities() {
    return {
      computation: 1.0,
      communication: 1.0,
      storage: 1.0,
      specialization: 'general',
      supportedMessageTypes: Object.values(this.MESSAGE_TYPES)
    };
  }

  /**
   * Close connection with agent
   */
  async closeConnection(agentId) {
    const connection = this.activeConnections.get(agentId);
    if (!connection) return;
    
    // Send goodbye message
    try {
      await this.sendMessage(agentId, this.MESSAGE_TYPES.DISCOVERY, {
        type: 'goodbye',
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`Failed to send goodbye to ${agentId}: ${error.message}`);
    }
    
    // Remove connection
    this.activeConnections.delete(agentId);
    
    logger.info(`Connection closed with agent: ${agentId}`);
    this.emit('connectionClosed', { agentId });
  }

  /**
   * Message handlers
   */
  async _handleKnowledgeShare(message) {
    this.emit('knowledgeShareReceived', {
      sender: message.sender,
      knowledge: message.payload,
      timestamp: message.timestamp
    });
  }

  async _handleCoordination(message) {
    this.emit('coordinationReceived', {
      sender: message.sender,
      coordination: message.payload,
      timestamp: message.timestamp
    });
  }

  async _handleConsensusRequest(message) {
    // Process consensus request and send response
    const response = await this._processConsensusRequest(message.payload);
    
    await this.sendMessage(
      message.sender,
      this.MESSAGE_TYPES.CONSENSUS_RESPONSE,
      response,
      { priority: 'high' }
    );
  }

  async _handleConsensusResponse(message) {
    this.emit('consensusResponseReceived', {
      sender: message.sender,
      response: message.payload,
      timestamp: message.timestamp
    });
  }

  async _handleHeartbeat(message) {
    // Update connection activity
    const connection = this.activeConnections.get(message.sender);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
      connection.messageCount++;
    }
    
    // Send heartbeat response
    await this.sendMessage(
      message.sender,
      this.MESSAGE_TYPES.HEARTBEAT,
      { status: 'alive', timestamp: new Date().toISOString() }
    );
  }

  async _handleEmergency(message) {
    this.emit('emergencyReceived', {
      sender: message.sender,
      emergency: message.payload,
      timestamp: message.timestamp
    });
  }

  async _handleDiscovery(message) {
    const payload = message.payload;
    
    if (payload.type === 'goodbye') {
      // Handle agent departure
      await this.closeConnection(message.sender);
    } else {
      // Handle new agent discovery
      await this._handleAgentDiscovery(message.sender, payload);
    }
  }

  async _handleAgentDiscovery(senderId, agentInfo) {
    // Establish connection if not already connected
    if (!this.activeConnections.has(senderId)) {
      await this.establishConnection(senderId, agentInfo);
    }
    
    this.emit('agentDiscovered', { agentId: senderId, agentInfo });
  }

  async _handleTaskAssignment(message) {
    this.emit('taskAssigned', {
      sender: message.sender,
      task: message.payload,
      timestamp: message.timestamp
    });
  }

  async _handlePerformanceReport(message) {
    this.emit('performanceReportReceived', {
      sender: message.sender,
      report: message.payload,
      timestamp: message.timestamp
    });
  }

  /**
   * Process consensus request
   */
  async _processConsensusRequest(request) {
    // Simulate consensus processing
    return {
      requestId: request.id,
      response: Math.random() > 0.5 ? 'agree' : 'disagree',
      confidence: Math.random(),
      reasoning: `Agent ${this.agentId} consensus response`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send knowledge to neighbors
   */
  async shareKnowledge(knowledge, recipientIds = null) {
    const recipients = recipientIds || Array.from(this.activeConnections.keys());
    
    const payload = {
      knowledge,
      senderId: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    return await this.broadcastMessage(
      recipients,
      this.MESSAGE_TYPES.KNOWLEDGE_SHARE,
      payload,
      { priority: 'normal' }
    );
  }

  /**
   * Send coordination message
   */
  async sendCoordination(coordinationData, recipientIds = null) {
    const recipients = recipientIds || Array.from(this.activeConnections.keys());
    
    const payload = {
      coordination: coordinationData,
      senderId: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    return await this.broadcastMessage(
      recipients,
      this.MESSAGE_TYPES.COORDINATION,
      payload,
      { priority: 'high' }
    );
  }

  /**
   * Request consensus from neighbors
   */
  async requestConsensus(proposal, recipientIds = null) {
    const recipients = recipientIds || Array.from(this.activeConnections.keys());
    
    const payload = {
      id: crypto.randomUUID(),
      proposal,
      senderId: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    const results = await this.broadcastMessage(
      recipients,
      this.MESSAGE_TYPES.CONSENSUS_REQUEST,
      payload,
      { priority: 'high', ttl: 1 }
    );
    
    return results;
  }

  /**
   * Send emergency broadcast
   */
  async sendEmergency(emergencyData) {
    const payload = {
      emergency: emergencyData,
      senderId: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    return await this.broadcastMessage(
      Array.from(this.activeConnections.keys()),
      this.MESSAGE_TYPES.EMERGENCY,
      payload,
      { priority: 'critical', ttl: 10 }
    );
  }

  /**
   * Send heartbeat to all connections
   */
  async sendHeartbeat() {
    const payload = {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
    
    return await this.broadcastMessage(
      Array.from(this.activeConnections.keys()),
      this.MESSAGE_TYPES.HEARTBEAT,
      payload,
      { priority: 'low' }
    );
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const connections = {};
    
    for (const [agentId, connection] of this.activeConnections) {
      connections[agentId] = {
        established: connection.established,
        status: connection.status,
        messageCount: connection.messageCount,
        lastActivity: connection.lastActivity
      };
    }
    
    return {
      totalConnections: this.activeConnections.size,
      connections,
      messageQueueSize: this.messageQueue.length,
      messageHistorySize: Array.from(this.messageHistory.values())
        .reduce((total, history) => total + history.length, 0)
    };
  }

  /**
   * Get message statistics
   */
  getMessageStatistics() {
    const stats = {
      sent: 0,
      received: 0,
      failed: 0,
      byType: {}
    };
    
    // Count messages in history
    for (const [sender, history] of this.messageHistory) {
      for (const message of history) {
        stats.received++;
        
        if (!stats.byType[message.type]) {
          stats.byType[message.type] = 0;
        }
        stats.byType[message.type]++;
      }
    }
    
    return stats;
  }

  /**
   * Cleanup connections and resources
   */
  async cleanup() {
    // Close all connections
    const connectionIds = Array.from(this.activeConnections.keys());
    for (const agentId of connectionIds) {
      await this.closeConnection(agentId);
    }
    
    // Clear queues and history
    this.messageQueue = [];
    this.messageHistory.clear();
    this.activeConnections.clear();
    
    logger.info('Agent communication cleaned up');
  }
}

module.exports = AgentCommunication;
