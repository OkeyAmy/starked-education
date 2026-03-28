const EventEmitter = require('events');
const logger = require('../../utils/logger');

class EmergentBehaviorDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      detectionWindow: options.detectionWindow || 60000, // 1 minute
      minPatternOccurrences: options.minPatternOccurrences || 3,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      analysisInterval: options.analysisInterval || 5000, // 5 seconds
      ...options
    };

    this.behaviorPatterns = new Map();
    this.observationHistory = [];
    this.detectedBehaviors = [];
    this.analysisTimer = null;
  }

  async initialize() {
    this._startAnalysis();
    logger.info('Emergent behavior detector initialized');
  }

  _startAnalysis() {
    this.analysisTimer = setInterval(() => {
      this._analyzeBehaviors();
    }, this.config.analysisInterval);
  }

  recordObservation(observation) {
    this.observationHistory.push({
      ...observation,
      timestamp: new Date().toISOString()
    });

    // Keep only recent observations
    const cutoff = Date.now() - this.config.detectionWindow;
    this.observationHistory = this.observationHistory.filter(
      obs => new Date(obs.timestamp).getTime() > cutoff
    );
  }

  _analyzeBehaviors() {
    const patterns = this._detectPatterns();
    
    patterns.forEach(pattern => {
      if (pattern.confidence >= this.config.confidenceThreshold) {
        this._reportEmergentBehavior(pattern);
      }
    });
  }

  _detectPatterns() {
    const patterns = [];
    
    // Detect clustering patterns
    const clusteringPattern = this._detectClusteringPattern();
    if (clusteringPattern) patterns.push(clusteringPattern);
    
    // Detect cascade patterns
    const cascadePattern = this._detectCascadePattern();
    if (cascadePattern) patterns.push(cascadePattern);
    
    // Detect synchronization patterns
    const syncPattern = this._detectSynchronizationPattern();
    if (syncPattern) patterns.push(syncPattern);
    
    return patterns;
  }

  _detectClusteringPattern() {
    const agentGroups = new Map();
    
    this.observationHistory.forEach(obs => {
      if (!agentGroups.has(obs.agentId)) {
        agentGroups.set(obs.agentId, new Set());
      }
      obs.connections?.forEach(conn => agentGroups.get(obs.agentId).add(conn));
    });

    const clusters = this._findClusters(agentGroups);
    
    if (clusters.length > 1) {
      return {
        type: 'clustering',
        clusters,
        confidence: this._calculateClusteringConfidence(clusters),
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  }

  _detectCascadePattern() {
    const cascades = [];
    const recentObs = this.observationHistory.slice(-50);
    
    for (let i = 1; i < recentObs.length; i++) {
      const prev = recentObs[i-1];
      const curr = recentObs[i];
      
      if (this._isCascadeStep(prev, curr)) {
        cascades.push({from: prev.agentId, to: curr.agentId});
      }
    }
    
    if (cascades.length >= this.config.minPatternOccurrences) {
      return {
        type: 'cascade',
        cascades,
        confidence: Math.min(cascades.length / 10, 1.0),
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  }

  _detectSynchronizationPattern() {
    const behaviors = new Map();
    
    this.observationHistory.forEach(obs => {
      const key = `${obs.action}_${obs.target}`;
      if (!behaviors.has(key)) behaviors.set(key, []);
      behaviors.get(key).push(new Date(obs.timestamp).getTime());
    });
    
    const syncPatterns = [];
    for (const [key, times] of behaviors) {
      if (times.length >= 3 && this._isSynchronized(times)) {
        syncPatterns.push({key, times});
      }
    }
    
    if (syncPatterns.length > 0) {
      return {
        type: 'synchronization',
        patterns: syncPatterns,
        confidence: syncPatterns.length / behaviors.size,
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  }

  _findClusters(agentGroups) {
    const clusters = [];
    const visited = new Set();
    
    for (const [agentId] of agentGroups) {
      if (visited.has(agentId)) continue;
      
      const cluster = this._bfsCluster(agentId, agentGroups, visited);
      if (cluster.size > 1) {
        clusters.push(Array.from(cluster));
      }
    }
    
    return clusters;
  }

  _bfsCluster(startId, agentGroups, visited) {
    const cluster = new Set();
    const queue = [startId];
    
    while (queue.length > 0) {
      const agentId = queue.shift();
      if (visited.has(agentId)) continue;
      
      visited.add(agentId);
      cluster.add(agentId);
      
      const connections = agentGroups.get(agentId) || new Set();
      connections.forEach(conn => {
        if (!visited.has(conn)) queue.push(conn);
      });
    }
    
    return cluster;
  }

  _calculateClusteringConfidence(clusters) {
    const totalAgents = this.observationHistory.length;
    const clusteredAgents = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
    return clusteredAgents / totalAgents;
  }

  _isCascadeStep(prev, curr) {
    return prev.action === curr.action && 
           prev.target === curr.target &&
           Math.abs(new Date(curr.timestamp) - new Date(prev.timestamp)) < 5000;
  }

  _isSynchronized(times) {
    times.sort((a, b) => a - b);
    const maxGap = Math.max(...times.slice(1).map((t, i) => t - times[i]));
    return maxGap < 10000; // Within 10 seconds
  }

  _reportEmergentBehavior(pattern) {
    this.detectedBehaviors.push(pattern);
    this.emit('emergentBehavior', pattern);
    logger.info(`Emergent behavior detected: ${pattern.type}`);
  }

  getDetectedBehaviors() {
    return this.detectedBehaviors;
  }

  cleanup() {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    this.observationHistory = [];
    this.detectedBehaviors = [];
  }
}

module.exports = EmergentBehaviorDetector;
