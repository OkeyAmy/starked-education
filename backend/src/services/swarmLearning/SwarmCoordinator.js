const EventEmitter = require('events');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class SwarmCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      minAgents: options.minAgents || 3,
      maxAgents: options.maxAgents || 1000,
      communicationRadius: options.communicationRadius || 5,
      learningRate: options.learningRate || 0.01,
      explorationRate: options.explorationRate || 0.1,
      convergenceThreshold: options.convergenceThreshold || 0.001,
      maxIterations: options.maxIterations || 1000,
      timeoutMs: options.timeoutMs || 300000,
      ...options
    };

    this.agents = new Map();
    this.networkTopology = new Map();
    this.knowledgeBase = new Map();
    this.communicationChannels = new Map();
    this.emergentPatterns = [];
    this.collectiveMemory = [];
    this.activeTasks = new Map();
    this.performanceMetrics = {
      convergenceRate: 0,
      collectiveIntelligence: 0,
      adaptationSpeed: 0,
      emergentBehaviors: 0
    };
  }

  /**
   * Initialize swarm learning session
   */
  async initializeSwarm(taskDefinition, initialKnowledge = null) {
    const swarmId = uuidv4();
    
    this.swarmConfig = {
      id: swarmId,
      task: taskDefinition,
      knowledge: initialKnowledge || this._initializeKnowledgeBase(taskDefinition),
      createdAt: new Date().toISOString(),
      status: 'initializing'
    };

    // Initialize communication protocols
    await this._initializeCommunicationProtocols();
    
    // Setup self-organizing network topology
    await this._setupNetworkTopology();
    
    this.swarmConfig.status = 'active';
    
    logger.info(`Swarm learning session initialized: ${swarmId}`);
    this.emit('swarmInitialized', { swarmId, config: this.swarmConfig });
    
    return swarmId;
  }

  /**
   * Register new agent in the swarm
   */
  async registerAgent(agentConfig) {
    const agentId = uuidv4();
    const agent = {
      id: agentId,
      ...agentConfig,
      capabilities: this._assessAgentCapabilities(agentConfig),
      reputation: 1.0,
      knowledge: new Map(),
      connections: new Set(),
      lastActive: new Date().toISOString(),
      performance: {
        contributions: 0,
        accuracy: 0,
        reliability: 1.0
      }
    };

    this.agents.set(agentId, agent);
    
    // Establish connections based on proximity and capabilities
    await this._establishAgentConnections(agentId);
    
    // Update network topology
    this._updateNetworkTopology();
    
    logger.info(`Agent registered: ${agentId}`);
    this.emit('agentRegistered', { agentId, agent });
    
    return agentId;
  }

  /**
   * Initialize decentralized coordination protocols
   */
  async _initializeCommunicationProtocols() {
    // Peer-to-peer communication protocol
    this.communicationProtocols = {
      direct: {
        type: 'p2p',
        encryption: true,
        authentication: true,
        reliability: 'high'
      },
      broadcast: {
        type: 'multicast',
        range: this.config.communicationRadius,
        ttl: 3,
        priority: 'normal'
      },
      consensus: {
        type: 'distributed',
        algorithm: 'proof-of-stake',
        threshold: 0.67,
        timeout: this.config.timeoutMs
      }
    };

    // Initialize message queues for different communication types
    this.messageQueues = {
      task: [],
      knowledge: [],
      coordination: [],
      emergency: []
    };
  }

  /**
   * Setup self-organizing network topology
   */
  async _setupNetworkTopology() {
    // Initialize with small-world network topology
    const agents = Array.from(this.agents.keys());
    
    for (let i = 0; i < agents.length; i++) {
      const agentId = agents[i];
      const connections = new Set();
      
      // Connect to nearest neighbors
      const neighbors = this._findNearestNeighbors(agentId, this.config.communicationRadius);
      neighbors.forEach(neighbor => connections.add(neighbor));
      
      // Add some random long-range connections (small-world property)
      const randomConnections = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < randomConnections; j++) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        if (randomAgent !== agentId) {
          connections.add(randomAgent);
        }
      }
      
      this.networkTopology.set(agentId, connections);
    }
    
    logger.info('Self-organizing network topology established');
  }

  /**
   * Find nearest neighbors in the network
   */
  _findNearestNeighbors(agentId, radius) {
    const agent = this.agents.get(agentId);
    if (!agent) return [];
    
    const neighbors = [];
    const agentPosition = agent.position || { x: 0, y: 0, z: 0 };
    
    for (const [otherId, otherAgent] of this.agents) {
      if (otherId === agentId) continue;
      
      const otherPosition = otherAgent.position || { x: 0, y: 0, z: 0 };
      const distance = this._calculateDistance(agentPosition, otherPosition);
      
      if (distance <= radius) {
        neighbors.push(otherId);
      }
    }
    
    return neighbors;
  }

  /**
   * Calculate Euclidean distance between two positions
   */
  _calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Establish connections for new agent
   */
  async _establishAgentConnections(agentId) {
    const neighbors = this._findNearestNeighbors(agentId, this.config.communicationRadius);
    const agent = this.agents.get(agentId);
    
    neighbors.forEach(neighborId => {
      agent.connections.add(neighborId);
      const neighbor = this.agents.get(neighborId);
      if (neighbor) {
        neighbor.connections.add(agentId);
      }
    });
  }

  /**
   * Update network topology based on current state
   */
  _updateNetworkTopology() {
    // Implement dynamic topology updates based on:
    // - Agent performance
    // - Network load
    // - Communication efficiency
    // - Emergent patterns
    
    for (const [agentId, agent] of this.agents) {
      const optimalConnections = this._calculateOptimalConnections(agentId);
      this.networkTopology.set(agentId, new Set(optimalConnections));
    }
  }

  /**
   * Calculate optimal connections for an agent
   */
  _calculateOptimalConnections(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return [];
    
    // Score potential connections based on multiple factors
    const connectionScores = new Map();
    
    for (const [otherId, otherAgent] of this.agents) {
      if (otherId === agentId) continue;
      
      let score = 0;
      
      // Performance-based scoring
      score += otherAgent.performance.accuracy * 0.3;
      score += otherAgent.performance.reliability * 0.2;
      score += otherAgent.reputation * 0.2;
      
      // Distance-based scoring
      const distance = this._calculateDistance(
        agent.position || { x: 0, y: 0, z: 0 },
        otherAgent.position || { x: 0, y: 0, z: 0 }
      );
      score += Math.max(0, 1 - distance / this.config.communicationRadius) * 0.3;
      
      connectionScores.set(otherId, score);
    }
    
    // Select top connections
    const sortedConnections = Array.from(connectionScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(10, this.agents.size - 1));
    
    return sortedConnections.map(([agentId]) => agentId);
  }

  /**
   * Assess agent capabilities
   */
  _assessAgentCapabilities(agentConfig) {
    const capabilities = {
      computation: agentConfig.computationPower || 1.0,
      communication: agentConfig.communicationBandwidth || 1.0,
      storage: agentConfig.storageCapacity || 1.0,
      specialization: agentConfig.specialization || 'general',
      reliability: agentConfig.reliability || 1.0
    };
    
    // Calculate overall capability score
    capabilities.overall = (
      capabilities.computation * 0.3 +
      capabilities.communication * 0.3 +
      capabilities.storage * 0.2 +
      capabilities.reliability * 0.2
    );
    
    return capabilities;
  }

  /**
   * Initialize knowledge base for the task
   */
  _initializeKnowledgeBase(taskDefinition) {
    const knowledge = {
      task: taskDefinition,
      models: new Map(),
      patterns: new Map(),
      strategies: new Map(),
      metrics: {
        accuracy: 0,
        efficiency: 0,
        convergence: 0
      }
    };
    
    return knowledge;
  }

  /**
   * Start swarm learning process
   */
  async startSwarmLearning(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    task.status = 'active';
    task.startTime = new Date().toISOString();
    
    // Initialize swarm coordination
    await this._initializeCoordination(taskId);
    
    // Start decentralized learning loop
    this._startLearningLoop(taskId);
    
    logger.info(`Swarm learning started for task: ${taskId}`);
    this.emit('swarmLearningStarted', { taskId });
  }

  /**
   * Initialize decentralized coordination
   */
  async _initializeCoordination(taskId) {
    const coordination = {
      taskId,
      consensus: new Map(),
      voting: new Map(),
      proposals: new Map(),
      status: 'initializing'
    };
    
    this.activeTasks.set(taskId, {
      ...this.activeTasks.get(taskId),
      coordination
    });
    
    // Establish consensus protocols
    await this._establishConsensusProtocols(taskId);
  }

  /**
   * Establish consensus protocols for the swarm
   */
  async _establishConsensusProtocols(taskId) {
    const task = this.activeTasks.get(taskId);
    
    // Initialize voting mechanisms
    task.coordination.voting = {
      active: new Map(),
      history: [],
      thresholds: {
        simple: 0.5,
        qualified: 0.67,
        critical: 0.8
      }
    };
    
    // Initialize proposal system
    task.coordination.proposals = {
      pending: new Map(),
      accepted: new Map(),
      rejected: new Map()
    };
    
    task.coordination.status = 'active';
  }

  /**
   * Start the main learning loop
   */
  _startLearningLoop(taskId) {
    const task = this.activeTasks.get(taskId);
    let iteration = 0;
    
    const learningInterval = setInterval(async () => {
      if (task.status !== 'active' || iteration >= this.config.maxIterations) {
        clearInterval(learningInterval);
        await this._finalizeSwarmLearning(taskId);
        return;
      }
      
      // Execute one learning iteration
      await this._executeLearningIteration(taskId, iteration);
      
      // Check for convergence
      const convergence = await this._checkConvergence(taskId);
      if (convergence) {
        clearInterval(learningInterval);
        await this._finalizeSwarmLearning(taskId);
        return;
      }
      
      iteration++;
    }, 1000); // Execute every second
  }

  /**
   * Execute a single learning iteration
   */
  async _executeLearningIteration(taskId, iteration) {
    const task = this.activeTasks.get(taskId);
    
    // 1. Local learning phase
    await this._localLearningPhase(taskId);
    
    // 2. Knowledge sharing phase
    await this._knowledgeSharingPhase(taskId);
    
    // 3. Consensus building phase
    await this._consensusBuildingPhase(taskId);
    
    // 4. Emergent behavior detection
    await this._detectEmergentBehaviors(taskId);
    
    // 5. Network adaptation
    await this._adaptNetwork(taskId);
    
    // Update metrics
    this._updatePerformanceMetrics(taskId);
    
    this.emit('learningIteration', { taskId, iteration });
  }

  /**
   * Local learning phase - agents learn independently
   */
  async _localLearningPhase(taskId) {
    const task = this.activeTasks.get(taskId);
    
    for (const [agentId, agent] of this.agents) {
      // Simulate local learning
      const localUpdate = await this._performLocalLearning(agentId, task);
      
      // Store local knowledge
      agent.knowledge.set(taskId, localUpdate);
      agent.lastActive = new Date().toISOString();
    }
  }

  /**
   * Perform local learning for an agent
   */
  async _performLocalLearning(agentId, task) {
    const agent = this.agents.get(agentId);
    
    // Simulate learning process
    const learning = {
      agentId,
      taskId: task.id,
      update: this._generateLocalUpdate(agent, task),
      confidence: Math.random() * 0.5 + 0.5,
      timestamp: new Date().toISOString()
    };
    
    return learning;
  }

  /**
   * Generate local update for an agent
   */
  _generateLocalUpdate(agent, task) {
    // Simulate model update based on agent capabilities
    const capabilityFactor = agent.capabilities.overall;
    const randomFactor = Math.random() * 0.2 - 0.1; // ±10% randomness
    
    return {
      weights: Array(10).fill(0).map(() => (Math.random() - 0.5) * capabilityFactor),
      gradients: Array(10).fill(0).map(() => (Math.random() - 0.5) * randomFactor),
      loss: Math.random() * 0.5,
      accuracy: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  /**
   * Knowledge sharing phase - agents share knowledge with neighbors
   */
  async _knowledgeSharingPhase(taskId) {
    const sharedKnowledge = new Map();
    
    for (const [agentId, agent] of this.agents) {
      const localKnowledge = agent.knowledge.get(taskId);
      if (!localKnowledge) continue;
      
      // Share with neighbors
      const neighbors = this.networkTopology.get(agentId) || new Set();
      
      for (const neighborId of neighbors) {
        if (!sharedKnowledge.has(neighborId)) {
          sharedKnowledge.set(neighborId, []);
        }
        sharedKnowledge.get(neighborId).push(localKnowledge);
      }
    }
    
    // Distribute shared knowledge
    for (const [agentId, knowledge] of sharedKnowledge) {
      const agent = this.agents.get(agentId);
      if (agent) {
        await this._processSharedKnowledge(agentId, knowledge, taskId);
      }
    }
  }

  /**
   * Process shared knowledge from neighbors
   */
  async _processSharedKnowledge(agentId, sharedKnowledge, taskId) {
    const agent = this.agents.get(agentId);
    const currentKnowledge = agent.knowledge.get(taskId);
    
    if (!currentKnowledge) return;
    
    // Aggregate shared knowledge
    const aggregated = this._aggregateKnowledge(sharedKnowledge);
    
    // Update agent's knowledge
    agent.knowledge.set(taskId, {
      ...currentKnowledge,
      sharedKnowledge: aggregated,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Aggregate knowledge from multiple sources
   */
  _aggregateKnowledge(knowledgeArray) {
    if (knowledgeArray.length === 0) return null;
    
    // Simple averaging aggregation
    const aggregated = {
      weights: Array(10).fill(0),
      confidence: 0,
      sources: knowledgeArray.length
    };
    
    knowledgeArray.forEach(k => {
      if (k.update && k.update.weights) {
        k.update.weights.forEach((w, i) => {
          aggregated.weights[i] += w / knowledgeArray.length;
        });
      }
      aggregated.confidence += k.confidence / knowledgeArray.length;
    });
    
    return aggregated;
  }

  /**
   * Consensus building phase - agents reach consensus on shared understanding
   */
  async _consensusBuildingPhase(taskId) {
    const task = this.activeTasks.get(taskId);
    
    // Collect all agent knowledge
    const allKnowledge = [];
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (knowledge) {
        allKnowledge.push({ agentId, ...knowledge });
      }
    }
    
    // Build consensus through distributed voting
    const consensus = await this._buildDistributedConsensus(allKnowledge, taskId);
    
    // Update collective knowledge
    this.knowledgeBase.set(taskId, consensus);
    
    // Update task coordination
    task.coordination.consensus.set('current', consensus);
  }

  /**
   * Build distributed consensus among agents
   */
  async _buildDistributedConsensus(knowledgeArray, taskId) {
    // Weight agents by reputation and performance
    const weightedKnowledge = knowledgeArray.map(k => {
      const agent = this.agents.get(k.agentId);
      const weight = agent.reputation * agent.performance.accuracy;
      return { ...k, weight };
    });
    
    // Calculate weighted average
    const consensus = {
      taskId,
      weights: Array(10).fill(0),
      confidence: 0,
      participants: knowledgeArray.length,
      timestamp: new Date().toISOString()
    };
    
    let totalWeight = 0;
    weightedKnowledge.forEach(k => {
      if (k.update && k.update.weights) {
        k.update.weights.forEach((w, i) => {
          consensus.weights[i] += w * k.weight;
        });
        consensus.confidence += k.confidence * k.weight;
        totalWeight += k.weight;
      }
    });
    
    // Normalize by total weight
    if (totalWeight > 0) {
      consensus.weights.forEach((w, i) => {
        consensus.weights[i] /= totalWeight;
      });
      consensus.confidence /= totalWeight;
    }
    
    return consensus;
  }

  /**
   * Detect emergent behaviors in the swarm
   */
  async _detectEmergentBehaviors(taskId) {
    const task = this.activeTasks.get(taskId);
    const behaviors = [];
    
    // Analyze communication patterns
    const communicationPatterns = this._analyzeCommunicationPatterns(taskId);
    if (communicationPatterns.length > 0) {
      behaviors.push({
        type: 'communication',
        patterns: communicationPatterns,
        timestamp: new Date().toISOString()
      });
    }
    
    // Analyze learning patterns
    const learningPatterns = this._analyzeLearningPatterns(taskId);
    if (learningPatterns.length > 0) {
      behaviors.push({
        type: 'learning',
        patterns: learningPatterns,
        timestamp: new Date().toISOString()
      });
    }
    
    // Analyze network topology changes
    const topologyPatterns = this._analyzeTopologyPatterns(taskId);
    if (topologyPatterns.length > 0) {
      behaviors.push({
        type: 'topology',
        patterns: topologyPatterns,
        timestamp: new Date().toISOString()
      });
    }
    
    if (behaviors.length > 0) {
      this.emergentPatterns.push(...behaviors);
      this.performanceMetrics.emergentBehaviors += behaviors.length;
      
      this.emit('emergentBehaviorDetected', { taskId, behaviors });
    }
  }

  /**
   * Analyze communication patterns for emergent behaviors
   */
  _analyzeCommunicationPatterns(taskId) {
    const patterns = [];
    
    // Check for clustering behavior
    const clusters = this._detectCommunicationClusters();
    if (clusters.length > 1) {
      patterns.push({
        name: 'clustering',
        description: 'Agents forming communication clusters',
        data: clusters
      });
    }
    
    // Check for information cascades
    const cascades = this._detectInformationCascades(taskId);
    if (cascades.length > 0) {
      patterns.push({
        name: 'cascade',
        description: 'Information cascades detected',
        data: cascades
      });
    }
    
    return patterns;
  }

  /**
   * Detect communication clusters in the network
   */
  _detectCommunicationClusters() {
    const clusters = [];
    const visited = new Set();
    
    for (const agentId of this.agents.keys()) {
      if (visited.has(agentId)) continue;
      
      const cluster = this._findCluster(agentId, visited);
      if (cluster.size > 1) {
        clusters.push(Array.from(cluster));
      }
    }
    
    return clusters;
  }

  /**
   * Find cluster using BFS
   */
  _findCluster(startAgentId, visited) {
    const cluster = new Set();
    const queue = [startAgentId];
    
    while (queue.length > 0) {
      const agentId = queue.shift();
      if (visited.has(agentId)) continue;
      
      visited.add(agentId);
      cluster.add(agentId);
      
      const neighbors = this.networkTopology.get(agentId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    
    return cluster;
  }

  /**
   * Detect information cascades
   */
  _detectInformationCascades(taskId) {
    const cascades = [];
    
    // Simple cascade detection based on rapid information spread
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (!knowledge || !knowledge.sharedKnowledge) continue;
      
      const neighbors = this.networkTopology.get(agentId) || new Set();
      let similarCount = 0;
      
      for (const neighborId of neighbors) {
        const neighbor = this.agents.get(neighborId);
        const neighborKnowledge = neighbor?.knowledge.get(taskId);
        
        if (neighborKnowledge && this._knowledgeSimilarity(knowledge, neighborKnowledge) > 0.8) {
          similarCount++;
        }
      }
      
      if (similarCount >= neighbors.size * 0.7) {
        cascades.push({
          source: agentId,
          affected: Array.from(neighbors),
          strength: similarCount / neighbors.size
        });
      }
    }
    
    return cascades;
  }

  /**
   * Calculate similarity between two knowledge objects
   */
  _knowledgeSimilarity(k1, k2) {
    if (!k1.update || !k2.update) return 0;
    
    const weights1 = k1.update.weights || [];
    const weights2 = k2.update.weights || [];
    
    if (weights1.length !== weights2.length) return 0;
    
    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < weights1.length; i++) {
      dotProduct += weights1[i] * weights2[i];
      norm1 += weights1[i] * weights1[i];
      norm2 += weights2[i] * weights2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Analyze learning patterns
   */
  _analyzeLearningPatterns(taskId) {
    const patterns = [];
    
    // Check for convergence patterns
    const convergencePattern = this._detectConvergencePattern(taskId);
    if (convergencePattern) {
      patterns.push(convergencePattern);
    }
    
    // Check for specialization patterns
    const specializationPattern = this._detectSpecializationPattern(taskId);
    if (specializationPattern) {
      patterns.push(specializationPattern);
    }
    
    return patterns;
  }

  /**
   * Detect convergence pattern
   */
  _detectConvergencePattern(taskId) {
    const knowledgeArray = [];
    
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (knowledge && knowledge.update) {
        knowledgeArray.push(knowledge.update.weights);
      }
    }
    
    if (knowledgeArray.length < 2) return null;
    
    // Calculate variance between agents
    const variance = this._calculateVariance(knowledgeArray);
    
    if (variance < this.config.convergenceThreshold) {
      return {
        name: 'convergence',
        description: 'Agents converging to similar solutions',
        variance,
        threshold: this.config.convergenceThreshold
      };
    }
    
    return null;
  }

  /**
   * Calculate variance between weight arrays
   */
  _calculateVariance(arrays) {
    if (arrays.length === 0) return 0;
    
    const n = arrays[0].length;
    let totalVariance = 0;
    
    for (let i = 0; i < n; i++) {
      const values = arrays.map(arr => arr[i] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      totalVariance += variance;
    }
    
    return totalVariance / n;
  }

  /**
   * Detect specialization pattern
   */
  _detectSpecializationPattern(taskId) {
    const specializations = new Map();
    
    for (const [agentId, agent] of this.agents) {
      const spec = agent.capabilities.specialization;
      specializations.set(spec, (specializations.get(spec) || 0) + 1);
    }
    
    // Check if agents are specializing
    const totalAgents = this.agents.size;
    let maxSpecialization = 0;
    
    for (const count of specializations.values()) {
      maxSpecialization = Math.max(maxSpecialization, count / totalAgents);
    }
    
    if (maxSpecialization > 0.6) {
      return {
        name: 'specialization',
        description: 'Agents developing specializations',
        distribution: Object.fromEntries(specializations),
        maxSpecialization
      };
    }
    
    return null;
  }

  /**
   * Analyze topology patterns
   */
  _analyzeTopologyPatterns(taskId) {
    const patterns = [];
    
    // Check for small-world properties
    const smallWorld = this._analyzeSmallWorldProperties();
    if (smallWorld.isSmallWorld) {
      patterns.push({
        name: 'small-world',
        description: 'Network exhibiting small-world properties',
        metrics: smallWorld
      });
    }
    
    // Check for scale-free properties
    const scaleFree = this._analyzeScaleFreeProperties();
    if (scaleFree.isScaleFree) {
      patterns.push({
        name: 'scale-free',
        description: 'Network exhibiting scale-free properties',
        metrics: scaleFree
      });
    }
    
    return patterns;
  }

  /**
   * Analyze small-world properties
   */
  _analyzeSmallWorldProperties() {
    const n = this.agents.size;
    if (n < 2) return { isSmallWorld: false };
    
    // Calculate average path length
    let totalPathLength = 0;
    let pathCount = 0;
    
    for (const agentId1 of this.agents.keys()) {
      for (const agentId2 of this.agents.keys()) {
        if (agentId1 >= agentId2) continue;
        
        const pathLength = this._calculateShortestPath(agentId1, agentId2);
        if (pathLength > 0) {
          totalPathLength += pathLength;
          pathCount++;
        }
      }
    }
    
    const avgPathLength = pathCount > 0 ? totalPathLength / pathCount : 0;
    
    // Calculate clustering coefficient
    const clusteringCoefficient = this._calculateClusteringCoefficient();
    
    return {
      isSmallWorld: avgPathLength < Math.log(n) && clusteringCoefficient > 0.3,
      avgPathLength,
      clusteringCoefficient
    };
  }

  /**
   * Calculate shortest path between two agents
   */
  _calculateShortestPath(startId, endId) {
    if (startId === endId) return 0;
    
    const visited = new Set();
    const queue = [{ id: startId, distance: 0 }];
    
    while (queue.length > 0) {
      const { id, distance } = queue.shift();
      
      if (id === endId) return distance;
      if (visited.has(id)) continue;
      
      visited.add(id);
      const neighbors = this.networkTopology.get(id) || new Set();
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, distance: distance + 1 });
        }
      }
    }
    
    return -1; // No path found
  }

  /**
   * Calculate clustering coefficient
   */
  _calculateClusteringCoefficient() {
    let totalClustering = 0;
    let agentCount = 0;
    
    for (const [agentId, neighbors] of this.networkTopology) {
      if (neighbors.size < 2) continue;
      
      let connections = 0;
      const neighborArray = Array.from(neighbors);
      
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const neighborsOfI = this.networkTopology.get(neighborArray[i]) || new Set();
          if (neighborsOfI.has(neighborArray[j])) {
            connections++;
          }
        }
      }
      
      const possibleConnections = (neighbors.size * (neighbors.size - 1)) / 2;
      const clustering = connections / possibleConnections;
      totalClustering += clustering;
      agentCount++;
    }
    
    return agentCount > 0 ? totalClustering / agentCount : 0;
  }

  /**
   * Analyze scale-free properties
   */
  _analyzeScaleFreeProperties() {
    const degreeDistribution = new Map();
    
    // Calculate degree distribution
    for (const neighbors of this.networkTopology.values()) {
      const degree = neighbors.size;
      degreeDistribution.set(degree, (degreeDistribution.get(degree) || 0) + 1);
    }
    
    // Check for power-law distribution
    const degrees = Array.from(degreeDistribution.keys()).sort((a, b) => a - b);
    const frequencies = degrees.map(d => degreeDistribution.get(d));
    
    // Simple power-law check (log-log plot should be linear)
    const logDegrees = degrees.map(d => Math.log(d));
    const logFrequencies = frequencies.map(f => Math.log(f));
    
    // Calculate correlation coefficient
    const correlation = this._calculateCorrelation(logDegrees, logFrequencies);
    
    return {
      isScaleFree: correlation < -0.8, // Strong negative correlation indicates power-law
      correlation,
      degreeDistribution: Object.fromEntries(degreeDistribution)
    };
  }

  /**
   * Calculate correlation coefficient
   */
  _calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Adapt network based on current performance
   */
  async _adaptNetwork(taskId) {
    // Analyze current network performance
    const performance = this._analyzeNetworkPerformance(taskId);
    
    // Adapt topology if needed
    if (performance.efficiency < 0.7) {
      await this._optimizeNetworkTopology(taskId);
    }
    
    // Adapt communication protocols if needed
    if (performance.communicationEfficiency < 0.8) {
      await this._adaptCommunicationProtocols(taskId);
    }
  }

  /**
   * Analyze network performance
   */
  _analyzeNetworkPerformance(taskId) {
    const task = this.activeTasks.get(taskId);
    
    // Calculate communication efficiency
    const communicationEfficiency = this._calculateCommunicationEfficiency(taskId);
    
    // Calculate learning efficiency
    const learningEfficiency = this._calculateLearningEfficiency(taskId);
    
    // Calculate overall efficiency
    const efficiency = (communicationEfficiency + learningEfficiency) / 2;
    
    return {
      communicationEfficiency,
      learningEfficiency,
      efficiency
    };
  }

  /**
   * Calculate communication efficiency
   */
  _calculateCommunicationEfficiency(taskId) {
    let totalMessages = 0;
    let successfulMessages = 0;
    
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (knowledge && knowledge.sharedKnowledge) {
        totalMessages++;
        if (knowledge.sharedKnowledge.sources > 0) {
          successfulMessages++;
        }
      }
    }
    
    return totalMessages > 0 ? successfulMessages / totalMessages : 0;
  }

  /**
   * Calculate learning efficiency
   */
  _calculateLearningEfficiency(taskId) {
    let totalAccuracy = 0;
    let agentCount = 0;
    
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (knowledge && knowledge.update) {
        totalAccuracy += knowledge.update.accuracy || 0;
        agentCount++;
      }
    }
    
    return agentCount > 0 ? totalAccuracy / agentCount : 0;
  }

  /**
   * Optimize network topology
   */
  async _optimizeNetworkTopology(taskId) {
    // Reorganize connections based on performance metrics
    for (const [agentId, agent] of this.agents) {
      const optimalConnections = this._calculateOptimalConnections(agentId);
      this.networkTopology.set(agentId, new Set(optimalConnections));
    }
    
    logger.info('Network topology optimized');
  }

  /**
   * Adapt communication protocols
   */
  async _adaptCommunicationProtocols(taskId) {
    // Adjust communication parameters based on network conditions
    const networkLoad = this._calculateNetworkLoad();
    
    if (networkLoad > 0.8) {
      // Reduce communication frequency
      this.config.communicationRadius *= 0.9;
    } else if (networkLoad < 0.3) {
      // Increase communication radius
      this.config.communicationRadius = Math.min(
        this.config.communicationRadius * 1.1,
        10
      );
    }
    
    logger.info(`Communication protocols adapted, new radius: ${this.config.communicationRadius}`);
  }

  /**
   * Calculate current network load
   */
  _calculateNetworkLoad() {
    let totalConnections = 0;
    let maxPossibleConnections = 0;
    
    for (const neighbors of this.networkTopology.values()) {
      totalConnections += neighbors.size;
      maxPossibleConnections += this.agents.size - 1;
    }
    
    return maxPossibleConnections > 0 ? totalConnections / maxPossibleConnections : 0;
  }

  /**
   * Update performance metrics
   */
  _updatePerformanceMetrics(taskId) {
    const task = this.activeTasks.get(taskId);
    
    // Calculate convergence rate
    const convergenceRate = this._calculateConvergenceRate(taskId);
    this.performanceMetrics.convergenceRate = convergenceRate;
    
    // Calculate collective intelligence
    const collectiveIntelligence = this._calculateCollectiveIntelligence(taskId);
    this.performanceMetrics.collectiveIntelligence = collectiveIntelligence;
    
    // Calculate adaptation speed
    const adaptationSpeed = this._calculateAdaptationSpeed(taskId);
    this.performanceMetrics.adaptationSpeed = adaptationSpeed;
  }

  /**
   * Calculate convergence rate
   */
  _calculateConvergenceRate(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task || !task.startTime) return 0;
    
    const elapsedTime = Date.now() - new Date(task.startTime).getTime();
    const iterations = this.collectiveMemory.filter(m => m.taskId === taskId).length;
    
    return elapsedTime > 0 ? iterations / (elapsedTime / 1000) : 0; // iterations per second
  }

  /**
   * Calculate collective intelligence
   */
  _calculateCollectiveIntelligence(taskId) {
    let totalAccuracy = 0;
    let agentCount = 0;
    
    for (const [agentId, agent] of this.agents) {
      const knowledge = agent.knowledge.get(taskId);
      if (knowledge && knowledge.update) {
        totalAccuracy += knowledge.update.accuracy || 0;
        agentCount++;
      }
    }
    
    const avgAccuracy = agentCount > 0 ? totalAccuracy / agentCount : 0;
    
    // Factor in emergent behaviors
    const emergentBonus = Math.min(this.performanceMetrics.emergentBehaviors * 0.1, 0.5);
    
    return Math.min(avgAccuracy + emergentBonus, 1.0);
  }

  /**
   * Calculate adaptation speed
   */
  _calculateAdaptationSpeed(taskId) {
    const recentPatterns = this.emergentPatterns.filter(
      p => Date.now() - new Date(p.timestamp).getTime() < 60000 // Last minute
    );
    
    return recentPatterns.length / 60; // patterns per second
  }

  /**
   * Check for convergence
   */
  async _checkConvergence(taskId) {
    const convergencePattern = this._detectConvergencePattern(taskId);
    
    if (convergencePattern && convergencePattern.variance < this.config.convergenceThreshold) {
      logger.info(`Swarm converged for task ${taskId}`);
      this.emit('swarmConverged', { taskId, pattern: convergencePattern });
      return true;
    }
    
    return false;
  }

  /**
   * Finalize swarm learning
   */
  async _finalizeSwarmLearning(taskId) {
    const task = this.activeTasks.get(taskId);
    task.status = 'completed';
    task.endTime = new Date().toISOString();
    
    // Generate final collective knowledge
    const finalKnowledge = this.knowledgeBase.get(taskId);
    
    // Store in collective memory
    this.collectiveMemory.push({
      taskId,
      finalKnowledge,
      performanceMetrics: { ...this.performanceMetrics },
      emergentPatterns: this.emergentPatterns.filter(p => p.taskId === taskId),
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Swarm learning finalized for task: ${taskId}`);
    this.emit('swarmLearningCompleted', { taskId, finalKnowledge, metrics: this.performanceMetrics });
  }

  /**
   * Get swarm status
   */
  getSwarmStatus() {
    return {
      agents: this.agents.size,
      activeTasks: this.activeTasks.size,
      networkTopology: Object.fromEntries(this.networkTopology),
      performanceMetrics: this.performanceMetrics,
      emergentPatterns: this.emergentPatterns.length,
      collectiveMemorySize: this.collectiveMemory.length
    };
  }

  /**
   * Get agent details
   */
  getAgentDetails(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get task details
   */
  getTaskDetails(taskId) {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get emergent patterns
   */
  getEmergentPatterns(taskId = null) {
    if (taskId) {
      return this.emergentPatterns.filter(p => p.taskId === taskId);
    }
    return this.emergentPatterns;
  }

  /**
   * Get collective memory
   */
  getCollectiveMemory() {
    return this.collectiveMemory;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.agents.clear();
    this.networkTopology.clear();
    this.knowledgeBase.clear();
    this.communicationChannels.clear();
    this.activeTasks.clear();
    this.emergentPatterns = [];
    this.collectiveMemory = [];
    
    logger.info('Swarm coordinator cleaned up');
  }
}

module.exports = SwarmCoordinator;
