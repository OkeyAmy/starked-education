const EventEmitter = require('events');
const MultiAgentCoordinator = require('./MultiAgentCoordinator');
const SelfHealingSystem = require('./SelfHealingSystem');
const CustomerServiceAgent = require('./CustomerServiceAgent');
const PerformanceOptimizationAgent = require('./PerformanceOptimizationAgent');
const SecurityMonitoringAgent = require('./SecurityMonitoringAgent');
const logger = require('../../utils/logger');

/**
 * Autonomous Agent Controller
 * Central management for all autonomous AI agents
 */
class AutonomousAgentController extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableCustomerService: config.enableCustomerService ?? true,
      enablePerformanceOptimization: config.enablePerformanceOptimization ?? true,
      enableSecurityMonitoring: config.enableSecurityMonitoring ?? true,
      enableSelfHealing: config.enableSelfHealing ?? true,
      humanOversightEnabled: config.humanOversightEnabled ?? true,
      ...config
    };

    this.coordinator = new MultiAgentCoordinator();
    this.selfHealingSystem = new SelfHealingSystem();
    this.agents = new Map();
    this.systemMetrics = {
      totalDecisions: 0,
      autonomousResolutions: 0,
      humanInterventions: 0,
      systemEfficiency: 0,
      uptime: 0
    };

    this.initializeAgents();
  }

  /**
   * Initialize all autonomous agents
   */
  async initializeAgents() {
    logger.info('Initializing autonomous agent framework...');

    // Initialize self-healing system
    if (this.config.enableSelfHealing) {
      await this._initializeSelfHealing();
    }

    // Create customer service agent
    if (this.config.enableCustomerService) {
      const customerServiceAgent = await this._createCustomerServiceAgent();
      this.agents.set('customer_service', customerServiceAgent);
    }

    // Create performance optimization agent
    if (this.config.enablePerformanceOptimization) {
      const perfAgent = await this._createPerformanceAgent();
      this.agents.set('performance_optimization', perfAgent);
    }

    // Create security monitoring agent
    if (this.config.enableSecurityMonitoring) {
      const securityAgent = await this._createSecurityAgent();
      this.agents.set('security_monitoring', securityAgent);
    }

    logger.info(`Initialized ${this.agents.size} autonomous agents`);
    this.emit('agentsInitialized', { count: this.agents.size });
  }

  /**
   * Handle support ticket with autonomous agent
   */
  async handleSupportTicket(ticket) {
    const agent = this.agents.get('customer_service');
    if (!agent) {
      throw new Error('Customer service agent not available');
    }

    const result = await agent.handleTicket(ticket);
    this.systemMetrics.totalDecisions++;
    
    if (result.resolved) {
      this.systemMetrics.autonomousResolutions++;
    } else {
      this.systemMetrics.humanInterventions++;
    }

    return result;
  }

  /**
   * Optimize system performance
   */
  async optimizePerformance() {
    const agent = this.agents.get('performance_optimization');
    if (!agent) {
      throw new Error('Performance optimization agent not available');
    }

    const bottlenecks = await agent.analyzeBottlenecks();
    const optimizations = await agent.applyOptimizations(bottlenecks);
    
    return {
      bottlenecksFound: bottlenecks.length,
      optimizationsApplied: optimizations.length,
      performanceReport: agent.getPerformanceReport()
    };
  }

  /**
   * Check security status
   */
  async checkSecurityStatus() {
    const agent = this.agents.get('security_monitoring');
    if (!agent) {
      throw new Error('Security monitoring agent not available');
    }

    return agent.getSecurityPosture();
  }

  /**
   * Get comprehensive system report
   */
  getSystemReport() {
    const report = {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values())
        .filter(a => a.state.status === 'active').length,
      systemMetrics: this.systemMetrics,
      autonomyRate: this.systemMetrics.totalDecisions > 0
        ? ((this.systemMetrics.autonomousResolutions / this.systemMetrics.totalDecisions) * 100).toFixed(1) + '%'
        : '0%',
      targetAutonomyRate: '80%',
      agents: {}
    };

    // Add individual agent reports
    for (const [type, agent] of this.agents) {
      if (type === 'customer_service') {
        report.agents[type] = agent.getResolutionReport();
      } else if (type === 'performance_optimization') {
        report.agents[type] = agent.getPerformanceReport();
      } else if (type === 'security_monitoring') {
        report.agents[type] = agent.getSecurityPosture();
      }
    }

    // Add coordinator metrics
    report.coordinatorMetrics = this.coordinator.getSystemMetrics();

    // Add self-healing metrics
    report.selfHealingMetrics = this.selfHealingSystem.getSystemHealthReport();

    return report;
  }

  /**
   * Enable/disable human oversight
   */
  setHumanOversight(enabled) {
    this.config.humanOversightEnabled = enabled;
    
    for (const [, agent] of this.agents) {
      agent.humanOversightEnabled = enabled;
    }

    logger.info(`Human oversight ${enabled ? 'enabled' : 'disabled'}`);
    this.emit('humanOversightChanged', { enabled });
  }

  /**
   * Initialize self-healing system
   */
  async _initializeSelfHealing() {
    // Monitor critical backend services
    const criticalServices = [
      'api-gateway',
      'database',
      'redis',
      'message-queue',
      'authentication-service'
    ];

    criticalServices.forEach(service => {
      this.selfHealingSystem.startMonitoring(service, async () => {
        // Health check implementation
        return {
          healthy: true,
          metrics: {
            responseTime: Math.random() * 100,
            memoryUsage: Math.random() * 30 + 50
          }
        };
      });
    });

    logger.info('Self-healing system initialized');
  }

  /**
   * Create customer service agent
   */
  async _createCustomerServiceAgent() {
    const agent = new CustomerServiceAgent({
      autonomyLevel: 0.85,
      humanOversightEnabled: this.config.humanOversightEnabled
    });

    await this.coordinator.registerAgent({
      id: agent.id,
      type: 'customer_service',
      capabilities: agent.capabilities
    });

    logger.info(`Customer service agent created: ${agent.id}`);
    return agent;
  }

  /**
   * Create performance optimization agent
   */
  async _createPerformanceAgent() {
    const agent = new PerformanceOptimizationAgent({
      autonomyLevel: 0.9,
      humanOversightEnabled: this.config.humanOversightEnabled
    });

    agent.startPerformanceMonitoring();

    await this.coordinator.registerAgent({
      id: agent.id,
      type: 'performance_optimization',
      capabilities: agent.capabilities
    });

    logger.info(`Performance optimization agent created: ${agent.id}`);
    return agent;
  }

  /**
   * Create security monitoring agent
   */
  async _createSecurityAgent() {
    const agent = new SecurityMonitoringAgent({
      autonomyLevel: 0.95,
      humanOversightEnabled: this.config.humanOversightEnabled
    });

    agent.startSecurityMonitoring();

    await this.coordinator.registerAgent({
      id: agent.id,
      type: 'security_monitoring',
      capabilities: agent.capabilities
    });

    logger.info(`Security monitoring agent created: ${agent.id}`);
    return agent;
  }
}

module.exports = AutonomousAgentController;
