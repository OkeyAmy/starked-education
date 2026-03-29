const AntColonyOptimizer = require('../aco/AntColonyOptimizer');
const Graph = require('../aco/Graph');
const EventEmitter = require('events');

/**
 * Dynamic Path Replanning System
 * Provides real-time path adaptation and replanning capabilities
 */
class DynamicReplanner extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.currentPaths = new Map();
    this.environmentState = new Map();
    this.replanningHistory = [];
    this.triggers = new Map();
    this.adaptationStrategies = new Map();
    
    // Replanning parameters
    this.replanningThreshold = options.replanningThreshold || 0.3;
    this.maxReplanningDepth = options.maxReplanningDepth || 5;
    this.replanningInterval = options.replanningInterval || 60000; // 1 minute
    this.adaptationRate = options.adaptationRate || 0.1;
    
    // Start continuous monitoring
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring for replanning triggers
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkReplanningTriggers();
    }, this.replanningInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Register a path for dynamic replanning
   */
  registerPath(pathId, pathData) {
    const path = {
      id: pathId,
      nodes: pathData.nodes || [],
      edges: pathData.edges || [],
      constraints: pathData.constraints || {},
      objectives: pathData.objectives || [],
      priority: pathData.priority || 'medium',
      flexibility: pathData.flexibility || 0.5,
      createdAt: new Date(),
      lastUpdated: new Date(),
      currentCost: this.calculatePathCost(pathData),
      status: 'active',
      metadata: pathData.metadata || {}
    };

    this.currentPaths.set(pathId, path);
    
    // Initialize environment state for this path
    this.environmentState.set(pathId, {
      nodeStates: new Map(),
      edgeStates: new Map(),
      globalFactors: new Map(),
      lastCheck: new Date()
    });

    this.emit('pathRegistered', { pathId, path });
    
    return path;
  }

  /**
   * Update environment state
   */
  updateEnvironmentState(pathId, updates) {
    const envState = this.environmentState.get(pathId);
    if (!envState) return;

    // Update node states
    if (updates.nodeStates) {
      for (const [nodeId, state] of Object.entries(updates.nodeStates)) {
        envState.nodeStates.set(nodeId, {
          ...envState.nodeStates.get(nodeId),
          ...state,
          lastUpdated: new Date()
        });
      }
    }

    // Update edge states
    if (updates.edgeStates) {
      for (const [edgeKey, state] of Object.entries(updates.edgeStates)) {
        envState.edgeStates.set(edgeKey, {
          ...envState.edgeStates.get(edgeKey),
          ...state,
          lastUpdated: new Date()
        });
      }
    }

    // Update global factors
    if (updates.globalFactors) {
      for (const [factor, value] of Object.entries(updates.globalFactors)) {
        envState.globalFactors.set(factor, {
          value,
          lastUpdated: new Date()
        });
      }
    }

    envState.lastCheck = new Date();
    
    // Trigger immediate check if significant changes
    if (updates.significant) {
      this.checkReplanningTriggers(pathId);
    }
  }

  /**
   * Check for replanning triggers
   */
  checkReplanningTriggers(pathId = null) {
    const pathsToCheck = pathId ? [pathId] : Array.from(this.currentPaths.keys());
    
    for (const pid of pathsToCheck) {
      const path = this.currentPaths.get(pid);
      const envState = this.environmentState.get(pid);
      
      if (!path || !envState || path.status !== 'active') continue;

      const triggers = this.evaluateTriggers(pid, path, envState);
      
      if (triggers.length > 0) {
        this.handleReplanningTriggers(pid, triggers);
      }
    }
  }

  /**
   * Evaluate replanning triggers for a path
   */
  evaluateTriggers(pathId, path, envState) {
    const triggers = [];
    
    // Cost degradation trigger
    const currentCost = this.calculateCurrentPathCost(pathId);
    const costIncrease = (currentCost - path.currentCost) / path.currentCost;
    
    if (costIncrease > this.replanningThreshold) {
      triggers.push({
        type: 'cost_increase',
        severity: costIncrease,
        data: { currentCost, originalCost: path.currentCost }
      });
    }

    // Node failure trigger
    const failedNodes = this.getFailedNodes(pathId);
    if (failedNodes.length > 0) {
      triggers.push({
        type: 'node_failure',
        severity: failedNodes.length / path.nodes.length,
        data: { failedNodes }
      });
    }

    // Edge congestion trigger
    const congestedEdges = this.getCongestedEdges(pathId);
    if (congestedEdges.length > 0) {
      triggers.push({
        type: 'edge_congestion',
        severity: congestedEdges.length / path.edges.length,
        data: { congestedEdges }
      });
    }

    // Performance degradation trigger
    const performanceDrop = this.calculatePerformanceDrop(pathId);
    if (performanceDrop > this.replanningThreshold) {
      triggers.push({
        type: 'performance_degradation',
        severity: performanceDrop,
        data: { performanceDrop }
      });
    }

    // Time-based trigger
    const timeSinceUpdate = Date.now() - path.lastUpdated.getTime();
    if (timeSinceUpdate > this.replanningInterval * 10) { // 10 intervals
      triggers.push({
        type: 'time_based',
        severity: 0.5,
        data: { timeSinceUpdate }
      });
    }

    return triggers;
  }

  /**
   * Handle replanning triggers
   */
  async handleReplanningTriggers(pathId, triggers) {
    const path = this.currentPaths.get(pathId);
    if (!path) return;

    // Aggregate trigger severity
    const maxSeverity = Math.max(...triggers.map(t => t.severity));
    
    // Determine replanning strategy
    const strategy = this.selectReplanningStrategy(path, triggers, maxSeverity);
    
    this.emit('replanningTriggered', {
      pathId,
      triggers,
      strategy,
      severity: maxSeverity
    });

    // Execute replanning
    try {
      const replanningResult = await this.executeReplanning(pathId, strategy);
      
      this.emit('replanningCompleted', {
        pathId,
        result: replanningResult,
        triggers
      });

    } catch (error) {
      this.emit('replanningFailed', {
        pathId,
        error,
        triggers
      });
    }
  }

  /**
   * Select replanning strategy based on triggers and path characteristics
   */
  selectReplanningStrategy(path, triggers, severity) {
    const strategies = {
      'local_adjustment': {
        description: 'Local adjustments to avoid problems',
        depth: 1,
        scope: 'local',
        aggressiveness: 'low'
      },
      'partial_replan': {
        description: 'Replan affected segments',
        depth: 3,
        scope: 'regional',
        aggressiveness: 'medium'
      },
      'full_replan': {
        description: 'Complete path replanning',
        depth: this.maxReplanningDepth,
        scope: 'global',
        aggressiveness: 'high'
      },
      'adaptive_replan': {
        description: 'Adaptive replanning with learning',
        depth: 2,
        scope: 'adaptive',
        aggressiveness: 'adaptive'
      }
    };

    // Strategy selection logic
    if (severity < 0.3) {
      return strategies.local_adjustment;
    } else if (severity < 0.6) {
      return strategies.partial_replan;
    } else if (severity < 0.8) {
      return strategies.full_replan;
    } else {
      return strategies.adaptive_replan;
    }
  }

  /**
   * Execute replanning with selected strategy
   */
  async executeReplanning(pathId, strategy) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) {
      throw new Error(`Path ${pathId} not found`);
    }

    const startTime = Date.now();
    const originalPath = JSON.parse(JSON.stringify(path));

    try {
      let newPath;

      switch (strategy.scope) {
        case 'local':
          newPath = await this.localAdjustment(pathId, path, envState);
          break;
        case 'regional':
          newPath = await this.partialReplan(pathId, path, envState);
          break;
        case 'global':
          newPath = await this.fullReplan(pathId, path, envState);
          break;
        case 'adaptive':
          newPath = await this.adaptiveReplan(pathId, path, envState);
          break;
        default:
          throw new Error(`Unknown strategy: ${strategy.scope}`);
      }

      // Update path with new solution
      this.updatePath(pathId, newPath);

      // Record replanning history
      this.replanningHistory.push({
        timestamp: new Date(),
        pathId,
        strategy,
        originalPath,
        newPath,
        duration: Date.now() - startTime,
        improvement: this.calculateImprovement(originalPath, newPath)
      });

      return {
        success: true,
        newPath,
        improvement: this.calculateImprovement(originalPath, newPath),
        duration: Date.now() - startTime
      };

    } catch (error) {
      // Restore original path on failure
      this.updatePath(pathId, originalPath);
      throw error;
    }
  }

  /**
   * Local adjustment strategy
   */
  async localAdjustment(pathId, path, envState) {
    const problemNodes = this.getProblemNodes(pathId);
    const problemEdges = this.getProblemEdges(pathId);
    
    // Create alternative local segments
    const alternatives = this.generateLocalAlternatives(path, problemNodes, problemEdges);
    
    // Select best alternative
    const bestAlternative = this.selectBestAlternative(alternatives, path.objectives);
    
    return bestAlternative || path;
  }

  /**
   * Partial replanning strategy
   */
  async partialReplan(pathId, path, envState) {
    const affectedSegments = this.identifyAffectedSegments(pathId);
    const newPath = { ...path };
    
    // Replan each affected segment
    for (const segment of affectedSegments) {
      const replannedSegment = await this.replanSegment(segment, path);
      this.replaceSegment(newPath, segment, replannedSegment);
    }
    
    return newPath;
  }

  /**
   * Full replanning strategy
   */
  async fullReplan(pathId, path, envState) {
    // Build updated graph with current environment state
    const graph = this.buildUpdatedGraph(pathId);
    
    // Run ACO optimization
    const optimizer = new AntColonyOptimizer({
      antCount: 20,
      maxIterations: 50,
      alpha: 1.0,
      beta: 2.0,
      rho: 0.4,
      elitist: true,
      graph
    });

    const results = await optimizer.optimize();
    
    // Convert to path format
    return this.convertSolutionToPath(results.bestSolution.path, path);
  }

  /**
   * Adaptive replanning strategy with learning
   */
  async adaptiveReplan(pathId, path, envState) {
    // Learn from past replanning
    const learnedPatterns = this.analyzeReplanningPatterns(pathId);
    
    // Apply learned adaptations
    const adaptations = this.generateAdaptations(path, learnedPatterns);
    
    // Execute with adaptive parameters
    return await this.adaptiveExecution(pathId, adaptations);
  }

  /**
   * Get failed nodes for a path
   */
  getFailedNodes(pathId) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) return [];

    const failedNodes = [];
    
    for (const nodeId of path.nodes) {
      const nodeState = envState.nodeStates.get(nodeId);
      if (nodeState && nodeState.status === 'failed') {
        failedNodes.push(nodeId);
      }
    }

    return failedNodes;
  }

  /**
   * Get congested edges for a path
   */
  getCongestedEdges(pathId) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) return [];

    const congestedEdges = [];
    
    for (const edge of path.edges) {
      const edgeKey = this.createEdgeKey(edge.from, edge.to);
      const edgeState = envState.edgeStates.get(edgeKey);
      
      if (edgeState && edgeState.congestion > 0.8) {
        congestedEdges.push(edgeKey);
      }
    }

    return congestedEdges;
  }

  /**
   * Calculate current path cost considering environment state
   */
  calculateCurrentPathCost(pathId) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) return Infinity;

    let totalCost = 0;

    for (const edge of path.edges) {
      const edgeKey = this.createEdgeKey(edge.from, edge.to);
      const edgeState = envState.edgeStates.get(edgeKey);
      
      let edgeCost = edge.cost || 1;
      
      // Apply environment factors
      if (edgeState) {
        edgeCost *= (1 + edgeState.congestion);
        edgeCost *= (1 + edgeState.delay || 0);
        edgeCost *= (edgeState.reliability || 1);
      }
      
      totalCost += edgeCost;
    }

    return totalCost;
  }

  /**
   * Calculate path cost
   */
  calculatePathCost(pathData) {
    if (!pathData.edges) return 0;
    
    return pathData.edges.reduce((total, edge) => total + (edge.cost || 1), 0);
  }

  /**
   * Calculate performance drop
   */
  calculatePerformanceDrop(pathId) {
    const path = this.currentPaths.get(pathId);
    if (!path) return 1;

    const currentCost = this.calculateCurrentPathCost(pathId);
    const originalCost = path.currentCost;
    
    return originalCost > 0 ? (currentCost - originalCost) / originalCost : 0;
  }

  /**
   * Get problem nodes
   */
  getProblemNodes(pathId) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) return [];

    const problemNodes = [];
    
    for (const nodeId of path.nodes) {
      const nodeState = envState.nodeStates.get(nodeId);
      if (nodeState && (nodeState.status === 'failed' || nodeState.congestion > 0.8)) {
        problemNodes.push({ nodeId, state: nodeState });
      }
    }

    return problemNodes;
  }

  /**
   * Get problem edges
   */
  getProblemEdges(pathId) {
    const path = this.currentPaths.get(pathId);
    const envState = this.environmentState.get(pathId);
    
    if (!path || !envState) return [];

    const problemEdges = [];
    
    for (const edge of path.edges) {
      const edgeKey = this.createEdgeKey(edge.from, edge.to);
      const edgeState = envState.edgeStates.get(edgeKey);
      
      if (edgeState && (edgeState.congestion > 0.7 || edgeState.status === 'failed')) {
        problemEdges.push({ edge, state: edgeState });
      }
    }

    return problemEdges;
  }

  /**
   * Create edge key
   */
  createEdgeKey(from, to) {
    return `${from}-${to}`;
  }

  /**
   * Update path with new solution
   */
  updatePath(pathId, newPath) {
    const path = this.currentPaths.get(pathId);
    if (path) {
      Object.assign(path, newPath);
      path.lastUpdated = new Date();
      path.currentCost = this.calculatePathCost(path);
    }
  }

  /**
   * Calculate improvement between paths
   */
  calculateImprovement(originalPath, newPath) {
    const originalCost = this.calculatePathCost(originalPath);
    const newCost = this.calculatePathCost(newPath);
    
    return originalCost > 0 ? (originalCost - newCost) / originalCost : 0;
  }

  /**
   * Get replanning analytics
   */
  getAnalytics() {
    const analytics = {
      totalReplanings: this.replanningHistory.length,
      averageImprovement: 0,
      averageDuration: 0,
      strategyUsage: {},
      triggerFrequency: {},
      successRate: 0
    };

    if (this.replanningHistory.length === 0) return analytics;

    // Calculate averages
    const totalImprovement = this.replanningHistory.reduce((sum, r) => sum + r.improvement, 0);
    const totalDuration = this.replanningHistory.reduce((sum, r) => sum + r.duration, 0);
    
    analytics.averageImprovement = totalImprovement / this.replanningHistory.length;
    analytics.averageDuration = totalDuration / this.replanningHistory.length;

    // Strategy usage
    for (const replanning of this.replanningHistory) {
      const strategy = replanning.strategy.scope;
      analytics.strategyUsage[strategy] = (analytics.strategyUsage[strategy] || 0) + 1;
    }

    return analytics;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
    this.currentPaths.clear();
    this.environmentState.clear();
    this.replanningHistory = [];
  }
}

module.exports = DynamicReplanner;
