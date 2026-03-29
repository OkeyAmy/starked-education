const EventEmitter = require('events');
const logger = require('../../utils/logger');

class SelfOrganizingNetwork extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      initialConnections: options.initialConnections || 3,
      maxConnections: options.maxConnections || 10,
      minConnections: options.minConnections || 2,
      reorganizationInterval: options.reorganizationInterval || 30000, // 30 seconds
      loadBalancingEnabled: options.loadBalancingEnabled !== false,
      adaptationThreshold: options.adaptationThreshold || 0.2,
      topologyType: options.topologyType || 'small_world', // small_world, scale_free, random
      ...options
    };

    this.networkTopology = new Map();
    this.agentMetrics = new Map();
    this.networkMetrics = {
      connectivity: 0,
      clustering: 0,
      pathLength: 0,
      efficiency: 0,
      robustness: 0
    };
    this.reorganizationTimer = null;
  }

  async initialize() {
    this._startReorganization();
    logger.info('Self-organizing network initialized');
  }

  addAgent(agentId, agentInfo) {
    // Initialize agent connections
    const connections = this._initializeConnections(agentId);
    this.networkTopology.set(agentId, connections);
    
    // Initialize agent metrics
    this.agentMetrics.set(agentId, {
      load: 0,
      reliability: 1.0,
      performance: 1.0,
      contribution: 0,
      lastUpdate: new Date().toISOString()
    });
    
    // Update existing agents to connect to new agent
    this._updateExistingConnections(agentId);
    
    this.emit('agentAdded', { agentId, connections });
    logger.info(`Agent ${agentId} added to network with ${connections.size} connections`);
  }

  removeAgent(agentId) {
    // Remove agent from topology
    this.networkTopology.delete(agentId);
    this.agentMetrics.delete(agentId);
    
    // Remove agent from other agents' connections
    for (const [otherAgent, connections] of this.networkTopology) {
      connections.delete(agentId);
    }
    
    // Reorganize network after removal
    this._reorganizeAfterRemoval(agentId);
    
    this.emit('agentRemoved', { agentId });
    logger.info(`Agent ${agentId} removed from network`);
  }

  _initializeConnections(agentId) {
    const connections = new Set();
    const existingAgents = Array.from(this.networkTopology.keys());
    
    if (existingAgents.length === 0) {
      return connections;
    }
    
    switch (this.config.topologyType) {
      case 'small_world':
        return this._createSmallWorldConnections(agentId, existingAgents);
      case 'scale_free':
        return this._createScaleFreeConnections(agentId, existingAgents);
      case 'random':
        return this._createRandomConnections(agentId, existingAgents);
      default:
        return this._createSmallWorldConnections(agentId, existingAgents);
    }
  }

  _createSmallWorldConnections(agentId, existingAgents) {
    const connections = new Set();
    
    // Connect to nearest neighbors (based on some metric)
    const nearestNeighbors = this._findNearestNeighbors(agentId, existingAgents, this.config.initialConnections);
    nearestNeighbors.forEach(neighbor => connections.add(neighbor));
    
    // Add some random long-range connections
    const randomConnections = Math.floor(this.config.initialConnections * 0.3);
    for (let i = 0; i < randomConnections; i++) {
      const randomAgent = existingAgents[Math.floor(Math.random() * existingAgents.length)];
      if (!connections.has(randomAgent)) {
        connections.add(randomAgent);
      }
    }
    
    return connections;
  }

  _createScaleFreeConnections(agentId, existingAgents) {
    const connections = new Set();
    
    // Preferential attachment - connect to agents with more connections
    const connectionCounts = Array.from(this.networkTopology.entries())
      .map(([id, conns]) => ({ id, count: conns.size }))
      .sort((a, b) => b.count - a.count);
    
    // Connect to top agents based on connection count
    const numConnections = Math.min(this.config.initialConnections, connectionCounts.length);
    for (let i = 0; i < numConnections; i++) {
      connections.add(connectionCounts[i].id);
    }
    
    return connections;
  }

  _createRandomConnections(agentId, existingAgents) {
    const connections = new Set();
    const numConnections = Math.min(this.config.initialConnections, existingAgents.length);
    
    // Randomly select agents to connect to
    const shuffled = [...existingAgents].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numConnections; i++) {
      connections.add(shuffled[i]);
    }
    
    return connections;
  }

  _findNearestNeighbors(agentId, existingAgents, count) {
    // For simplicity, use random selection as "nearest"
    // In a real implementation, this would use actual distance metrics
    const shuffled = [...existingAgents].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, existingAgents.length));
  }

  _updateExistingConnections(newAgentId) {
    // Update existing agents to include the new agent
    for (const [agentId, connections] of this.networkTopology) {
      if (agentId !== newAgentId && connections.size < this.config.maxConnections) {
        // Probabilistically connect to new agent
        if (Math.random() < 0.3) { // 30% chance
          connections.add(newAgentId);
        }
      }
    }
  }

  _startReorganization() {
    this.reorganizationTimer = setInterval(() => {
      this._reorganizeNetwork();
    }, this.config.reorganizationInterval);
  }

  _reorganizeNetwork() {
    const beforeMetrics = { ...this.networkMetrics };
    
    // Update agent metrics
    this._updateAgentMetrics();
    
    // Calculate current network metrics
    this._calculateNetworkMetrics();
    
    // Check if reorganization is needed
    if (this._needsReorganization(beforeMetrics)) {
      this._performReorganization();
    }
    
    // Balance load if enabled
    if (this.config.loadBalancingEnabled) {
      this._balanceLoad();
    }
  }

  _updateAgentMetrics() {
    for (const [agentId, metrics] of this.agentMetrics) {
      // Update load based on number of connections
      const connections = this.networkTopology.get(agentId);
      if (connections) {
        metrics.load = connections.size / this.config.maxConnections;
      }
      
      // Update other metrics based on recent performance
      // This would be populated by actual performance data in a real system
      metrics.lastUpdate = new Date().toISOString();
    }
  }

  _calculateNetworkMetrics() {
    const numAgents = this.networkTopology.size;
    if (numAgents === 0) return;
    
    // Calculate connectivity (average degree)
    let totalConnections = 0;
    for (const connections of this.networkTopology.values()) {
      totalConnections += connections.size;
    }
    this.networkMetrics.connectivity = totalConnections / numAgents;
    
    // Calculate clustering coefficient
    this.networkMetrics.clustering = this._calculateClusteringCoefficient();
    
    // Calculate average path length
    this.networkMetrics.pathLength = this._calculateAveragePathLength();
    
    // Calculate efficiency
    this.networkMetrics.efficiency = this._calculateNetworkEfficiency();
    
    // Calculate robustness
    this.networkMetrics.robustness = this._calculateRobustness();
  }

  _calculateClusteringCoefficient() {
    let totalClustering = 0;
    let agentCount = 0;
    
    for (const [agentId, connections] of this.networkTopology) {
      if (connections.size < 2) continue;
      
      let connectionsBetweenNeighbors = 0;
      const neighbors = Array.from(connections);
      
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const neighborConnections = this.networkTopology.get(neighbors[i]);
          if (neighborConnections && neighborConnections.has(neighbors[j])) {
            connectionsBetweenNeighbors++;
          }
        }
      }
      
      const possibleConnections = (connections.size * (connections.size - 1)) / 2;
      const clustering = possibleConnections > 0 ? connectionsBetweenNeighbors / possibleConnections : 0;
      
      totalClustering += clustering;
      agentCount++;
    }
    
    return agentCount > 0 ? totalClustering / agentCount : 0;
  }

  _calculateAveragePathLength() {
    const agents = Array.from(this.networkTopology.keys());
    if (agents.length < 2) return 0;
    
    let totalPathLength = 0;
    let pathCount = 0;
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const pathLength = this._calculateShortestPath(agents[i], agents[j]);
        if (pathLength > 0) {
          totalPathLength += pathLength;
          pathCount++;
        }
      }
    }
    
    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  _calculateShortestPath(startAgent, endAgent) {
    if (startAgent === endAgent) return 0;
    
    const visited = new Set();
    const queue = [{ agent: startAgent, distance: 0 }];
    
    while (queue.length > 0) {
      const { agent, distance } = queue.shift();
      
      if (agent === endAgent) return distance;
      if (visited.has(agent)) continue;
      
      visited.add(agent);
      const connections = this.networkTopology.get(agent);
      
      if (connections) {
        for (const neighbor of connections) {
          if (!visited.has(neighbor)) {
            queue.push({ agent: neighbor, distance: distance + 1 });
          }
        }
      }
    }
    
    return -1; // No path found
  }

  _calculateNetworkEfficiency() {
    const agents = Array.from(this.networkTopology.keys());
    if (agents.length < 2) return 1;
    
    let totalEfficiency = 0;
    let pairCount = 0;
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const pathLength = this._calculateShortestPath(agents[i], agents[j]);
        if (pathLength > 0) {
          totalEfficiency += 1 / pathLength;
          pairCount++;
        }
      }
    }
    
    return pairCount > 0 ? totalEfficiency / pairCount : 0;
  }

  _calculateRobustness() {
    // Measure network robustness by simulating random node removals
    const agents = Array.from(this.networkTopology.keys());
    if (agents.length < 3) return 1;
    
    let totalConnectivity = 0;
    const samples = Math.min(5, agents.length - 1);
    
    for (let i = 0; i < samples; i++) {
      const removedAgent = agents[i];
      const remainingConnectivity = this._calculateConnectivityWithoutNode(removedAgent);
      totalConnectivity += remainingConnectivity;
    }
    
    const avgConnectivity = totalConnectivity / samples;
    return avgConnectivity / this.networkMetrics.connectivity;
  }

  _calculateConnectivityWithoutNode(removedAgent) {
    const agents = Array.from(this.networkTopology.keys()).filter(id => id !== removedAgent);
    if (agents.length === 0) return 0;
    
    let totalConnections = 0;
    for (const agentId of agents) {
      const connections = this.networkTopology.get(agentId);
      if (connections) {
        const filteredConnections = Array.from(connections).filter(id => id !== removedAgent);
        totalConnections += filteredConnections.length;
      }
    }
    
    return totalConnections / agents.length;
  }

  _needsReorganization(beforeMetrics) {
    // Check if any metric has changed significantly
    for (const [metric, value] of Object.entries(this.networkMetrics)) {
      const beforeValue = beforeMetrics[metric] || 0;
      const change = Math.abs(value - beforeValue);
      
      if (change > this.config.adaptationThreshold) {
        return true;
      }
    }
    
    return false;
  }

  _performReorganization() {
    // Reorganize network based on current metrics
    const agents = Array.from(this.networkTopology.keys());
    
    for (const agentId of agents) {
      const currentConnections = this.networkTopology.get(agentId);
      const metrics = this.agentMetrics.get(agentId);
      
      if (!currentConnections || !metrics) continue;
      
      // Add connections if underloaded
      if (currentConnections.size < this.config.minConnections) {
        this._addConnections(agentId, this.config.minConnections - currentConnections.size);
      }
      
      // Remove connections if overloaded
      if (currentConnections.size > this.config.maxConnections) {
        this._removeConnections(agentId, currentConnections.size - this.config.maxConnections);
      }
      
      // Optimize connections based on performance
      this._optimizeConnections(agentId);
    }
    
    this.emit('networkReorganized', { metrics: this.networkMetrics });
    logger.info('Network reorganized based on performance metrics');
  }

  _addConnections(agentId, numToAdd) {
    const currentConnections = this.networkTopology.get(agentId);
    const availableAgents = Array.from(this.networkTopology.keys())
      .filter(id => id !== agentId && !currentConnections.has(id));
    
    if (availableAgents.length === 0) return;
    
    // Select agents to connect to based on performance
    const sortedAgents = availableAgents.sort((a, b) => {
      const metricsA = this.agentMetrics.get(a);
      const metricsB = this.agentMetrics.get(b);
      return (metricsB?.performance || 0) - (metricsA?.performance || 0);
    });
    
    const toAdd = sortedAgents.slice(0, Math.min(numToAdd, sortedAgents.length));
    
    for (const targetAgent of toAdd) {
      currentConnections.add(targetAgent);
      this.networkTopology.get(targetAgent).add(agentId);
    }
  }

  _removeConnections(agentId, numToRemove) {
    const currentConnections = this.networkTopology.get(agentId);
    const connectionsArray = Array.from(currentConnections);
    
    // Sort connections by performance (remove worst performing first)
    const sortedConnections = connectionsArray.sort((a, b) => {
      const metricsA = this.agentMetrics.get(a);
      const metricsB = this.agentMetrics.get(b);
      return (metricsA?.performance || 0) - (metricsB?.performance || 0);
    });
    
    const toRemove = sortedConnections.slice(0, Math.min(numToRemove, sortedConnections.length));
    
    for (const targetAgent of toRemove) {
      currentConnections.delete(targetAgent);
      this.networkTopology.get(targetAgent).delete(agentId);
    }
  }

  _optimizeConnections(agentId) {
    const currentConnections = this.networkTopology.get(agentId);
    const metrics = this.agentMetrics.get(agentId);
    
    if (!currentConnections || !metrics) return;
    
    // If agent is performing poorly, consider reconnecting to better performers
    if (metrics.performance < 0.5) {
      const poorConnections = [];
      const connectionsArray = Array.from(currentConnections);
      
      for (const connectedAgent of connectionsArray) {
        const connectedMetrics = this.agentMetrics.get(connectedAgent);
        if (connectedMetrics && connectedMetrics.performance < 0.5) {
          poorConnections.push(connectedAgent);
        }
      }
      
      // Replace poor connections with better ones
      for (const poorAgent of poorConnections) {
        const betterAgent = this._findBetterConnection(agentId);
        if (betterAgent) {
          currentConnections.delete(poorAgent);
          this.networkTopology.get(poorAgent).delete(agentId);
          
          currentConnections.add(betterAgent);
          this.networkTopology.get(betterAgent).add(agentId);
        }
      }
    }
  }

  _findBetterConnection(agentId) {
    const currentConnections = this.networkTopology.get(agentId);
    const availableAgents = Array.from(this.networkTopology.keys())
      .filter(id => id !== agentId && !currentConnections.has(id));
    
    if (availableAgents.length === 0) return null;
    
    // Find best performing available agent
    let bestAgent = null;
    let bestPerformance = -1;
    
    for (const candidate of availableAgents) {
      const metrics = this.agentMetrics.get(candidate);
      if (metrics && metrics.performance > bestPerformance) {
        bestPerformance = metrics.performance;
        bestAgent = candidate;
      }
    }
    
    return bestAgent;
  }

  _balanceLoad() {
    // Distribute load more evenly across the network
    const agents = Array.from(this.networkTopology.keys());
    const loads = agents.map(id => ({
      id,
      load: this.agentMetrics.get(id)?.load || 0,
      connections: this.networkTopology.get(id)?.size || 0
    }));
    
    // Sort by load (highest first)
    loads.sort((a, b) => b.load - a.load);
    
    // Transfer connections from overloaded to underloaded agents
    for (let i = 0; i < loads.length / 2; i++) {
      const overloaded = loads[i];
      const underloaded = loads[loads.length - 1 - i];
      
      if (overloaded.load > 0.8 && underloaded.load < 0.5) {
        this._transferConnection(overloaded.id, underloaded.id);
      }
    }
  }

  _transferConnection(fromAgent, toAgent) {
    const fromConnections = this.networkTopology.get(fromAgent);
    const toConnections = this.networkTopology.get(toAgent);
    
    if (!fromConnections || !toConnections || fromConnections.size <= this.config.minConnections) {
      return;
    }
    
    // Find a connection to transfer
    const transferCandidates = Array.from(fromConnections).filter(id => {
      const toMetrics = this.agentMetrics.get(id);
      return toMetrics && toMetrics.performance > 0.5;
    });
    
    if (transferCandidates.length === 0) return;
    
    const candidate = transferCandidates[0];
    
    // Transfer the connection
    fromConnections.delete(candidate);
    this.networkTopology.get(candidate).delete(fromAgent);
    
    toConnections.add(candidate);
    this.networkTopology.get(candidate).add(toAgent);
    
    logger.info(`Connection transferred from ${fromAgent} to ${toAgent}: ${candidate}`);
  }

  _reorganizeAfterRemoval(removedAgent) {
    // Ensure remaining agents maintain minimum connections
    const agents = Array.from(this.networkTopology.keys());
    
    for (const agentId of agents) {
      const connections = this.networkTopology.get(agentId);
      if (connections && connections.size < this.config.minConnections) {
        this._addConnections(agentId, this.config.minConnections - connections.size);
      }
    }
  }

  updateAgentMetrics(agentId, metrics) {
    const currentMetrics = this.agentMetrics.get(agentId) || {};
    this.agentMetrics.set(agentId, {
      ...currentMetrics,
      ...metrics,
      lastUpdate: new Date().toISOString()
    });
  }

  getNetworkTopology() {
    return Object.fromEntries(this.networkTopology);
  }

  getNetworkMetrics() {
    return this.networkMetrics;
  }

  getAgentMetrics(agentId) {
    return this.agentMetrics.get(agentId);
  }

  getAllAgentMetrics() {
    return Object.fromEntries(this.agentMetrics);
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Self-organizing network configuration updated');
  }

  cleanup() {
    if (this.reorganizationTimer) {
      clearInterval(this.reorganizationTimer);
    }
    
    this.networkTopology.clear();
    this.agentMetrics.clear();
    
    logger.info('Self-organizing network cleaned up');
  }
}

module.exports = SelfOrganizingNetwork;
