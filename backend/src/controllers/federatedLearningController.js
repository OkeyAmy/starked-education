const FederatedLearningCoordinator = require('../services/federatedLearning/FederatedLearningCoordinator');
const SecureAggregation = require('../services/federatedLearning/SecureAggregation');
const DifferentialPrivacy = require('../services/federatedLearning/DifferentialPrivacy');
const ModelValidator = require('../services/federatedLearning/ModelValidator');
const AnalyticsDashboard = require('../services/federatedLearning/AnalyticsDashboard');
const ModelVersioning = require('../services/federatedLearning/ModelVersioning');
const logger = require('../utils/logger');
const Joi = require('joi');

const MODEL_HASH_REGEX = /^[a-f0-9]{64}$/i;
const MAX_MODEL_PAYLOAD_BYTES = 10 * 1024 * 1024;

const differentialPrivacySchema = Joi.object({
  epsilon: Joi.number().positive().max(10).optional(),
  delta: Joi.number().positive().max(1).optional(),
  mechanism: Joi.string().valid('laplace', 'gaussian').optional(),
});

const initSessionBodySchema = Joi.object({
  modelType: Joi.string().min(1).max(100).required(),
  minParticipants: Joi.number().integer().min(1).max(10000).required(),
  rounds: Joi.number().integer().min(1).max(10000).required(),
  aggregationStrategy: Joi.string().valid('fedAvg', 'fedProx', 'scaffold', 'mime').required(),
  modelArchitecture: Joi.object().optional(),
  initialWeights: Joi.any().optional(),
});

const registerParticipantBodySchema = Joi.object({
  sessionId: Joi.string().min(1).max(255).required(),
  publicKey: Joi.string().min(1).max(1024).required(),
  institutionId: Joi.string().min(1).max(255).required(),
  endpoint: Joi.string().uri().required(),
  capabilities: Joi.object().optional(),
  dataInfo: Joi.object().optional(),
});

const submitModelUpdateBodySchema = Joi.object({
  roundNumber: Joi.number().integer().min(0).required(),
  modelHash: Joi.string().pattern(MODEL_HASH_REGEX).required(),
  gradientShape: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  privacyParams: differentialPrivacySchema.optional(),
  weights: Joi.any().optional(),
  validationData: Joi.any().optional(),
});

/**
 * Validate req.body against a Joi schema. Returns a 400 response and false on failure,
 * or returns true if valid.
 */
function validateBody(schema, req, res) {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (!error) return true;
  res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
  });
  return false;
}

class FederatedLearningController {
  constructor() {
    this.coordinator = new FederatedLearningCoordinator();
    this.secureAggregation = new SecureAggregation();
    this.differentialPrivacy = new DifferentialPrivacy();
    this.modelValidator = new ModelValidator();
    this.analyticsDashboard = new AnalyticsDashboard();
    this.modelVersioning = new ModelVersioning();
    
    this.initializeServices();
  }

  async initializeServices() {
    try {
      await this.secureAggregation.initializeKeys();
      await this.analyticsDashboard.initialize();
      await this.modelVersioning.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      logger.info('Federated Learning services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize federated learning services:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.coordinator.on('sessionInitialized', (data) => {
      this.analyticsDashboard.recordSessionMetrics(data);
    });

    this.coordinator.on('participantRegistered', (participant) => {
      this.analyticsDashboard.recordParticipantMetrics(participant.id, participant);
    });

    this.coordinator.on('roundCompleted', (data) => {
      this.analyticsDashboard.recordRoundMetrics(data.round.id, {
        roundNumber: data.round.roundNumber,
        participantCount: data.round.participants.size,
        duration: Date.now() - new Date(data.round.startTime).getTime(),
        accuracy: data.accuracy,
        privacySpent: data.round.privacyParams.epsilon,
        aggregationMethod: data.round.aggregationMethod,
        status: data.round.status
      });
    });
  }

  // Session Management Endpoints
  async initializeSession(req, res) {
    try {
      if (!validateBody(initSessionBodySchema, req, res)) return;

      const { modelArchitecture, initialWeights } = req.body;

      const sessionId = await this.coordinator.initializeSession(modelArchitecture, initialWeights);
      
      // Create initial model version
      await this.modelVersioning.createVersion(this.coordinator.globalModel, {
        description: 'Initial model version',
        author: req.user?.id || 'system',
        tags: ['initial', 'federated-learning']
      });

      res.status(201).json({
        success: true,
        data: {
          sessionId,
          model: this.coordinator.globalModel,
          publicParameters: this.secureAggregation.getPublicParameters()
        }
      });
    } catch (error) {
      logger.error('Failed to initialize session:', error);
      res.status(500).json({
        error: 'Failed to initialize federated learning session',
        details: error.message
      });
    }
  }

  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      
      const sessionStats = this.coordinator.getSessionStats();
      const analyticsData = this.analyticsDashboard.getDashboardData();
      
