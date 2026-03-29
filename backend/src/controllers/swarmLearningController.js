const SwarmCoordinator = require('../services/swarmLearning/SwarmCoordinator');
const AgentCommunication = require('../services/swarmLearning/AgentCommunication');
const EmergentBehaviorDetector = require('../services/swarmLearning/EmergentBehaviorDetector');
const CollectiveIntelligence = require('../services/swarmLearning/CollectiveIntelligence');
const SelfOrganizingNetwork = require('../services/swarmLearning/SelfOrganizingNetwork');
const SwarmAnalytics = require('../services/swarmLearning/SwarmAnalytics');
const logger = require('../utils/logger');

class SwarmLearningController {
  constructor() {
    this.swarmCoordinator = null;
    this.agentCommunication = null;
    this.behaviorDetector = null;
    this.collectiveIntelligence = null;
    this.networkManager = null;
    this.analytics = null;
    this.initialized = false;
  }

  async initialize(req, res) {
    try {
      if (this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system already initialized'
        });
      }

      const { config } = req.body;

      // Initialize all components
      this.swarmCoordinator = new SwarmCoordinator(config?.coordinator);
      this.agentCommunication = new AgentCommunication(config?.communication);
      this.behaviorDetector = new EmergentBehaviorDetector(config?.behaviorDetector);
      this.collectiveIntelligence = new CollectiveIntelligence(config?.collectiveIntelligence);
      this.networkManager = new SelfOrganizingNetwork(config?.network);
      this.analytics = new SwarmAnalytics(config?.analytics);

      // Initialize components
      await this.swarmCoordinator.initialize();
      await this.agentCommunication.initialize('coordinator');
      await this.behaviorDetector.initialize();
      await this.collectiveIntelligence.initialize();
      await this.networkManager.initialize();
      await this.analytics.initialize();

      // Setup event handlers
      this._setupEventHandlers();

      this.initialized = true;

