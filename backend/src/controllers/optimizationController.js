const LearningPathOptimizer = require('../optimization/learning/LearningPathOptimizer');
const ResourceAllocator = require('../optimization/resources/ResourceAllocator');
const DynamicReplanner = require('../optimization/replanning/DynamicReplanner');
const SwarmCoordinator = require('../optimization/swarm/SwarmCoordinator');
const OptimizationAnalytics = require('../optimization/analytics/OptimizationAnalytics');

/**
 * Main Optimization Controller
 * Provides API endpoints for all optimization services
 */
class OptimizationController {
  constructor() {
    this.learningOptimizer = new LearningPathOptimizer();
    this.resourceAllocator = new ResourceAllocator();
    this.dynamicReplanner = new DynamicReplanner();
    this.swarmCoordinator = new SwarmCoordinator();
    this.analytics = new OptimizationAnalytics();
    
    this.activeSessions = new Map();
    this.sessionCounter = 0;
  }

  /**
   * Initialize optimization services
   */
  async initialize() {
    try {
      console.log('Initializing optimization services...');
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Optimization services initialized successfully');
      return { success: true, message: 'Optimization services ready' };
    } catch (error) {
      console.error('Failed to initialize optimization services:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for coordination
   */
  setupEventListeners() {
    // Learning path optimization events
    this.learningOptimizer.on('pathOptimized', (data) => {
      this.analytics.recordMetrics(data.sessionId, {
        iteration: data.iteration,
        bestFitness: data.bestFitness,
        qualityMetrics: data.qualityMetrics
      });
    });

    // Resource allocation events
    this.resourceAllocator.on('allocationCompleted', (data) => {
      this.analytics.recordMetrics(data.sessionId, {
        performance: data.metrics,
        resourceUsage: data.resourceUsage
      });
    });

    // Dynamic replanning events
    this.dynamicReplanner.on('replanningCompleted', (data) => {
      this.analytics.recordMetrics(data.sessionId, {
        iteration: data.iteration,
        bestFitness: data.improvement,
        performance: data.performance
      });
    });

    // Swarm coordination events
    this.swarmCoordinator.on('swarmCoordinated', (data) => {
      this.analytics.recordMetrics('swarm', {
        performance: data.performance,
        qualityMetrics: data.qualityMetrics
      });
    });
  }

  /**
   * Create new optimization session
   */
  createSession(type, config = {}) {
    const sessionId = `session_${++this.sessionCounter}`;
    
    const session = {
      id: sessionId,
      type,
      config,
      createdAt: new Date(),
      status: 'active',
      results: null
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Optimize learning path
   */
  async optimizeLearningPath(req, res) {
    try {
      const { userProfile, targetSkills, options = {} } = req.body;
      
      if (!userProfile || !targetSkills) {
        return res.status(400).json({
          error: 'Missing required fields: userProfile, targetSkills'
        });
      }

      // Create session
      const sessionId = this.createSession('learning_path', { userProfile, targetSkills });
      
      // Set user profile
      this.learningOptimizer.setUserProfile(userProfile);
      
      // Add courses if provided
      if (options.courses) {
        for (const course of options.courses) {
          this.learningOptimizer.addCourse(course.id, course);
        }
      }

      // Optimize learning path
      const result = await this.learningOptimizer.optimizeLearningPath(targetSkills, {
        ...options,
        sessionId,
        onProgress: (progress) => {
          this.analytics.recordMetrics(sessionId, {
            iteration: progress.iteration,
            bestFitness: progress.bestSolution.fitness,
            convergenceData: progress.convergence
          });
        }
      });

      // Update session
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.results = result;
        session.status = 'completed';
      }

      // Generate visualizations
      const convergenceViz = this.analytics.generateConvergenceVisualization(sessionId);
      const pathViz = this.analytics.generateLearningPathVisualization(result.learningPath);

      res.json({
        success: true,
        sessionId,
        result,
        visualizations: {
          convergence: convergenceViz,
          path: pathViz
        }
      });

    } catch (error) {
      console.error('Learning path optimization error:', error);
      res.status(500).json({
        error: 'Learning path optimization failed',
        details: error.message
      });
    }
  }

  /**
   * Optimize resource allocation
   */
  async optimizeResourceAllocation(req, res) {
    try {
      const { resources, demands, constraints = [], options = {} } = req.body;
      
      if (!resources || !demands) {
        return res.status(400).json({
          error: 'Missing required fields: resources, demands'
        });
      }

      // Create session
      const sessionId = this.createSession('resource_allocation', { resources, demands });
      
      // Add resources
      for (const resource of resources) {
        this.resourceAllocator.addResource(resource.id, resource);
      }

      // Add demands
      for (const demand of demands) {
        this.resourceAllocator.addDemand(demand.id, demand);
      }

      // Add constraints
      for (const constraint of constraints) {
        this.resourceAllocator.addConstraint(constraint.id, constraint);
      }

      // Optimize allocation
      const result = await this.resourceAllocator.optimizeAllocation({
        ...options,
        sessionId,
        onProgress: (progress) => {
          this.analytics.recordMetrics(sessionId, {
            iteration: progress.iteration,
            bestFitness: progress.bestSolution.fitness,
            performance: progress.performance,
            resourceUsage: progress.resourceUsage
          });
        }
      });

      // Update session
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.results = result;
        session.status = 'completed';
      }

      // Generate visualizations
      const resourceViz = this.analytics.generateResourceVisualization(result);
      const performanceViz = this.analytics.generatePerformanceHeatmap(sessionId);

      res.json({
        success: true,
        sessionId,
        result,
        visualizations: {
          allocation: resourceViz,
          performance: performanceViz
        }
      });

    } catch (error) {
      console.error('Resource allocation optimization error:', error);
      res.status(500).json({
        error: 'Resource allocation optimization failed',
        details: error.message
      });
    }
  }

  /**
   * Register path for dynamic replanning
   */
  async registerPath(req, res) {
    try {
      const { pathId, pathData } = req.body;
      
      if (!pathId || !pathData) {
        return res.status(400).json({
          error: 'Missing required fields: pathId, pathData'
        });
      }

      // Register path
      const path = this.dynamicReplanner.registerPath(pathId, pathData);

      res.json({
        success: true,
        pathId,
        path
      });

    } catch (error) {
      console.error('Path registration error:', error);
      res.status(500).json({
        error: 'Path registration failed',
        details: error.message
      });
    }
  }

  /**
   * Update environment state for replanning
   */
  async updateEnvironmentState(req, res) {
    try {
      const { pathId, updates } = req.body;
      
      if (!pathId || !updates) {
        return res.status(400).json({
          error: 'Missing required fields: pathId, updates'
        });
      }

      // Update environment state
      this.dynamicReplanner.updateEnvironmentState(pathId, updates);

      res.json({
        success: true,
        message: 'Environment state updated'
      });

    } catch (error) {
      console.error('Environment state update error:', error);
      res.status(500).json({
        error: 'Environment state update failed',
        details: error.message
      });
    }
  }

  /**
   * Initialize swarm coordination
   */
  async initializeSwarm(req, res) {
    try {
      const { colonies = [], config = {} } = req.body;

      // Add colonies
      for (const colony of colonies) {
        this.swarmCoordinator.addColony(colony.id, colony.config);
      }

      res.json({
        success: true,
        colonies: colonies.length,
        message: 'Swarm coordination initialized'
      });

    } catch (error) {
      console.error('Swarm initialization error:', error);
      res.status(500).json({
        error: 'Swarm initialization failed',
        details: error.message
      });
    }
  }

  /**
   * Get optimization analytics
   */
  async getAnalytics(req, res) {
    try {
      const { sessionId, type } = req.query;
      
      let analytics;
      
      if (sessionId) {
        // Session-specific analytics
        const report = this.analytics.generateReport(sessionId, type || 'comprehensive');
        analytics = { sessionId, ...report };
      } else {
        // Global analytics
        analytics = {
          learningPaths: this.learningOptimizer.getAnalytics(),
          resourceAllocation: this.resourceAllocator.getAnalytics(),
          replanning: this.dynamicReplanner.getAnalytics(),
          swarm: this.swarmCoordinator.getAnalytics(),
          activeSessions: this.activeSessions.size,
          totalVisualizations: this.analytics.visualizations.size
        };
      }

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      console.error('Analytics retrieval error:', error);
      res.status(500).json({
        error: 'Analytics retrieval failed',
        details: error.message
      });
    }
  }

  /**
   * Get visualization data
   */
  async getVisualization(req, res) {
    try {
      const { vizId } = req.params;
      
      if (!vizId) {
        return res.status(400).json({
          error: 'Missing visualization ID'
        });
      }

      const visualization = this.analytics.getVisualization(vizId);
      
      if (!visualization) {
        return res.status(404).json({
          error: 'Visualization not found'
        });
      }

      res.json({
        success: true,
        visualization
      });

    } catch (error) {
      console.error('Visualization retrieval error:', error);
      res.status(500).json({
        error: 'Visualization retrieval failed',
        details: error.message
      });
    }
  }

  /**
   * Get all visualizations
   */
  async getAllVisualizations(req, res) {
    try {
      const visualizations = this.analytics.getAllVisualizations();
      
      res.json({
        success: true,
        visualizations
      });

    } catch (error) {
      console.error('Visualizations retrieval error:', error);
      res.status(500).json({
        error: 'Visualizations retrieval failed',
        details: error.message
      });
    }
  }

  /**
   * Get real-time optimization data
   */
  async getRealTimeData(req, res) {
    try {
      const realTimeData = this.analytics.getRealTimeData();
      
      res.json({
        success: true,
        data: realTimeData
      });

    } catch (error) {
      console.error('Real-time data retrieval error:', error);
      res.status(500).json({
        error: 'Real-time data retrieval failed',
        details: error.message
      });
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          error: 'Missing session ID'
        });
      }

      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        session
      });

    } catch (error) {
      console.error('Session status retrieval error:', error);
      res.status(500).json({
        error: 'Session status retrieval failed',
        details: error.message
      });
    }
  }

  /**
   * Export optimization data
   */
  async exportData(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      const data = this.analytics.exportData(format);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="optimization-data.json"');
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="optimization-data.csv"');
      }
      
      res.send(data);

    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({
        error: 'Data export failed',
        details: error.message
      });
    }
  }

  /**
   * Health check for optimization services
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          learningOptimizer: 'active',
          resourceAllocator: 'active',
          dynamicReplanner: 'active',
          swarmCoordinator: 'active',
          analytics: 'active'
        },
        metrics: {
          activeSessions: this.activeSessions.size,
          totalVisualizations: this.analytics.visualizations.size,
          uptime: process.uptime()
        }
      };

      res.json({
        success: true,
        health
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        error: 'Health check failed',
        details: error.message
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.dynamicReplanner.destroy();
    this.swarmCoordinator.destroy();
    this.analytics.destroy();
    this.activeSessions.clear();
  }
}

module.exports = OptimizationController;