      res.json({
        success: true,
        data: {
          session: sessionStats,
          analytics: analyticsData,
          modelHistory: this.coordinator.getModelHistory()
        }
      });
    } catch (error) {
      logger.error('Failed to get session status:', error);
      res.status(500).json({
        error: 'Failed to retrieve session status',
        details: error.message
      });
    }
  }

  // Participant Management Endpoints
  async registerParticipant(req, res) {
    try {
      if (!validateBody(registerParticipantBodySchema, req, res)) return;

      const participantInfo = req.body;

      const participantId = await this.coordinator.registerParticipant(participantInfo);
      
      // Record participant metrics
      this.analyticsDashboard.recordParticipantMetrics(participantId, {
        ...participantInfo,
        id: participantId,
        contributionCount: 0,
        averageAccuracy: 0,
        fairnessScore: 1.0,
        privacyCompliance: true
      });

      res.status(201).json({
        success: true,
        data: {
          participantId,
          publicParameters: this.secureAggregation.getPublicParameters()
        }
      });
    } catch (error) {
      logger.error('Failed to register participant:', error);
      res.status(500).json({
        error: 'Failed to register participant',
        details: error.message
      });
    }
  }

  async getParticipants(req, res) {
    try {
      const participants = Array.from(this.coordinator.participants.values()).map(p => ({
        id: p.id,
        institutionId: p.institutionId,
        status: p.status,
        reputation: p.reputation,
        registeredAt: p.registeredAt,
        lastActive: p.lastActive,
        contributionCount: p.contributions.length
      }));

      res.json({
        success: true,
        data: participants
      });
    } catch (error) {
      logger.error('Failed to get participants:', error);
      res.status(500).json({
        error: 'Failed to retrieve participants',
        details: error.message
      });
    }
  }

  // Round Management Endpoints
  async startRound(req, res) {
    try {
      const roundConfig = req.body;
      
      const round = await this.coordinator.startRound(roundConfig);
      
      res.status(201).json({
        success: true,
        data: {
          round,
          globalModel: this.coordinator.globalModel
        }
      });
    } catch (error) {
      logger.error('Failed to start round:', error);
      res.status(500).json({
        error: 'Failed to start federated learning round',
        details: error.message
      });
    }
  }

  async submitModelUpdate(req, res) {
    try {
      const { participantId } = req.params;
      const updateData = req.body;

      if (!validateBody(submitModelUpdateBodySchema, req, res)) return;

      // Guard oversized payloads (defence-in-depth; body-parser limits may vary)
      const payloadSize = Buffer.byteLength(JSON.stringify(updateData), 'utf8');
      if (payloadSize > MAX_MODEL_PAYLOAD_BYTES) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'body', message: `Model payload exceeds maximum size of ${MAX_MODEL_PAYLOAD_BYTES / (1024 * 1024)}MB` }],
        });
      }

      // Validate participant
      const participant = this.coordinator.participants.get(participantId);
      if (!participant) {
        return res.status(404).json({
          error: 'Participant not found'
        });
      }

      // Validate model update
      const validationResult = await this.modelValidator.validateModelUpdate(
        updateData,
        participant,
        req.body.validationData
      );

      if (!validationResult.passed) {
        return res.status(400).json({
          error: 'Model update validation failed',
          details: validationResult.errors
        });
      }

      // Submit update to coordinator
      const result = await this.coordinator.receiveModelUpdate(participantId, updateData);
      
      // Record privacy metrics
      this.analyticsDashboard.recordPrivacyMetrics(this.coordinator.globalModel.id, {
        totalBudget: this.differentialPrivacy.config.epsilon,
        spentBudget: this.differentialPrivacy.spentBudget,
        remainingBudget: this.differentialPrivacy.privacyBudget - this.differentialPrivacy.spentBudget,
        epsilonUsed: updateData.privacyParams?.epsilon || 0,
        deltaUsed: updateData.privacyParams?.delta || 0,
        mechanismUsage: { [updateData.privacyParams?.mechanism || 'laplace']: 1 }
      });

      res.json({
        success: true,
        data: {
          ...result,
          validation: validationResult
        }
      });
    } catch (error) {
      logger.error('Failed to submit model update:', error);
      res.status(500).json({
        error: 'Failed to submit model update',
        details: error.message
      });
    }
  }

  async getRoundHistory(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const history = this.coordinator.aggregationHistory
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.json({
        success: true,
        data: {
          rounds: history,
          total: this.coordinator.aggregationHistory.length,
          offset: parseInt(offset),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get round history:', error);
      res.status(500).json({
        error: 'Failed to retrieve round history',
        details: error.message
      });
    }
  }

  // Model Management Endpoints
  async getModelVersions(req, res) {
    try {
      const { limit = 50, offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
      
      const versions = this.modelVersioning.listVersions({
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      logger.error('Failed to get model versions:', error);
      res.status(500).json({
        error: 'Failed to retrieve model versions',
        details: error.message
      });
    }
  }

  async rollbackModel(req, res) {
    try {
      const { versionId } = req.params;
      const { reason, performedBy } = req.body;
      
      const rollbackRecord = await this.modelVersioning.rollbackToVersion(versionId, {
        reason,
        performedBy: performedBy || req.user?.id || 'system'
      });

      // Update coordinator's global model
      const rolledBackVersion = this.modelVersioning.getVersion(versionId);
      this.coordinator.globalModel = rolledBackVersion.modelData;

      res.json({
        success: true,
        data: rollbackRecord
      });
    } catch (error) {
      logger.error('Failed to rollback model:', error);
      res.status(500).json({
        error: 'Failed to rollback model',
        details: error.message
      });
    }
  }

  async compareModels(req, res) {
    try {
      const { versionId1, versionId2 } = req.query;
      
      if (!versionId1 || !versionId2) {
        return res.status(400).json({
          error: 'Both versionId1 and versionId2 are required'
        });
      }

      const comparison = this.modelVersioning.compareVersions(versionId1, versionId2);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      logger.error('Failed to compare models:', error);
      res.status(500).json({
        error: 'Failed to compare models',
        details: error.message
      });
    }
  }

  // Analytics Endpoints
  async getAnalytics(req, res) {
    try {
      const analyticsData = this.analyticsDashboard.getDashboardData();

      res.json({
        success: true,
        data: analyticsData
      });
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      res.status(500).json({
        error: 'Failed to retrieve analytics',
        details: error.message
      });
    }
  }

  async exportAnalytics(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      const exportData = this.analyticsDashboard.exportData(format);
      
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const filename = `federated-learning-analytics.${format}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      logger.error('Failed to export analytics:', error);
      res.status(500).json({
        error: 'Failed to export analytics',
        details: error.message
      });
    }
  }

  // Privacy Management Endpoints
  async getPrivacyStatus(req, res) {
    try {
      const privacyStatus = this.differentialPrivacy.getBudgetStatus();
      const privacyReport = this.differentialPrivacy.getPrivacyReport();

      res.json({
        success: true,
        data: {
          budget: privacyStatus,
          report: privacyReport
        }
      });
    } catch (error) {
      logger.error('Failed to get privacy status:', error);
      res.status(500).json({
        error: 'Failed to retrieve privacy status',
        details: error.message
      });
    }
  }

  async resetPrivacyBudget(req, res) {
    try {
      const { newBudget } = req.body;
      
      this.differentialPrivacy.resetBudget(newBudget);

      res.json({
        success: true,
        message: 'Privacy budget reset successfully'
      });
    } catch (error) {
      logger.error('Failed to reset privacy budget:', error);
      res.status(500).json({
        error: 'Failed to reset privacy budget',
        details: error.message
      });
    }
  }

  // Validation Endpoints
  async validateModel(req, res) {
    try {
      const { modelUpdate, participantInfo, validationData } = req.body;
      
      const validationResult = await this.modelValidator.validateModelUpdate(
        modelUpdate,
        participantInfo,
        validationData
      );

      res.json({
        success: true,
        data: validationResult
      });
    } catch (error) {
      logger.error('Failed to validate model:', error);
      res.status(500).json({
        error: 'Failed to validate model',
        details: error.message
      });
    }
  }

  async getValidationStats(req, res) {
    try {
      const stats = this.modelValidator.getValidationStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get validation stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve validation statistics',
        details: error.message
      });
    }
  }

  // System Health Endpoints
  async getSystemHealth(req, res) {
    try {
      const health = {
        coordinator: {
          active: !!this.coordinator,
          participants: this.coordinator.participants.size,
          currentRound: this.coordinator.currentRound,
          activeRound: !!this.coordinator.activeRound
        },
        secureAggregation: {
          active: !!this.secureAggregation.publicKey,
          keySize: this.secureAggregation.config.keySize
        },
        differentialPrivacy: {
          active: !!this.differentialPrivacy,
          budgetStatus: this.differentialPrivacy.getBudgetStatus()
        },
        modelValidator: {
          active: !!this.modelValidator,
          validationCount: this.modelValidator.validationHistory.length
        },
        analyticsDashboard: {
          active: !!this.analyticsDashboard,
          realTimeMetrics: this.analyticsDashboard.realTimeData
        },
        modelVersioning: {
          active: !!this.modelVersioning,
          versionCount: this.modelVersioning.versions.size,
          activeVersion: !!this.modelVersioning.activeVersion
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Failed to get system health:', error);
      res.status(500).json({
        error: 'Failed to retrieve system health',
        details: error.message
      });
    }
  }

  // Utility Methods
  async shutdown(req, res) {
    try {
      this.analyticsDashboard.stop();
      this.modelVersioning.stop();
      
      logger.info('Federated Learning services shut down successfully');
      
      res.json({
        success: true,
        message: 'Federated Learning services shut down successfully'
      });
    } catch (error) {
      logger.error('Failed to shutdown services:', error);
      res.status(500).json({
        error: 'Failed to shutdown services',
        details: error.message
      });
    }
  }
}

module.exports = FederatedLearningController;
