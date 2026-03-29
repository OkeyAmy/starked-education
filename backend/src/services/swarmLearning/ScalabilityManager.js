const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Scalability Manager for Swarm Learning System
 * 
 * This module manages the scalability of the swarm learning system,
 * handling load balancing, resource allocation, and dynamic scaling.
 */
class ScalabilityManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxAgentsPerNode: options.maxAgentsPerNode || 100,
      scalingThreshold: options.scalingThreshold || 0.8,
      minNodes: options.minNodes || 1,
      maxNodes: options.maxNodes || 10,
      loadBalancingStrategy: options.loadBalancingStrategy || 'round_robin',
      autoScalingEnabled: options.autoScalingEnabled !== false,
      monitoringInterval: options.monitoringInterval || 10000, // 10 seconds
      ...options
    };

    this.nodes = new Map();
    this.agentDistribution = new Map();
    this.resourcePools = new Map();
    this.scalingHistory = [];
    this.loadBalancer = null;
    this.monitoringTimer = null;
    this.isMonitoring = false;
  }

  /**
   * Initialize scalability manager
   */
  async initialize() {
    this._initializeLoadBalancer();
    this._initializeResourcePools();
    await this._startMonitoring();
    
    logger.info('Scalability manager initialized');
  }

  /**
   * Initialize load balancer
   */
  _initializeLoadBalancer() {
    this.loadBalancer = {
      strategy: this.config.loadBalancingStrategy,
      currentIndex: 0,
      
      selectNode: (availableNodes) => {
        switch (this.loadBalancer.strategy) {
          case 'round_robin':
            return this._roundRobinSelection(availableNodes);
          case 'least_loaded':
            return this._leastLoadedSelection(availableNodes);
          case 'resource_based':
            return this._resourceBasedSelection(availableNodes);
          default:
            return availableNodes[0];
        }
      }
    };
  }

  /**
   * Round-robin node selection
   */
  _roundRobinSelection(availableNodes) {
    if (availableNodes.length === 0) return null;
    
    const node = availableNodes[this.loadBalancer.currentIndex % availableNodes.length];
    this.loadBalancer.currentIndex++;
    return node;
  }

  /**
   * Least loaded node selection
   */
  _leastLoadedSelection(availableNodes) {
    if (availableNodes.length === 0) return null;
    
    return availableNodes.reduce((least, current) => {
      const leastLoad = this.nodes.get(least)?.load || 0;
      const currentLoad = this.nodes.get(current)?.load || 0;
      return currentLoad < leastLoad ? current : least;
    });
  }

  /**
   * Resource-based node selection
   */
  _resourceBasedSelection(availableNodes) {
    if (availableNodes.length === 0) return null;
    
    return availableNodes.reduce((best, current) => {
      const bestScore = this._calculateNodeScore(best);
      const currentScore = this._calculateNodeScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate node score based on resources
   */
  _calculateNodeScore(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;
    
    const cpuScore = (1 - node.cpuUsage) * 0.4;
    const memoryScore = (1 - node.memoryUsage) * 0.4;
    const loadScore = (1 - node.load) * 0.2;
    
    return cpuScore + memoryScore + loadScore;
  }

  /**
   * Initialize resource pools
   */
  _initializeResourcePools() {
    this.resourcePools.set('compute', {
      total: 100,
      allocated: 0,
      available: 100
    });
    
    this.resourcePools.set('memory', {
      total: 1000, // GB
      allocated: 0,
      available: 1000
    });
    
    this.resourcePools.set('network', {
      total: 10000, // Mbps
      allocated: 0,
      available: 10000
    });
  }

  /**
   * Start monitoring
   */
  async _startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringTimer = setInterval(() => {
      this._monitorResources();
      this._checkScalingNeeds();
      this._optimizeDistribution();
    }, this.config.monitoringInterval);
    
    logger.info('Scalability monitoring started');
  }

  /**
   * Stop monitoring
   */
  async stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    logger.info('Scalability monitoring stopped');
  }

  /**
   * Add new node to the cluster
   */
  async addNode(nodeConfig) {
    const nodeId = this._generateNodeId();
    
    const node = {
      id: nodeId,
      ...nodeConfig,
      status: 'active',
      agents: new Set(),
      load: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      createdAt: Date.now(),
      lastHealthCheck: Date.now()
    };
    
    this.nodes.set(nodeId, node);
    
    // Update resource pools
    this._updateResourcePools();
    
    logger.info(`Node added: ${nodeId}`);
    this.emit('nodeAdded', { nodeId, node });
    
    return nodeId;
  }

  /**
   * Remove node from cluster
   */
  async removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // Migrate agents to other nodes
    if (node.agents.size > 0) {
      await this._migrateAgents(nodeId);
    }
    
    this.nodes.delete(nodeId);
    this._updateResourcePools();
    
    logger.info(`Node removed: ${nodeId}`);
    this.emit('nodeRemoved', { nodeId });
    
    return true;
  }

  /**
   * Migrate agents from one node to another
   */
  async _migrateAgents(fromNodeId) {
    const fromNode = this.nodes.get(fromNodeId);
    const availableNodes = Array.from(this.nodes.keys()).filter(id => id !== fromNodeId);
    
    if (availableNodes.length === 0) {
      throw new Error('No available nodes for migration');
    }
    
    const agents = Array.from(fromNode.agents);
    
    for (const agentId of agents) {
      const targetNode = this.loadBalancer.selectNode(availableNodes);
      await this._migrateAgent(agentId, fromNodeId, targetNode);
    }
  }

  /**
   * Migrate single agent
   */
  async _migrateAgent(agentId, fromNodeId, toNodeId) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    
    if (!fromNode || !toNode) {
      throw new Error('Invalid source or target node');
    }
    
    // Remove from source node
    fromNode.agents.delete(agentId);
    fromNode.load = Math.max(0, fromNode.load - (1 / this.config.maxAgentsPerNode));
    
    // Add to target node
    toNode.agents.add(agentId);
    toNode.load = Math.min(1, toNode.load + (1 / this.config.maxAgentsPerNode));
    
    // Update distribution
    this.agentDistribution.set(agentId, toNodeId);
    
    this.emit('agentMigrated', { agentId, fromNodeId, toNodeId });
  }

  /**
   * Assign agent to node
   */
  async assignAgent(agentId, agentRequirements = {}) {
    const availableNodes = this._getAvailableNodes();
    
    if (availableNodes.length === 0) {
      // Try to scale up if auto-scaling is enabled
      if (this.config.autoScalingEnabled) {
        await this._scaleUp();
        const newNodes = this._getAvailableNodes();
        if (newNodes.length === 0) {
          throw new Error('No available nodes for agent assignment');
        }
      } else {
        throw new Error('No available nodes for agent assignment');
      }
    }
    
    const targetNode = this.loadBalancer.selectNode(availableNodes);
    const node = this.nodes.get(targetNode);
    
    // Add agent to node
    node.agents.add(agentId);
    node.load = Math.min(1, node.load + (1 / this.config.maxAgentsPerNode));
    
    // Update distribution
    this.agentDistribution.set(agentId, targetNode);
    
    // Update resource allocation
    this._allocateResources(targetNode, agentRequirements);
    
    logger.info(`Agent ${agentId} assigned to node ${targetNode}`);
    this.emit('agentAssigned', { agentId, nodeId: targetNode });
    
    return targetNode;
  }

  /**
   * Get available nodes
   */
  _getAvailableNodes() {
    return Array.from(this.nodes.entries())
      .filter(([id, node]) => 
        node.status === 'active' && 
        node.agents.size < this.config.maxAgentsPerNode &&
        node.load < this.config.scalingThreshold
      )
      .map(([id, node]) => id);
  }

  /**
   * Monitor resources
   */
  _monitorResources() {
    for (const [nodeId, node] of this.nodes.entries()) {
      // Simulate resource monitoring (in real implementation, this would use actual metrics)
      node.cpuUsage = Math.random() * node.load;
      node.memoryUsage = Math.random() * node.load;
      node.networkUsage = Math.random() * node.load;
      
      // Health check
      if (Date.now() - node.lastHealthCheck > 30000) { // 30 seconds
        this._performHealthCheck(nodeId);
      }
    }
  }

  /**
   * Perform health check on node
   */
  _performHealthCheck(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Simulate health check (in real implementation, this would ping the node)
    const isHealthy = Math.random() > 0.05; // 95% success rate
    
    if (!isHealthy) {
      node.status = 'unhealthy';
      logger.warn(`Node ${nodeId} marked as unhealthy`);
      this.emit('nodeUnhealthy', { nodeId });
      
      // Try to migrate agents if auto-scaling is enabled
      if (this.config.autoScalingEnabled) {
        this._migrateAgents(nodeId);
      }
    } else {
      node.status = 'active';
      node.lastHealthCheck = Date.now();
    }
  }

  /**
   * Check scaling needs
   */
  _checkScalingNeeds() {
    if (!this.config.autoScalingEnabled) return;
    
    const totalLoad = this._calculateTotalLoad();
    const averageLoad = totalLoad / this.nodes.size;
    
    // Scale up if needed
    if (averageLoad > this.config.scalingThreshold && this.nodes.size < this.config.maxNodes) {
      this._scaleUp();
    }
    
    // Scale down if needed
    if (averageLoad < 0.3 && this.nodes.size > this.config.minNodes) {
      this._scaleDown();
    }
  }

  /**
   * Calculate total load
   */
  _calculateTotalLoad() {
    let totalLoad = 0;
    for (const node of this.nodes.values()) {
      totalLoad += node.load;
    }
    return totalLoad;
  }

  /**
   * Scale up by adding new node
   */
  async _scaleUp() {
    if (this.nodes.size >= this.config.maxNodes) {
      logger.warn('Maximum node limit reached, cannot scale up');
      return;
    }
    
    const nodeConfig = {
      cpu: 8,
      memory: 16, // GB
      storage: 500, // GB
      network: 1000 // Mbps
    };
    
    const nodeId = await this.addNode(nodeConfig);
    
    this.scalingHistory.push({
      type: 'scale_up',
      nodeId,
      timestamp: Date.now(),
      reason: 'high_load'
    });
    
    logger.info(`Scaled up: Added node ${nodeId}`);
    this.emit('scaledUp', { nodeId });
  }

  /**
   * Scale down by removing node
   */
  async _scaleDown() {
    if (this.nodes.size <= this.config.minNodes) {
      logger.warn('Minimum node limit reached, cannot scale down');
      return;
    }
    
    // Find least loaded node
    const leastLoadedNode = Array.from(this.nodes.entries())
      .reduce((least, [id, node]) => {
        if (!least || node.load < least.load) {
          return { id, load: node.load };
        }
        return least;
      }, null);
    
    if (leastLoadedNode && leastLoadedNode.load < 0.2) {
      await this.removeNode(leastLoadedNode.id);
      
      this.scalingHistory.push({
        type: 'scale_down',
        nodeId: leastLoadedNode.id,
        timestamp: Date.now(),
        reason: 'low_load'
      });
      
      logger.info(`Scaled down: Removed node ${leastLoadedNode.id}`);
      this.emit('scaledDown', { nodeId: leastLoadedNode.id });
    }
  }

  /**
   * Optimize agent distribution
   */
  _optimizeDistribution() {
    // Rebalance agents if distribution is uneven
    const loads = Array.from(this.nodes.values()).map(node => node.load);
    const averageLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - averageLoad, 2), 0) / loads.length;
    
    if (variance > 0.1) { // High variance indicates uneven distribution
      this._rebalanceAgents();
    }
  }

  /**
   * Rebalance agents across nodes
   */
  _rebalanceAgents() {
    const overloadedNodes = Array.from(this.nodes.entries())
      .filter(([id, node]) => node.load > 0.8)
      .map(([id, node]) => id);
    
    const underloadedNodes = Array.from(this.nodes.entries())
      .filter(([id, node]) => node.load < 0.5)
      .map(([id, node]) => id);
    
    for (const overloadedNodeId of overloadedNodes) {
      const overloadedNode = this.nodes.get(overloadedNodeId);
      const agentsToMove = Array.from(overloadedNode.agents).slice(0, 2); // Move 2 agents
      
      for (const agentId of agentsToMove) {
        if (underloadedNodes.length > 0) {
          const targetNode = this.loadBalancer.selectNode(underloadedNodes);
          this._migrateAgent(agentId, overloadedNodeId, targetNode);
        }
      }
    }
  }

  /**
   * Allocate resources to node
   */
  _allocateResources(nodeId, requirements) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Update resource usage based on requirements
    if (requirements.cpu) {
      node.cpuUsage = Math.min(1, node.cpuUsage + requirements.cpu / node.cpu);
    }
    if (requirements.memory) {
      node.memoryUsage = Math.min(1, node.memoryUsage + requirements.memory / node.memory);
    }
    if (requirements.network) {
      node.networkUsage = Math.min(1, node.networkUsage + requirements.network / node.network);
    }
  }

  /**
   * Update resource pools
   */
  _updateResourcePools() {
    let totalCpu = 0, totalMemory = 0, totalNetwork = 0;
    let allocatedCpu = 0, allocatedMemory = 0, allocatedNetwork = 0;
    
    for (const node of this.nodes.values()) {
      totalCpu += node.cpu || 0;
      totalMemory += node.memory || 0;
      totalNetwork += node.network || 0;
      
      allocatedCpu += (node.cpuUsage || 0) * (node.cpu || 0);
      allocatedMemory += (node.memoryUsage || 0) * (node.memory || 0);
      allocatedNetwork += (node.networkUsage || 0) * (node.network || 0);
    }
    
    this.resourcePools.set('compute', {
      total: totalCpu,
      allocated: allocatedCpu,
      available: totalCpu - allocatedCpu
    });
    
    this.resourcePools.set('memory', {
      total: totalMemory,
      allocated: allocatedMemory,
      available: totalMemory - allocatedMemory
    });
    
    this.resourcePools.set('network', {
      total: totalNetwork,
      allocated: allocatedNetwork,
      available: totalNetwork - allocatedNetwork
    });
  }

  /**
   * Generate unique node ID
   */
  _generateNodeId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get scalability status
   */
  getScalabilityStatus() {
    const totalLoad = this._calculateTotalLoad();
    const averageLoad = this.nodes.size > 0 ? totalLoad / this.nodes.size : 0;
    
    return {
      timestamp: Date.now(),
      nodes: {
        total: this.nodes.size,
        active: Array.from(this.nodes.values()).filter(node => node.status === 'active').length,
        unhealthy: Array.from(this.nodes.values()).filter(node => node.status === 'unhealthy').length
      },
      agents: {
        total: this.agentDistribution.size,
        distribution: Object.fromEntries(this.agentDistribution)
      },
      load: {
        total: totalLoad,
        average: averageLoad,
        max: Math.max(...Array.from(this.nodes.values()).map(node => node.load))
      },
      resources: Object.fromEntries(this.resourcePools),
      scaling: {
        autoScalingEnabled: this.config.autoScalingEnabled,
        canScaleUp: this.nodes.size < this.config.maxNodes,
        canScaleDown: this.nodes.size > this.config.minNodes,
        lastScaling: this.scalingHistory[this.scalingHistory.length - 1] || null
      }
    };
  }

  /**
   * Get detailed node information
   */
  getNodeDetails(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    return {
      id: node.id,
      status: node.status,
      agents: Array.from(node.agents),
      load: node.load,
      resources: {
        cpu: node.cpu,
        memory: node.memory,
        storage: node.storage,
        network: node.network
      },
      usage: {
        cpu: node.cpuUsage,
        memory: node.memoryUsage,
        network: node.networkUsage
      },
      createdAt: node.createdAt,
      lastHealthCheck: node.lastHealthCheck
    };
  }

  /**
   * Export scalability data
   */
  exportData() {
    return {
      timestamp: Date.now(),
      config: this.config,
      status: this.getScalabilityStatus(),
      nodes: Object.fromEntries(
        Array.from(this.nodes.entries()).map(([id, node]) => [
          id,
          {
            status: node.status,
            agents: node.agents.size,
            load: node.load,
            cpuUsage: node.cpuUsage,
            memoryUsage: node.memoryUsage
          }
        ])
      ),
      scalingHistory: this.scalingHistory,
      resourcePools: Object.fromEntries(this.resourcePools)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stop();
    this.nodes.clear();
    this.agentDistribution.clear();
    this.resourcePools.clear();
    this.scalingHistory = [];
    
    logger.info('Scalability manager cleaned up');
  }
}

module.exports = ScalabilityManager;