      res.status(200).json({
        success: true,
        message: 'Swarm learning system initialized successfully',
        data: {
          coordinator: this.swarmCoordinator.getSwarmStatus(),
          network: this.networkManager.getNetworkMetrics(),
          analytics: this.analytics.getSystemOverview()
        }
      });

    } catch (error) {
      logger.error('Failed to initialize swarm learning system:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize swarm learning system',
        error: error.message
      });
    }
  }

  async createSwarm(req, res) {
    try {
      if (!this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system not initialized'
        });
      }

      const { taskDefinition, initialKnowledge } = req.body;

      const swarmId = await this.swarmCoordinator.initializeSwarm(taskDefinition, initialKnowledge);

      res.status(201).json({
        success: true,
        message: 'Swarm created successfully',
        data: {
          swarmId,
          taskDefinition,
          status: 'initialized'
        }
      });

    } catch (error) {
      logger.error('Failed to create swarm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create swarm',
        error: error.message
      });
    }
  }

  async registerAgent(req, res) {
    try {
      if (!this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system not initialized'
        });
      }

      const agentConfig = req.body;

      // Register agent with swarm coordinator
      const agentId = await this.swarmCoordinator.registerAgent(agentConfig);

      // Add agent to network
      this.networkManager.addAgent(agentId, agentConfig);

      // Initialize agent communication
      const agentComm = new AgentCommunication();
      await agentComm.initialize(agentId);

      // Record metrics
      this.analytics.recordMetric('agents_registered', 1, { agentId });

      res.status(201).json({
        success: true,
        message: 'Agent registered successfully',
        data: {
          agentId,
          config: agentConfig
        }
      });

    } catch (error) {
      logger.error('Failed to register agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register agent',
        error: error.message
      });
    }
  }

  async startSwarmLearning(req, res) {
    try {
      if (!this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system not initialized'
        });
      }

      const { taskId } = req.params;

      await this.swarmCoordinator.startSwarmLearning(taskId);

      res.status(200).json({
        success: true,
        message: 'Swarm learning started successfully',
        data: {
          taskId,
          status: 'active'
        }
      });

    } catch (error) {
      logger.error('Failed to start swarm learning:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start swarm learning',
        error: error.message
      });
    }
  }

  async getSwarmStatus(req, res) {
    try {
      if (!this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system not initialized'
        });
      }

      const status = {
        coordinator: this.swarmCoordinator.getSwarmStatus(),
        network: this.networkManager.getNetworkTopology(),
        networkMetrics: this.networkManager.getNetworkMetrics(),
        analytics: this.analytics.getSystemOverview(),
        emergentBehaviors: this.behaviorDetector.getDetectedBehaviors()
      };

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get swarm status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get swarm status',
        error: error.message
      });
    }
  }

  async getAgentDetails(req, res) {
    try {
      const { agentId } = req.params;

      const agentDetails = this.swarmCoordinator.getAgentDetails(agentId);
      const agentMetrics = this.networkManager.getAgentMetrics(agentId);
      const agentPerformance = this.analytics.getAgentPerformance(agentId);

      if (!agentDetails) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          details: agentDetails,
          metrics: agentMetrics,
          performance: agentPerformance
        }
      });

    } catch (error) {
      logger.error('Failed to get agent details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get agent details',
        error: error.message
      });
    }
  }

  async getTaskDetails(req, res) {
    try {
      const { taskId } = req.params;

      const taskDetails = this.swarmCoordinator.getTaskDetails(taskId);
      const collectiveKnowledge = this.collectiveIntelligence.getCollectiveKnowledge(taskId);
      const intelligenceMetrics = this.collectiveIntelligence.calculateCollectiveMetrics(taskId);

      if (!taskDetails) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          task: taskDetails,
          knowledge: collectiveKnowledge,
          metrics: intelligenceMetrics
        }
      });

    } catch (error) {
      logger.error('Failed to get task details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task details',
        error: error.message
      });
    }
  }

  async getEmergentBehaviors(req, res) {
    try {
      const { taskId } = req.query;

      const behaviors = this.swarmCoordinator.getEmergentBehaviors(taskId);

      res.status(200).json({
        success: true,
        data: {
          behaviors,
          count: behaviors.length
        }
      });

    } catch (error) {
      logger.error('Failed to get emergent behaviors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get emergent behaviors',
        error: error.message
      });
    }
  }

  async getAnalytics(req, res) {
    try {
      const { timeRange, metric } = req.query;

      let data = {};

      if (metric) {
        data.metrics = this.analytics.getMetrics(metric, timeRange ? parseInt(timeRange) : null);
      } else {
        data.overview = this.analytics.getSystemOverview();
        data.trends = this.analytics.getPerformanceTrends(timeRange ? parseInt(timeRange) : null);
        data.topPerformers = this.analytics.getTopPerformers();
      }

      res.status(200).json({
        success: true,
        data
      });

    } catch (error) {
      logger.error('Failed to get analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics',
        error: error.message
      });
    }
  }

  async getReport(req, res) {
    try {
      const { timeRange } = req.query;

      const report = this.analytics.generateReport(timeRange ? parseInt(timeRange) : null);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Failed to generate report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        error: error.message
      });
    }
  }

  async getAlerts(req, res) {
    try {
      const { severity, acknowledged } = req.query;

      const alerts = this.analytics.getAlerts(severity, acknowledged !== undefined ? acknowledged === 'true' : null);

      res.status(200).json({
        success: true,
        data: {
          alerts,
          count: alerts.length
        }
      });

    } catch (error) {
      logger.error('Failed to get alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get alerts',
        error: error.message
      });
    }
  }

  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;

      const success = this.analytics.acknowledgeAlert(alertId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully'
      });

    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
        error: error.message
      });
    }
  }

  async updateConfiguration(req, res) {
    try {
      const { component, config } = req.body;

      switch (component) {
        case 'coordinator':
          this.swarmCoordinator.updateConfiguration(config);
          break;
        case 'collectiveIntelligence':
          this.collectiveIntelligence.updateConfiguration(config);
          break;
        case 'network':
          this.networkManager.updateConfiguration(config);
          break;
        case 'analytics':
          this.analytics.updateConfiguration(config);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid component specified'
          });
      }

      res.status(200).json({
        success: true,
        message: `${component} configuration updated successfully`
      });

    } catch (error) {
      logger.error('Failed to update configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
        error: error.message
      });
    }
  }

  async exportData(req, res) {
    try {
      const { format, timeRange } = req.query;

      const data = this.analytics.exportMetrics(format || 'json', timeRange ? parseInt(timeRange) : null);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="swarm_metrics.csv"');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="swarm_metrics.json"');
      }

      res.status(200).send(data);

    } catch (error) {
      logger.error('Failed to export data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export data',
        error: error.message
      });
    }
  }

  async shutdown(req, res) {
    try {
      if (!this.initialized) {
        return res.status(400).json({
          success: false,
          message: 'Swarm learning system not initialized'
        });
      }

      // Cleanup all components
      await this.swarmCoordinator.cleanup();
      await this.agentCommunication.cleanup();
      await this.behaviorDetector.cleanup();
      await this.collectiveIntelligence.cleanup();
      await this.networkManager.cleanup();
      await this.analytics.cleanup();

      this.initialized = false;

      res.status(200).json({
        success: true,
        message: 'Swarm learning system shutdown successfully'
      });

    } catch (error) {
      logger.error('Failed to shutdown swarm learning system:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to shutdown swarm learning system',
        error: error.message
      });
    }
  }

  _setupEventHandlers() {
    // Swarm coordinator events
    this.swarmCoordinator.on('swarmInitialized', (data) => {
      this.analytics.recordMetric('swarm_initialized', 1, data);
    });

    this.swarmCoordinator.on('agentRegistered', (data) => {
      this.analytics.recordMetric('agent_registered', 1, data);
    });

    this.swarmCoordinator.on('swarmLearningStarted', (data) => {
      this.analytics.recordMetric('learning_started', 1, data);
    });

    this.swarmCoordinator.on('swarmConverged', (data) => {
      this.analytics.recordMetric('swarm_converged', 1, data);
    });

    this.swarmCoordinator.on('emergentBehaviorDetected', (data) => {
      this.analytics.recordMetric('emergent_behavior', 1, data);
    });

    // Network manager events
    this.networkManager.on('agentAdded', (data) => {
      this.analytics.recordMetric('network_agent_added', 1, data);
    });

    this.networkManager.on('agentRemoved', (data) => {
      this.analytics.recordMetric('network_agent_removed', 1, data);
    });

    this.networkManager.on('networkReorganized', (data) => {
      this.analytics.recordMetric('network_reorganized', 1, data);
    });

    // Analytics events
    this.analytics.on('alert', (alert) => {
      logger.warn(`Swarm alert: ${alert.message}`);
    });

    // Behavior detector events
    this.behaviorDetector.on('emergentBehavior', (behavior) => {
      logger.info(`Emergent behavior detected: ${behavior.type}`);
    });
  }
}

module.exports = SwarmLearningController;
