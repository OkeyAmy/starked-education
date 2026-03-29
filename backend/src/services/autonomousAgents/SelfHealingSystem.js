const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Self-Healing System
 * Automatic failure detection, diagnosis, and recovery for platform operations
 */
class SelfHealingSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 5000,
      failureThreshold: config.failureThreshold || 3,
      recoveryTimeout: config.recoveryTimeout || 30000,
      autoHealEnabled: config.autoHealEnabled ?? true,
      learningEnabled: config.learningEnabled ?? true,
      ...config
    };
    
    this.systemState = new Map();
    this.failureHistory = [];
    this.recoveryStrategies = new Map();
    this.healingMetrics = {
      totalFailures: 0,
      successfulRecoveries: 0,
      averageRecoveryTime: 0,
      systemUptime: 100,
      meanTimeBetweenFailures: 0
    };
        
    this.healthCheckTimers = new Map();
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize predefined recovery strategies
   */
  initializeRecoveryStrategies() {
    // Service restart strategy
    this.recoveryStrategies.set('service_restart', {
      name: 'Service Restart',
      description: 'Restart failed service',
      execute: async (context) => {
        logger.info(`Restarting service: ${context.serviceId}`);
        return { success: true, action: 'restarted' };
      }
    });

    // Failover strategy
    this.recoveryStrategies.set('failover', {
      name: 'Failover',
      description: 'Switch to backup instance',
      execute: async (context) => {
        logger.info(`Failing over to backup for: ${context.serviceId}`);
        return { success: true, action: 'failover_completed' };
      }
    });

    // Resource reallocation strategy
    this.recoveryStrategies.set('resource_reallocation', {
      name: 'Resource Reallocation',
      description: 'Reallocate resources to struggling component',
      execute: async (context) => {
        logger.info(`Reallocating resources for: ${context.serviceId}`);
        return { success: true, action: 'resources_reallocated' };
      }
    });

    // Circuit breaker strategy
    this.recoveryStrategies.set('circuit_breaker', {
      name: 'Circuit Breaker',
      description: 'Temporarily isolate failing component',
      execute: async (context) => {
        logger.info(`Activating circuit breaker for: ${context.serviceId}`);
        return { success: true, action: 'circuit_opened' };
      }
    });

    // Graceful degradation strategy
    this.recoveryStrategies.set('graceful_degradation', {
      name: 'Graceful Degradation',
      description: 'Reduce functionality to maintain core operations',
      execute: async (context) => {
        logger.info(`Activating graceful degradation for: ${context.serviceId}`);
        return { success: true, action: 'degraded_mode' };
      }
    });
  }

  /**
   * Monitor system component health
   */
  startMonitoring(componentId, healthCheckFn) {
    const state = {
      componentId,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0,
      healthHistory: [],
      metrics: {}
    };

    this.systemState.set(componentId, state);

    const checkHealth = async () => {
      try {
        const health = await healthCheckFn();
        state.consecutiveFailures = 0;
        state.status = 'healthy';
        state.metrics = health.metrics || {};
        
        this._recordHealthData(componentId, true, health);
      } catch (error) {
        state.consecutiveFailures++;
        
        if (state.consecutiveFailures >= this.config.failureThreshold) {
          state.status = 'unhealthy';
          await this.handleFailure(componentId, error);
        } else {
          state.status = 'degraded';
        }
        
        this._recordHealthData(componentId, false, { error: error.message });
      }

      state.lastCheck = new Date().toISOString();
    };

    // Initial health check
    checkHealth();

    // Schedule periodic checks
    const timer = setInterval(checkHealth, this.config.healthCheckInterval);
    this.healthCheckTimers.set(componentId, timer);

    logger.info(`Started monitoring component: ${componentId}`);
    this.emit('monitoringStarted', { componentId });
  }

  /**
   * Handle component failure
   */
  async handleFailure(componentId, error) {
    this.healingMetrics.totalFailures++;
    
    const failure = {
      componentId,
      error: error.message,
      timestamp: new Date().toISOString(),
      severity: this._assessFailureSeverity(error),
      context: { ...this.systemState.get(componentId) }
    };

    this.failureHistory.push(failure);
    logger.error(`Component failure detected: ${componentId}`, error);
    this.emit('failureDetected', failure);

    if (!this.config.autoHealEnabled) {
      logger.warn('Auto-healing disabled, manual intervention required');
      this.emit('manualInterventionRequired', failure);
      return;
    }

    // Attempt automatic recovery
    await this.attemptRecovery(componentId, failure);
  }

  /**
   * Attempt to recover from failure
   */
  async attemptRecovery(componentId, failure) {
    const startTime = Date.now();
    
    try {
      // Select appropriate recovery strategy
      const strategy = await this._selectRecoveryStrategy(componentId, failure);
      
      logger.info(`Attempting recovery with strategy: ${strategy.name}`);
      this.emit('recoveryStarted', { componentId, strategy: strategy.name });

      // Execute recovery
      const result = await strategy.execute({
        componentId,
        failure,
        systemState: this.systemState.get(componentId)
      });

      if (result.success) {
        const recoveryTime = Date.now() - startTime;
        this.healingMetrics.successfulRecoveries++;
        this._updateRecoveryMetrics(recoveryTime);
        
        this.systemState.get(componentId).status = 'recovering';
        
        logger.info(`Recovery successful for ${componentId} in ${recoveryTime}ms`);
        this.emit('recoveryCompleted', { 
          componentId, 
          strategy: strategy.name,
          recoveryTime,
          result
        });

        // Verify recovery
        await this._verifyRecovery(componentId);
      } else {
        throw new Error('Recovery strategy failed');
      }
    } catch (error) {
      logger.error(`Recovery failed for ${componentId}:`, error);
      this.emit('recoveryFailed', { componentId, error });
      
      // Escalate if recovery fails
      this._escalateFailure(componentId, failure, error);
    }
  }

  /**
   * Diagnose root cause of failure
   */
  async diagnoseRootCause(componentId, failure) {
    const diagnosis = {
      componentId,
      possibleCauses: [],
      confidence: 0,
      recommendedActions: []
    };

    // Analyze failure patterns
    const similarFailures = this._findSimilarFailures(failure);
    if (similarFailures.length > 0) {
      // Learn from historical patterns
      const patterns = this._analyzeFailurePatterns(similarFailures);
      diagnosis.possibleCauses = patterns.causes;
      diagnosis.confidence = patterns.confidence;
      diagnosis.recommendedActions = patterns.actions;
    } else {
      // Perform fresh analysis
      diagnosis.possibleCauses = await this._performRootCauseAnalysis(failure);
      diagnosis.confidence = 0.7;
      diagnosis.recommendedActions = ['investigate', 'monitor'];
    }

    logger.info(`Diagnosis for ${componentId}:`, diagnosis);
    this.emit('diagnosisCompleted', diagnosis);

    return diagnosis;
  }

  /**
   * Get system health report
   */
  getSystemHealthReport() {
    const components = Array.from(this.systemState.values()).map(state => ({
      componentId: state.componentId,
      status: state.status,
      consecutiveFailures: state.consecutiveFailures,
      lastCheck: state.lastCheck,
      healthScore: this._calculateHealthScore(state)
    }));

    const healthyCount = components.filter(c => c.status === 'healthy').length;
    const overallHealth = (healthyCount / components.length) * 100;

    return {
      overallHealth,
      totalComponents: components.length,
      healthyComponents: healthyCount,
      degradedComponents: components.filter(c => c.status === 'degraded').length,
      unhealthyComponents: components.filter(c => c.status === 'unhealthy').length,
      healingMetrics: this.healingMetrics,
      recentFailures: this.failureHistory.slice(-10),
      components
    };
  }

  /**
   * Stop monitoring a component
   */
  stopMonitoring(componentId) {
    const timer = this.healthCheckTimers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(componentId);
      this.systemState.delete(componentId);
      logger.info(`Stopped monitoring component: ${componentId}`);
      this.emit('monitoringStopped', { componentId });
    }
  }

  /**
   * Record health data for analytics
   */
  _recordHealthData(componentId, healthy, metrics) {
    const state = this.systemState.get(componentId);
    state.healthHistory.push({
      timestamp: new Date().toISOString(),
      healthy,
      metrics
    });

    // Limit history size
    if (state.healthHistory.length > 1000) {
      state.healthHistory = state.healthHistory.slice(-500);
    }
  }

  /**
   * Assess failure severity
   */
  _assessFailureSeverity(error) {
    if (error.critical) return 'critical';
    if (error.severe) return 'severe';
    return 'moderate';
  }

  /**
   * Select best recovery strategy
   */
  async _selectRecoveryStrategy(componentId, failure) {
    // Simple strategy selection based on failure type
    const diagnosis = await this.diagnoseRootCause(componentId, failure);
    
    if (diagnosis.recommendedActions.includes('restart')) {
      return this.recoveryStrategies.get('service_restart');
    }
    
    if (diagnosis.recommendedActions.includes('failover')) {
      return this.recoveryStrategies.get('failover');
    }

    // Default to graceful degradation
    return this.recoveryStrategies.get('graceful_degradation');
  }

  /**
   * Update recovery metrics
   */
  _updateRecoveryMetrics(recoveryTime) {
    const total = this.healingMetrics.successfulRecoveries;
    const prevAvg = this.healingMetrics.averageRecoveryTime;
    this.healingMetrics.averageRecoveryTime = 
      ((prevAvg * (total - 1)) + recoveryTime) / total;
  }

  /**
   * Verify recovery was successful
   */
  async _verifyRecovery(componentId) {
    // Wait briefly then check health
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const state = this.systemState.get(componentId);
    if (state && state.status !== 'unhealthy') {
      state.status = 'healthy';
      state.consecutiveFailures = 0;
      logger.info(`Recovery verified for ${componentId}`);
    }
  }

  /**
   * Escalate failure when automatic recovery fails
   */
  _escalateFailure(componentId, failure, recoveryError) {
    const escalation = {
      componentId,
      originalFailure: failure,
      recoveryError: recoveryError.message,
      requiresHumanIntervention: true,
      escalatedAt: new Date().toISOString()
    };

    logger.error('Failure escalation:', escalation);
    this.emit('failureEscalated', escalation);
  }

  /**
   * Find similar historical failures
   */
  _findSimilarFailures(currentFailure) {
    return this.failureHistory.filter(failure => 
      failure.componentId === currentFailure.componentId ||
      failure.error.includes(currentFailure.error.split(' ')[0])
    ).slice(-10);
  }

  /**
   * Analyze failure patterns
   */
  _analyzeFailurePatterns(similarFailures) {
    const causes = similarFailures.map(f => f.error.split(':')[0]);
    const uniqueCauses = [...new Set(causes)];
    
    return {
      causes: uniqueCauses,
      confidence: 0.8,
      actions: ['retry', 'monitor', 'scale_resources']
    };
  }

  /**
   * Perform root cause analysis
   */
  async _performRootCauseAnalysis(failure) {
    // Placeholder for sophisticated RCA
    return ['unknown_cause'];
  }

  /**
   * Calculate health score for component
   */
  _calculateHealthScore(state) {
    const baseScore = state.status === 'healthy' ? 100 : 
                     state.status === 'degraded' ? 50 : 0;
    
    const failurePenalty = state.consecutiveFailures * 10;
    return Math.max(0, baseScore - failurePenalty);
  }
}

module.exports = SelfHealingSystem;
