/**
 * Swarm Intelligence Coordinator
 * Coordinates multiple optimization agents and manages collective intelligence
 */

const EventEmitter = require('events');

class SwarmIntelligenceCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.agents = new Map();
    this.communicationNetwork = new Map();
    this.sharedKnowledge = new Map();
    this.globalBest = null;
    this.iteration = 0;
    this.convergenceHistory = [];
    
    this.config = {
      populationSize: options.populationSize || 30,
      communicationRadius: options.communicationRadius || 0.3,
      knowledgeSharingRate: options.knowledgeSharingRate || 0.1,
      diversityThreshold: options.diversityThreshold || 0.2,
      collaborationMode: options.collaborationMode || 'competitive', // competitive, cooperative, hybrid
      adaptationRate: options.adaptationRate || 0.05
    };
  }

  /**
   * Add an optimization agent to the swarm
   */
  addAgent(agentId, agent, specialization = null) {
    const agentInfo = {
      id: agentId,
      agent,
      specialization, // learning_path, resource_allocation, hybrid
      fitness: 0,
      personalBest: null,
      neighbors: new Set(),
      communicationHistory: [],
      adaptationLevel: 1.0,
      lastUpdate: Date.now()
    };
    
    this.agents.set(agentId, agentInfo);
    this.communicationNetwork.set(agentId, new Map());
    
    // Initialize agent connections
    this.updateAgentConnections(agentId);
    
    this.emit('agentAdded', { agentId, specialization });
    
    return agentInfo;
  }

  /**
   * Remove an agent from the swarm
   */
  removeAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Remove from communication network
    this.communicationNetwork.delete(agentId);
    
    // Remove from neighbors lists
    for (const [id, agentInfo] of this.agents) {
      agentInfo.neighbors.delete(agentId);
      this.communicationNetwork.get(id)?.delete(agentId);
    }
    
    this.agents.delete(agentId);
    
    this.emit('agentRemoved', { agentId });
    
    return true;
  }

  /**
   * Update agent connections based on communication radius
   */
  updateAgentConnections(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    agent.neighbors.clear();
    
    for (const [otherId, otherAgent] of this.agents) {
      if (otherId !== agentId) {
        const distance = this.calculateAgentDistance(agentId, otherId);
        
        if (distance <= this.config.communicationRadius) {
          agent.neighbors.add(otherId);
          otherAgent.neighbors.add(agentId);
        }
      }
    }
  }

  /**
   * Calculate distance between two agents
   */
  calculateAgentDistance(agentId1, agentId2) {
    const agent1 = this.agents.get(agentId1);
    const agent2 = this.agents.get(agentId2);
    
    if (!agent1 || !agent2) return Infinity;
    
    // Calculate distance based on specialization and performance
    let distance = 0;
    
    // Specialization distance
    if (agent1.specialization && agent2.specialization) {
      distance += agent1.specialization === agent2.specialization ? 0 : 0.5;
    }
    
    // Performance distance
    const fitnessDiff = Math.abs(agent1.fitness - agent2.fitness);
    distance += fitnessDiff * 0.3;
    
    // Adaptation level distance
    const adaptationDiff = Math.abs(agent1.adaptationLevel - agent2.adaptationLevel);
    distance += adaptationDiff * 0.2;
    
    return Math.min(1.0, distance);
  }

  /**
   * Execute one iteration of swarm intelligence
   */
  async executeIteration(problemContext) {
    this.iteration++;
    
    // Phase 1: Individual optimization
    const individualResults = await this.executeIndividualOptimization(problemContext);
    
    // Phase 2: Knowledge sharing
    await this.shareKnowledge();
    
    // Phase 3: Collaborative adaptation
    await this.adaptAgents(problemContext);
    
    // Phase 4: Update global best
    this.updateGlobalBest();
    
    // Phase 5: Check convergence
    const convergence = this.checkConvergence();
    
    // Record iteration history
    this.convergenceHistory.push({
      iteration: this.iteration,
      globalBestFitness: this.globalBest?.fitness || 0,
      averageFitness: this.calculateAverageFitness(),
      diversity: this.calculateDiversity(),
      convergence: convergence
    });
    
    this.emit('iterationCompleted', {
      iteration: this.iteration,
      globalBest: this.globalBest,
      convergence
    });
    
    return {
      iteration: this.iteration,
      globalBest: this.globalBest,
      individualResults,
      convergence
    };
  }

  /**
   * Execute individual optimization for each agent
   */
  async executeIndividualOptimization(problemContext) {
    const results = new Map();
    
    for (const [agentId, agentInfo] of this.agents) {
      try {
        // Adapt problem context for agent specialization
        const adaptedContext = this.adaptProblemContext(problemContext, agentInfo);
        
        // Execute agent optimization
        const result = await agentInfo.agent.optimize(adaptedContext);
        
        // Update agent fitness
        agentInfo.fitness = this.calculateFitness(result, agentInfo.specialization);
        
        // Update personal best
        if (!agentInfo.personalBest || agentInfo.fitness > agentInfo.personalBest.fitness) {
          agentInfo.personalBest = {
            ...result,
            fitness: agentInfo.fitness,
            timestamp: Date.now()
          };
        }
        
        results.set(agentId, result);
        
      } catch (error) {
        console.error(`Agent ${agentId} optimization failed:`, error);
        agentInfo.fitness = 0;
      }
    }
    
    return results;
  }

  /**
   * Adapt problem context for agent specialization
   */
  adaptProblemContext(problemContext, agentInfo) {
    const adapted = { ...problemContext };
    
    switch (agentInfo.specialization) {
      case 'learning_path':
        adapted.focus = 'efficiency';
        adapted.weights = { difficulty: 0.3, time: 0.4, satisfaction: 0.3 };
        break;
      case 'resource_allocation':
        adapted.focus = 'utilization';
        adapted.weights = { cost: 0.3, utilization: 0.4, satisfaction: 0.3 };
        break;
      case 'hybrid':
        adapted.focus = 'balanced';
        adapted.weights = { efficiency: 0.25, utilization: 0.25, cost: 0.25, satisfaction: 0.25 };
        break;
      default:
        adapted.focus = 'general';
        adapted.weights = { balanced: 1.0 };
    }
    
    return adapted;
  }

  /**
   * Calculate fitness for an agent's result
   */
  calculateFitness(result, specialization) {
    if (!result) return 0;
    
    let fitness = 0;
    
    switch (specialization) {
      case 'learning_path':
        fitness = result.efficiency * 0.4 + (1 / result.totalDistance) * 0.3 + (1 / (result.iterations + 1)) * 0.3;
        break;
      case 'resource_allocation':
        fitness = result.utilization * 0.4 + result.satisfaction * 0.3 + (1 / (result.totalCost + 1)) * 0.3;
        break;
      case 'hybrid':
        fitness = (result.efficiency || result.utilization || 0) * 0.5 + 
                 (result.satisfaction || 0) * 0.3 + 
                 (1 / ((result.totalCost || result.totalDistance || 1) + 1)) * 0.2;
        break;
      default:
        fitness = result.score || result.efficiency || result.utilization || 0;
    }
    
    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * Share knowledge between connected agents
   */
  async shareKnowledge() {
    const sharedKnowledge = new Map();
    
    for (const [agentId, agentInfo] of this.agents) {
      if (Math.random() < this.config.knowledgeSharingRate) {
        // Select knowledge to share
        const knowledge = this.selectKnowledgeToShare(agentInfo);
        
        // Share with neighbors
        for (const neighborId of agentInfo.neighbors) {
          const neighbor = this.agents.get(neighborId);
          if (neighbor) {
            this.transmitKnowledge(agentId, neighborId, knowledge);
            sharedKnowledge.set(`${agentId}->${neighborId}`, knowledge);
          }
        }
      }
    }
    
    this.emit('knowledgeShared', { knowledge: sharedKnowledge });
  }

  /**
   * Select knowledge for an agent to share
   */
  selectKnowledgeToShare(agentInfo) {
    if (!agentInfo.personalBest) return null;
    
    return {
      source: agentInfo.id,
      specialization: agentInfo.specialization,
      solution: agentInfo.personalBest,
      fitness: agentInfo.fitness,
      adaptationLevel: agentInfo.adaptationLevel,
      timestamp: Date.now()
    };
  }

  /**
   * Transmit knowledge from one agent to another
   */
  transmitKnowledge(fromAgentId, toAgentId, knowledge) {
    const toAgent = this.agents.get(toAgentId);
    const fromAgent = this.agents.get(fromAgentId);
    
    if (!toAgent || !fromAgent || !knowledge) return;
    
    // Store in communication network
    const network = this.communicationNetwork.get(toAgentId);
    network.set(fromAgentId, knowledge);
    
    // Record communication history
    toAgent.communicationHistory.push({
      from: fromAgentId,
      knowledge,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (toAgent.communicationHistory.length > 100) {
      toAgent.communicationHistory = toAgent.communicationHistory.slice(-50);
    }
  }

  /**
   * Adapt agents based on shared knowledge
   */
  async adaptAgents(problemContext) {
    for (const [agentId, agentInfo] of this.agents) {
      const adaptation = this.calculateAdaptation(agentInfo);
      
      if (adaptation.shouldAdapt) {
        await this.applyAdaptation(agentId, adaptation, problemContext);
      }
    }
  }

  /**
   * Calculate adaptation needed for an agent
   */
  calculateAdaptation(agentInfo) {
    const recentCommunications = agentInfo.communicationHistory.filter(
      comm => Date.now() - comm.timestamp < 10000 // Last 10 seconds
    );
    
    if (recentCommunications.length === 0) {
      return { shouldAdapt: false };
    }
    
    // Find best knowledge from neighbors
    const bestKnowledge = recentCommunications.reduce((best, comm) => {
      return (!best || comm.knowledge.fitness > best.fitness) ? comm.knowledge : best;
    }, null);
    
    if (!bestKnowledge || bestKnowledge.fitness <= agentInfo.fitness) {
      return { shouldAdapt: false };
    }
    
    const fitnessImprovement = bestKnowledge.fitness - agentInfo.fitness;
    const shouldAdapt = fitnessImprovement > this.config.adaptationRate;
    
    return {
      shouldAdapt,
      bestKnowledge,
      fitnessImprovement,
      adaptationStrength: Math.min(1.0, fitnessImprovement * 2)
    };
  }

  /**
   * Apply adaptation to an agent
   */
  async applyAdaptation(agentId, adaptation, problemContext) {
    const agentInfo = this.agents.get(agentId);
    if (!agentInfo || !adaptation.bestKnowledge) return;
    
    // Update adaptation level
    agentInfo.adaptationLevel = Math.min(2.0, 
      agentInfo.adaptationLevel + adaptation.adaptationStrength * 0.1
    );
    
    // Incorporate knowledge into agent's parameters
    const knowledge = adaptation.bestKnowledge;
    
    // Adapt agent parameters based on collaboration mode
    switch (this.config.collaborationMode) {
      case 'cooperative':
        await this.cooperativeAdaptation(agentInfo, knowledge, problemContext);
        break;
      case 'competitive':
        await this.competitiveAdaptation(agentInfo, knowledge, problemContext);
        break;
      case 'hybrid':
        await this.hybridAdaptation(agentInfo, knowledge, problemContext);
        break;
    }
    
    agentInfo.lastUpdate = Date.now();
    
    this.emit('agentAdapted', { 
      agentId, 
      adaptationStrength: adaptation.adaptationStrength,
      fitnessImprovement: adaptation.fitnessImprovement
    });
  }

  /**
   * Cooperative adaptation strategy
   */
  async cooperativeAdaptation(agentInfo, knowledge, problemContext) {
    // Blend parameters with successful neighbor
    const blendFactor = 0.3;
    
    if (agentInfo.agent.setParameters) {
      const currentParams = agentInfo.agent.getParameters();
      const neighborParams = knowledge.solution.parameters || {};
      
      const blendedParams = this.blendParameters(currentParams, neighborParams, blendFactor);
      agentInfo.agent.setParameters(blendedParams);
    }
  }

  /**
   * Competitive adaptation strategy
   */
  async competitiveAdaptation(agentInfo, knowledge, problemContext) {
    // Learn from successful strategies but maintain individuality
    const learningFactor = 0.2;
    
    if (agentInfo.agent.learnFrom) {
      await agentInfo.agent.learnFrom(knowledge.solution, learningFactor);
    }
  }

  /**
   * Hybrid adaptation strategy
   */
  async hybridAdaptation(agentInfo, knowledge, problemContext) {
    // Combine cooperative and competitive strategies
    await this.cooperativeAdaptation(agentInfo, knowledge, problemContext);
    await this.competitiveAdaptation(agentInfo, knowledge, problemContext);
  }

  /**
   * Blend parameters from two sources
   */
  blendParameters(params1, params2, blendFactor) {
    const blended = {};
    
    const allKeys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
    
    for (const key of allKeys) {
      const val1 = params1[key] || 0;
      const val2 = params2[key] || 0;
      
      blended[key] = val1 * (1 - blendFactor) + val2 * blendFactor;
    }
    
    return blended;
  }

  /**
   * Update global best solution
   */
  updateGlobalBest() {
    for (const [agentId, agentInfo] of this.agents) {
      if (agentInfo.personalBest && 
          (!this.globalBest || agentInfo.fitness > this.globalBest.fitness)) {
        this.globalBest = {
          ...agentInfo.personalBest,
          agentId,
          fitness: agentInfo.fitness,
          iteration: this.iteration
        };
      }
    }
  }

  /**
   * Check swarm convergence
   */
  checkConvergence() {
    const diversity = this.calculateDiversity();
    const fitnessStability = this.calculateFitnessStability();
    
    // Converged if diversity is low and fitness is stable
    return diversity < this.config.diversityThreshold && fitnessStability > 0.9;
  }

  /**
   * Calculate swarm diversity
   */
  calculateDiversity() {
    const agents = Array.from(this.agents.values());
    if (agents.length < 2) return 0;
    
    let totalDistance = 0;
    let comparisons = 0;
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        totalDistance += this.calculateAgentDistance(
          agents[i].id, 
          agents[j].id
        );
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  /**
   * Calculate fitness stability over recent iterations
   */
  calculateFitnessStability() {
    if (this.convergenceHistory.length < 5) return 0;
    
    const recent = this.convergenceHistory.slice(-5);
    const fitnesses = recent.map(h => h.globalBestFitness);
    
    const mean = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const variance = fitnesses.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / fitnesses.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, 1 - stdDev);
  }

  /**
   * Calculate average fitness across all agents
   */
  calculateAverageFitness() {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) return 0;
    
    const totalFitness = agents.reduce((sum, agent) => sum + agent.fitness, 0);
    return totalFitness / agents.length;
  }

  /**
   * Get swarm statistics
   */
  getSwarmStatistics() {
    const agents = Array.from(this.agents.values());
    
    const specializations = {};
    agents.forEach(agent => {
      const spec = agent.specialization || 'general';
      specializations[spec] = (specializations[spec] || 0) + 1;
    });
    
    return {
      totalAgents: agents.length,
      iteration: this.iteration,
      globalBestFitness: this.globalBest?.fitness || 0,
      averageFitness: this.calculateAverageFitness(),
      diversity: this.calculateDiversity(),
      convergence: this.checkConvergence(),
      specializations,
      averageAdaptationLevel: agents.reduce((sum, a) => sum + a.adaptationLevel, 0) / agents.length,
      totalCommunications: agents.reduce((sum, a) => sum + a.communicationHistory.length, 0)
    };
  }

  /**
   * Reset the swarm
   */
  reset() {
    this.iteration = 0;
    this.globalBest = null;
    this.convergenceHistory = [];
    
    for (const [agentId, agentInfo] of this.agents) {
      agentInfo.fitness = 0;
      agentInfo.personalBest = null;
      agentInfo.communicationHistory = [];
      agentInfo.adaptationLevel = 1.0;
      agentInfo.lastUpdate = Date.now();
    }
    
    // Clear communication network
    for (const [agentId] of this.communicationNetwork) {
      this.communicationNetwork.set(agentId, new Map());
    }
    
    this.emit('swarmReset');
  }

  /**
   * Update swarm configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update agent connections if communication radius changed
    if (newConfig.communicationRadius !== undefined) {
      for (const agentId of this.agents.keys()) {
        this.updateAgentConnections(agentId);
      }
    }
    
    this.emit('configUpdated', this.config);
  }
}

module.exports = SwarmIntelligenceCoordinator;
