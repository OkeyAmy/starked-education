const EventEmitter = require('events');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class FederatedLearningCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      minParticipants: options.minParticipants || 3,
      maxParticipants: options.maxParticipants || 100,
      aggregationRounds: options.aggregationRounds || 10,
      learningRate: options.learningRate || 0.01,
      privacyBudget: options.privacyBudget || 1.0,
      timeoutMs: options.timeoutMs || 300000, // 5 minutes
      ...options
    };

    this.participants = new Map();
    this.globalModel = null;
    this.currentRound = 0;
    this.aggregationHistory = [];
    this.activeRound = null;
    this.modelVersions = [];
  }

  /**
   * Initialize federated learning session
   */
  async initializeSession(modelArchitecture, initialWeights = null) {
    const sessionId = uuidv4();
    
    this.globalModel = {
      id: sessionId,
      architecture: modelArchitecture,
      weights: initialWeights || this._generateRandomWeights(modelArchitecture),
      version: 0,
      timestamp: new Date().toISOString(),
      metadata: {
        participants: 0,
        rounds: 0,
        accuracy: 0,
        loss: 0
      }
    };

    this.modelVersions.push({ ...this.globalModel });
    
    logger.info(`Federated learning session initialized: ${sessionId}`);
    this.emit('sessionInitialized', { sessionId, model: this.globalModel });
    
    return sessionId;
  }

  /**
   * Register a new participant
   */
  async registerParticipant(participantInfo) {
    const participantId = uuidv4();
    
    const participant = {
      id: participantId,
      institutionId: participantInfo.institutionId,
      endpoint: participantInfo.endpoint,
      publicKey: participantInfo.publicKey,
      dataInfo: participantInfo.dataInfo,
      reputation: participantInfo.reputation || 1.0,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      contributions: []
    };

    // Validate participant
    if (!this._validateParticipant(participant)) {
      throw new Error('Invalid participant information');
    }

    this.participants.set(participantId, participant);
    
    logger.info(`Participant registered: ${participantId} from institution ${participant.institutionId}`);
    this.emit('participantRegistered', participant);
    
    return participantId;
  }

  /**
   * Start a new federated learning round
   */
  async startRound(roundConfig = {}) {
    if (this.participants.size < this.config.minParticipants) {
      throw new Error(`Insufficient participants. Minimum required: ${this.config.minParticipants}`);
    }

    this.currentRound++;
    
    const round = {
      id: uuidv4(),
      roundNumber: this.currentRound,
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null,
      participants: new Set(),
      modelUpdates: new Map(),
      aggregationMethod: roundConfig.aggregationMethod || 'fedavg',
      privacyParams: {
        epsilon: roundConfig.epsilon || this.config.privacyBudget / this.config.aggregationRounds,
        delta: roundConfig.delta || 1e-5,
        clipNorm: roundConfig.clipNorm || 1.0
      }
    };

    this.activeRound = round;
    
    // Distribute current global model to participants
    await this._distributeModel();
    
    logger.info(`Round ${this.currentRound} started with ${this.participants.size} participants`);
    this.emit('roundStarted', round);
    
    return round;
  }

  /**
   * Receive model update from participant
   */
  async receiveModelUpdate(participantId, updateData) {
    if (!this.activeRound || this.activeRound.status !== 'active') {
      throw new Error('No active round to receive updates');
    }

    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error('Unknown participant');
    }

    // Verify update authenticity and integrity
    if (!this._verifyUpdateSignature(participantId, updateData)) {
      throw new Error('Invalid update signature');
    }

    // Apply differential privacy noise
    const noisyUpdate = this._applyDifferentialPrivacy(updateData, this.activeRound.privacyParams);
    
    // Store update
    this.activeRound.modelUpdates.set(participantId, {
      update: noisyUpdate,
      timestamp: new Date().toISOString(),
      participantInfo: {
        institutionId: participant.institutionId,
        dataInfo: participant.dataInfo,
        reputation: participant.reputation
      }
    });

    this.activeRound.participants.add(participantId);
    participant.lastActive = new Date().toISOString();
    participant.contributions.push({
      round: this.currentRound,
      timestamp: new Date().toISOString(),
      dataSize: updateData.dataSize
    });

    logger.info(`Model update received from participant ${participantId}`);
    this.emit('updateReceived', { participantId, roundId: this.activeRound.id });

    // Check if round should complete
    if (this.activeRound.participants.size >= this.config.minParticipants) {
      await this._completeRound();
    }

    return { status: 'received', roundId: this.activeRound.id };
  }

  /**
   * Complete current round and aggregate updates
   */
  async _completeRound() {
    if (!this.activeRound) return;

    this.activeRound.status = 'aggregating';
    this.activeRound.endTime = new Date().toISOString();

    try {
      // Aggregate model updates
      const aggregatedWeights = await this._aggregateUpdates();
      
      // Update global model
      this.globalModel.weights = aggregatedWeights;
      this.globalModel.version++;
      this.globalModel.metadata.participants = this.activeRound.participants.size;
      this.globalModel.metadata.rounds = this.currentRound;
      this.globalModel.timestamp = new Date().toISOString();

      // Store model version
      this.modelVersions.push({ ...this.globalModel });

      // Update round status
      this.activeRound.status = 'completed';
      this.activeRound.aggregatedWeights = aggregatedWeights;

      this.aggregationHistory.push({
        round: this.currentRound,
        participants: this.activeRound.participants.size,
        timestamp: new Date().toISOString(),
        accuracy: await this._evaluateModel(),
        privacySpent: this.activeRound.privacyParams.epsilon
      });

      logger.info(`Round ${this.currentRound} completed successfully`);
      this.emit('roundCompleted', {
        round: this.activeRound,
        globalModel: this.globalModel,
        accuracy: this.aggregationHistory[this.aggregationHistory.length - 1].accuracy
      });

      this.activeRound = null;

    } catch (error) {
      logger.error(`Round ${this.currentRound} aggregation failed:`, error);
      this.activeRound.status = 'failed';
      this.emit('roundFailed', { round: this.activeRound, error });
    }
  }

  /**
   * Aggregate model updates using specified method
   */
  async _aggregateUpdates() {
    const updates = Array.from(this.activeRound.modelUpdates.values());
    const method = this.activeRound.aggregationMethod;

    switch (method) {
      case 'fedavg':
        return this._federatedAveraging(updates);
      case 'weighted':
        return this._weightedAggregation(updates);
      case 'secure':
        return this._secureAggregation(updates);
      default:
        throw new Error(`Unknown aggregation method: ${method}`);
    }
  }

  /**
   * Federated Averaging (FedAvg) algorithm
   */
  _federatedAveraging(updates) {
    if (updates.length === 0) return this.globalModel.weights;

    const totalWeight = updates.reduce((sum, update) => sum + update.update.dataSize, 0);
    const averagedWeights = {};

    // Get weight dimensions from first update
    const weightKeys = Object.keys(updates[0].update.weights);

    for (const key of weightKeys) {
      averagedWeights[key] = updates.reduce((sum, update) => {
        const contribution = (update.update.dataSize / totalWeight) * update.update.weights[key];
        return sum + contribution;
      }, 0);
    }

    return averagedWeights;
  }

  /**
   * Weighted aggregation based on participant reputation
   */
  _weightedAggregation(updates) {
    if (updates.length === 0) return this.globalModel.weights;

    const totalReputation = updates.reduce((sum, update) => sum + update.participantInfo.reputation, 0);
    const weightedWeights = {};

    const weightKeys = Object.keys(updates[0].update.weights);

    for (const key of weightKeys) {
      weightedWeights[key] = updates.reduce((sum, update) => {
        const weight = (update.participantInfo.reputation / totalReputation) * update.update.weights[key];
        return sum + weight;
      }, 0);
    }

    return weightedWeights;
  }

  /**
   * Apply differential privacy noise
   */
  _applyDifferentialPrivacy(updateData, privacyParams) {
    const noisyWeights = { ...updateData.weights };
    const { epsilon, delta, clipNorm } = privacyParams;

    for (const key in noisyWeights) {
      // Clip gradients
      noisyWeights[key] = Math.max(-clipNorm, Math.min(clipNorm, noisyWeights[key]));
      
      // Add Laplace noise
      const sensitivity = 2 * clipNorm / updateData.dataSize;
      const scale = sensitivity / epsilon;
      const noise = this._laplaceNoise(0, scale);
      
      noisyWeights[key] += noise;
    }

    return {
      ...updateData,
      weights: noisyWeights,
      privacyParams
    };
  }

  /**
   * Generate Laplace noise
   */
  _laplaceNoise(mu = 0, b = 1) {
    const u = Math.random() - 0.5;
    return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Verify update signature
   */
  _verifyUpdateSignature(participantId, updateData) {
    const participant = this.participants.get(participantId);
    if (!participant || !participant.publicKey) return true; // Skip verification for testing

    // In production, implement proper cryptographic signature verification
    // For now, return true for simplicity
    return true;
  }

  /**
   * Distribute current model to participants
   */
  async _distributeModel() {
    const distributionPromises = Array.from(this.participants.values()).map(async (participant) => {
      try {
        // In production, send encrypted model to participant endpoint
        logger.debug(`Distributing model to participant ${participant.id}`);
        this.emit('modelDistributed', {
          participantId: participant.id,
          model: this.globalModel,
          roundId: this.activeRound.id
        });
      } catch (error) {
        logger.error(`Failed to distribute model to participant ${participant.id}:`, error);
      }
    });

    await Promise.allSettled(distributionPromises);
  }

  /**
   * Generate random weights for model initialization
   */
  _generateRandomWeights(architecture) {
    const weights = {};
    for (const layer of architecture.layers) {
      weights[layer.name] = Array(layer.size).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    }
    return weights;
  }

  /**
   * Validate participant information
   */
  _validateParticipant(participant) {
    return participant.institutionId && 
           participant.endpoint && 
           participant.dataInfo && 
           participant.dataInfo.features > 0;
  }

  /**
   * Evaluate model performance (placeholder)
   */
  async _evaluateModel() {
    // In production, implement actual model evaluation
    return Math.random() * 0.3 + 0.7; // Random accuracy between 0.7-1.0
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      participants: this.participants.size,
      currentRound: this.currentRound,
      activeRound: this.activeRound?.status || 'none',
      modelVersion: this.globalModel?.version || 0,
      aggregationHistory: this.aggregationHistory,
      privacyBudgetUsed: this.aggregationHistory.reduce((sum, round) => sum + round.privacySpent, 0)
    };
  }

  /**
   * Get participant information
   */
  getParticipantInfo(participantId) {
    return this.participants.get(participantId);
  }

  /**
   * Get model version history
   */
  getModelHistory() {
    return this.modelVersions;
  }
}

module.exports = FederatedLearningCoordinator;
