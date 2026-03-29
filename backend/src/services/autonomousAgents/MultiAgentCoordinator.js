const EventEmitter = require('events');
const AutonomousAgent = require('./AutonomousAgent');
const logger = require('../../utils/logger');

/**
 * Multi-Agent Coordination System
 * Manages coordination and communication between autonomous agents
 */
class MultiAgentCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxAgents: config.maxAgents || 100,
      coordinationTimeout: config.coordinationTimeout || 30000,
      consensusThreshold: config.consensusThreshold || 0.67,
      communicationRadius: config.communicationRadius || 5,
      ...config
    };
    
    this.agents = new Map();
    this.teams = new Map();
    this.activeTasks = new Map();
    this.coordinationProtocols = new Map();
    this.sharedKnowledge = new Map();
    this.emergentBehaviors = [];
    
    this.performanceMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      averageCompletionTime: 0,
      coordinationEfficiency: 0,
      emergentBehaviorCount: 0
    };
  }

  /**
   * Register an autonomous agent
   */
  async registerAgent(agentConfig) {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error('Maximum agent capacity reached');
    }

    const agent = new AutonomousAgent(agentConfig);
    this.agents.set(agent.id, agent);
    
    // Set up event listeners
    this._setupAgentListeners(agent);
    
    logger.info(`Agent registered: ${agent.id} (Type: ${agent.type})`);
    this.emit('agentRegistered', { agentId: agent.id, type: agent.type });
    
    return agent.id;
  }

  /**
   * Create agent team for collaborative task
   */
  async createTeam(teamConfig) {
    const teamId = `team_${Date.now()}`;
    const team = {
      id: teamId,
      agents: new Set(teamConfig.agentIds),
      task: teamConfig.task,
      coordination: {
        protocol: teamConfig.protocol || 'consensus',
        leader: null,
        communicationPattern: teamConfig.pattern || 'mesh'
      },
      state: 'forming',
      performance: {
        tasksCompleted: 0,
        collaborationScore: 0
      }
    };

    // Validate agent availability
    for (const agentId of team.agents) {
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not available`);
      }
    }

    this.teams.set(teamId, team);
    await this._initializeTeamCoordination(team);
    
    logger.info(`Team created: ${teamId} with ${team.agents.size} agents`);
    this.emit('teamCreated', { teamId, agentCount: team.agents.size });
    
    return teamId;
  }

  /**
   * Assign task to agent or team
   */
  async assignTask(taskDefinition, targetId) {
    const task = {
      id: `task_${Date.now()}`,
      ...taskDefinition,
      status: 'assigned',
      assignedTo: targetId,
      createdAt: new Date().toISOString(),
      priority: taskDefinition.priority || 'normal'
    };

    this.activeTasks.set(task.id, task);
    this.performanceMetrics.totalTasks++;

    if (this.teams.has(targetId)) {
      await this._assignTaskToTeam(task, targetId);
    } else if (this.agents.has(targetId)) {
      await this._assignTaskToAgent(task, targetId);
    } else {
      throw new Error(`Target ${targetId} not found`);
    }

    logger.info(`Task ${task.id} assigned to ${targetId}`);
    this.emit('taskAssigned', { taskId: task.id, targetId });
    
    return task.id;
  }

  /**
   * Facilitate multi-agent consensus
   */
  async reachConsensus(proposal, agentIds) {
    const votes = new Map();
    const participatingAgents = agentIds.filter(id => this.agents.has(id));
    
    // Collect votes from agents
    const votingPromises = participatingAgents.map(async (agentId) => {
      const agent = this.agents.get(agentId);
      const decision = await agent.makeDecision({
        state: { proposal, action: 'vote' },
        type: 'consensus_voting'
      });
      
      votes.set(agentId, decision.approved ? 1 : 0);
      return { agentId, vote: decision.approved };
    });

    await Promise.all(votingPromises);

    // Calculate consensus
    const totalVotes = votes.size;
    const approvalVotes = Array.from(votes.values()).reduce((sum, v) => sum + v, 0);
    const consensusRatio = approvalVotes / totalVotes;
    
    const consensusReached = consensusRatio >= this.config.consensusThreshold;
    
    logger.info(`Consensus ${consensusReached ? 'reached' : 'not reached'}: ${consensusRatio.toFixed(2)} threshold: ${this.config.consensusThreshold}`);
    
    this.emit('consensusReached', { 
      proposal, 
      consensusReached, 
      ratio: consensusRatio,
      votes: Object.fromEntries(votes)
    });

    return {
      consensusReached,
      ratio: consensusRatio,
      votes: Object.fromEntries(votes)
    };
  }

  /**
   * Optimize agent coordination based on performance
   */
  async optimizeCoordination() {
    logger.info('Optimizing multi-agent coordination...');
    
    const optimizations = [];
    
    // Analyze team performance
    for (const [teamId, team] of this.teams) {
      const performance = await this._analyzeTeamPerformance(team);
      
      if (performance.collaborationScore < 0.6) {
        // Reorganize team composition
        const reorganization = await this._reorganizeTeam(teamId, performance);
        optimizations.push({ teamId, action: 'reorganized', result: reorganization });
      }
    }

    // Update coordination protocols
    await this._updateCoordinationProtocols();
    
    // Detect emergent behaviors
    await this._detectEmergentBehaviors();
    
    this.performanceMetrics.coordinationEfficiency = 
      (this.performanceMetrics.completedTasks / this.performanceMetrics.totalTasks) * 100;

    logger.info(`Coordination optimization complete. Efficiency: ${this.performanceMetrics.coordinationEfficiency.toFixed(1)}%`);
    
    this.emit('coordinationOptimized', { optimizations });
    
    return optimizations;
  }

  /**
   * Get system-wide performance metrics
   */
  getSystemMetrics() {
    const agentMetrics = Array.from(this.agents.values()).map(agent => 
      agent.getPerformanceReport()
    );

    const teamMetrics = Array.from(this.teams.values()).map(team => ({
      teamId: team.id,
      agentCount: team.agents.size,
      state: team.state,
      performance: team.performance
    }));

    return {
      totalAgents: this.agents.size,
      totalTeams: this.teams.size,
      activeTasks: this.activeTasks.size,
      performanceMetrics: this.performanceMetrics,
      emergentBehaviors: this.emergentBehaviors.length,
      agentMetrics,
      teamMetrics,
      sharedKnowledgeSize: this.sharedKnowledge.size
    };
  }

  /**
   * Set up agent event listeners
   */
  _setupAgentListeners(agent) {
    agent.on('decisionMade', (data) => {
      this.emit('agentDecisionMade', { ...data, coordinator: true });
    });

    agent.on('taskCompleted', (data) => {
      this.performanceMetrics.completedTasks++;
      this.emit('agentTaskCompleted', { ...data, coordinator: true });
    });

    agent.on('taskFailed', async (data) => {
      // Trigger self-healing
      const agentObj = this.agents.get(data.agentId);
      if (agentObj) {
        await agentObj.selfHeal({ task: data.task, error: data.error });
      }
      this.emit('agentTaskFailed', { ...data, coordinator: true });
    });

    agent.on('learned', (data) => {
      this._updateSharedKnowledge(data);
      this.emit('agentLearned', { ...data, coordinator: true });
    });
  }

  /**
   * Initialize team coordination protocols
   */
  async _initializeTeamCoordination(team) {
    const protocol = {
      id: `protocol_${team.id}`,
      type: team.coordination.protocol,
      participants: Array.from(team.agents),
      state: 'active',
      messageQueue: [],
      synchronizationPoints: []
    };

    this.coordinationProtocols.set(team.id, protocol);
    
    // Establish communication channels
    await this._establishCommunicationChannels(team);
    
    // Elect team leader if needed
    if (team.coordination.protocol === 'hierarchical') {
      await this._electTeamLeader(team);
    }
  }

  /**
   * Assign task to team
   */
  async _assignTaskToTeam(task, teamId) {
    const team = this.teams.get(teamId);
    team.task = task;
    team.state = 'executing';

    // Decompose task for team members
    const subtasks = await this._decomposeTask(task, team);
    
    // Distribute subtasks
    for (const [index, subtask] of subtasks.entries()) {
      const agentId = Array.from(team.agents)[index % team.agents.size];
      await this._assignTaskToAgent(subtask, agentId);
    }
  }

  /**
   * Assign task to individual agent
   */
  async _assignTaskToAgent(task, agentId) {
    const agent = this.agents.get(agentId);
    
    try {
      const result = await agent.executeTask(task);
      task.status = 'completed';
      task.result = result;
      
      if (task.assignedTo && this.teams.has(task.assignedTo)) {
        const team = this.teams.get(task.assignedTo);
        team.performance.tasksCompleted++;
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
    }
  }

  /**
   * Update shared knowledge base
   */
  _updateSharedKnowledge(learningData) {
    const key = `knowledge_${Date.now()}`;
    this.sharedKnowledge.set(key, {
      timestamp: new Date().toISOString(),
      agentId: learningData.agentId,
      experience: learningData.experience,
      qValue: learningData.newQ
    });

    // Limit knowledge base size
    if (this.sharedKnowledge.size > 1000) {
      const entries = Array.from(this.sharedKnowledge.entries());
      entries.slice(0, 100).forEach(([key]) => this.sharedKnowledge.delete(key));
    }
  }

  /**
   * Analyze team performance
   */
  async _analyzeTeamPerformance(team) {
    return {
      collaborationScore: team.performance.collaborationScore,
      taskCompletionRate: team.performance.tasksCompleted / (this.performanceMetrics.totalTasks || 1),
      communicationEfficiency: Math.random() * 0.3 + 0.7, // Placeholder
      cohesionMetric: Math.random() * 0.4 + 0.6 // Placeholder
    };
  }

  /**
   * Reorganize team based on performance
   */
  async _reorganizeTeam(teamId, performance) {
    const team = this.teams.get(teamId);
    
    // Simple reorganization: shuffle agent assignments
    const agentArray = Array.from(team.agents);
    const shuffled = agentArray.sort(() => Math.random() - 0.5);
    team.agents = new Set(shuffled);
    
    return { previousScore: performance.collaborationScore, agentsShuffled: true };
  }

  /**
   * Update coordination protocols
   */
  async _updateCoordinationProtocols() {
    for (const [teamId, protocol] of this.coordinationProtocols) {
      protocol.state = 'updated';
      protocol.lastUpdate = new Date().toISOString();
    }
  }

  /**
   * Detect emergent behaviors in multi-agent system
   */
  async _detectEmergentBehaviors() {
    // Analyze patterns across agent interactions
    const patterns = [];
    
    // Check for collaborative learning clusters
    const collaborationClusters = this._findCollaborationClusters();
    if (collaborationClusters.length > 0) {
      patterns.push({
        type: 'collaborative_clustering',
        description: 'Agents forming spontaneous collaboration groups',
        clusters: collaborationClusters
      });
    }

    // Check for knowledge sharing cascades
    const knowledgeCascades = this._findKnowledgeCascades();
    if (knowledgeCascades.length > 0) {
      patterns.push({
        type: 'knowledge_cascade',
        description: 'Rapid knowledge propagation through network',
        cascades: knowledgeCascades
      });
    }

    this.emergentBehaviors = [...this.emergentBehaviors, ...patterns];
    this.performanceMetrics.emergentBehaviorCount = this.emergentBehaviors.length;
    
    patterns.forEach(pattern => {
      this.emit('emergentBehaviorDetected', pattern);
    });
  }

  /**
   * Find collaboration clusters
   */
  _findCollaborationClusters() {
    // Simplified clustering algorithm
    return [];
  }

  /**
   * Find knowledge cascades
   */
  _findKnowledgeCascades() {
    // Simplified cascade detection
    return [];
  }

  /**
   * Establish communication channels for team
   */
  async _establishCommunicationChannels(team) {
    // Implement based on communication pattern
    switch (team.coordination.communicationPattern) {
      case 'mesh':
        // All-to-all communication
        break;
      case 'star':
        // Central hub communication
        break;
      case 'ring':
        // Sequential communication
        break;
    }
  }

  /**
   * Elect team leader
   */
  async _electTeamLeader(team) {
    // Election based on performance metrics
    let bestAgent = null;
    let bestScore = 0;

    for (const agentId of team.agents) {
      const agent = this.agents.get(agentId);
      const score = agent.performanceMetrics.successRate;
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    team.coordination.leader = bestAgent;
  }

  /**
   * Decompose task for team distribution
   */
  async _decomposeTask(task, team) {
    const agentCount = team.agents.size;
    const subtasks = [];

    // Simple decomposition: divide work equally
    for (let i = 0; i < agentCount; i++) {
      subtasks.push({
        ...task,
        id: `${task.id}_sub_${i}`,
        portion: i,
        totalPortions: agentCount
      });
    }

    return subtasks;
  }
}

module.exports = MultiAgentCoordinator;
