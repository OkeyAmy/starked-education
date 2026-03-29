/**
 * Comprehensive Test Suite for ACO System
 * Tests all components of the Ant Colony Optimization implementation
 */

const AntColonyOptimizer = require('../src/services/aco/AntColonyOptimizer');
const LearningPathOptimizer = require('../src/services/aco/LearningPathOptimizer');
const ResourceAllocationOptimizer = require('../src/services/aco/ResourceAllocationOptimizer');
const DynamicPathReplanner = require('../src/services/aco/DynamicPathReplanner');
const SwarmIntelligenceCoordinator = require('../src/services/aco/SwarmIntelligenceCoordinator');
const OptimizationAnalytics = require('../src/services/aco/OptimizationAnalytics');

describe('Ant Colony Optimization System', () => {
  
  describe('AntColonyOptimizer', () => {
    let optimizer;
    
    beforeEach(() => {
      optimizer = new AntColonyOptimizer({
        numAnts: 5,
        numIterations: 10,
        alpha: 1.0,
        beta: 2.0,
        rho: 0.1,
        q: 100
      });
    });
    
    test('should initialize with correct parameters', () => {
      expect(optimizer.numAnts).toBe(5);
      expect(optimizer.numIterations).toBe(10);
      expect(optimizer.alpha).toBe(1.0);
      expect(optimizer.beta).toBe(2.0);
      expect(optimizer.rho).toBe(0.1);
      expect(optimizer.q).toBe(100);
    });
    
    test('should initialize distance matrix correctly', () => {
      const distances = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0]
      ];
      
      optimizer.initialize(distances);
      
      expect(optimizer.distances).toEqual(distances);
      expect(optimizer.pheromoneTrails).toHaveLength(4);
      expect(optimizer.pheromoneTrails[0]).toHaveLength(4);
      expect(optimizer.pheromoneTrails[0][0]).toBe(0.1); // tau0
    });
    
    test('should calculate heuristics correctly', () => {
      const distances = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0]
      ];
      
      optimizer.initialize(distances);
      const heuristics = optimizer.calculateHeuristics();
      
      expect(heuristics[0][1]).toBe(1/10);
      expect(heuristics[0][2]).toBe(1/15);
      expect(heuristics[1][0]).toBe(1/10);
      expect(heuristics[0][0]).toBe(0); // Same node
    });
    
    test('should calculate transition probabilities correctly', () => {
      const distances = [
        [0, 10, 15],
        [10, 0, 20],
        [15, 20, 0]
      ];
      
      optimizer.initialize(distances);
      const heuristics = optimizer.calculateHeuristics();
      const visited = new Set([0]);
      const probabilities = optimizer.calculateProbabilities(0, visited, heuristics);
      
      expect(probabilities).toHaveLength(2);
      expect(probabilities.reduce((sum, p) => sum + p.probability, 0)).toBeCloseTo(1.0, 5);
    });
    
    test('should construct valid path', () => {
      const distances = [
        [0, 10, 15],
        [10, 0, 20],
        [15, 20, 0]
      ];
      
      optimizer.initialize(distances);
      const heuristics = optimizer.calculateHeuristics();
      const path = optimizer.constructPath(0, heuristics);
      
      expect(path).toHaveLength(4); // 3 nodes + return to start
      expect(path[0]).toBe(0); // Start node
      expect(path[path.length - 1]).toBe(0); // Return to start
      expect(new Set(path.slice(0, -1)).size).toBe(3); // All nodes visited
    });
    
    test('should calculate path distance correctly', () => {
      const path = [0, 1, 2, 0];
      const distances = [
        [0, 10, 15],
        [10, 0, 20],
        [15, 20, 0]
      ];
      
      optimizer.initialize(distances);
      const distance = optimizer.calculatePathDistance(path);
      
      expect(distance).toBe(10 + 20 + 15); // 0->1 + 1->2 + 2->0
    });
    
    test('should optimize and find best path', () => {
      const distances = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0]
      ];
      
      const result = optimizer.optimize(distances, 0);
      
      expect(result.bestPath).toBeDefined();
      expect(result.bestDistance).toBeGreaterThan(0);
      expect(result.iterationHistory).toHaveLength(optimizer.numIterations);
      expect(result.bestPath[0]).toBe(0);
      expect(result.bestPath[result.bestPath.length - 1]).toBe(0);
    });
    
    test('should reset optimizer correctly', () => {
      const distances = [[0, 10], [10, 0]];
      optimizer.optimize(distances, 0);
      
      optimizer.reset();
      
      expect(optimizer.bestPath).toBeNull();
      expect(optimizer.bestDistance).toBe(Infinity);
      expect(optimizer.iterationHistory).toHaveLength(0);
    });
  });
  
  describe('LearningPathOptimizer', () => {
    let optimizer;
    const mockCourses = [
      { id: 'course1', name: 'Intro to Programming', level: 'beginner', duration: 10, subject: 'computer_science' },
      { id: 'course2', name: 'Data Structures', level: 'intermediate', duration: 15, subject: 'computer_science' },
      { id: 'course3', name: 'Algorithms', level: 'advanced', duration: 20, subject: 'computer_science' },
      { id: 'course4', name: 'Web Development', level: 'intermediate', duration: 12, subject: 'computer_science' }
    ];
    
    const mockDependencies = {
      'course2': ['course1'],
      'course3': ['course2'],
      'course4': ['course1']
    };
    
    beforeEach(() => {
      optimizer = new LearningPathOptimizer();
      optimizer.setupLearningEnvironment(mockCourses, mockDependencies);
    });
    
    test('should setup learning environment correctly', () => {
      expect(optimizer.courses).toHaveLength(4);
      expect(optimizer.dependencies.size).toBe(3);
      expect(optimizer.dependencies.get('course2')).toEqual(['course1']);
    });
    
    test('should calculate difficulty weights correctly', () => {
      const weight1 = optimizer.difficultyWeights.get('course1');
      const weight2 = optimizer.difficultyWeights.get('course2');
      const weight3 = optimizer.difficultyWeights.get('course3');
      
      expect(weight1).toBeLessThan(weight2);
      expect(weight2).toBeLessThan(weight3);
    });
    
    test('should build distance matrix correctly', () => {
      const matrix = optimizer.buildDistanceMatrix(0, 2);
      
      expect(matrix).toHaveLength(4);
      expect(matrix[0]).toHaveLength(4);
      expect(matrix[0][0]).toBe(0); // Distance to self
      expect(matrix[0][2]).toBeLessThan(Infinity); // Valid distance
    });
    
    test('should validate paths correctly', () => {
      const validPath = [0, 1, 2]; // course1 -> course2 -> course3 (valid dependencies)
      const invalidPath = [0, 2, 1]; // course1 -> course3 -> course2 (invalid)
      
      expect(optimizer.validatePath(validPath)).toBe(true);
      expect(optimizer.validatePath(invalidPath)).toBe(false);
    });
    
    test('should optimize learning path', () => {
      const result = optimizer.optimizeLearningPath('course1', 'course3');
      
      expect(result.path).toContain('course1');
      expect(result.path).toContain('course3');
      expect(result.efficiency).toBeGreaterThan(0);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(optimizer.validatePath(result.path.map(id => 
        mockCourses.findIndex(c => c.id === id)
      ))).toBe(true);
    });
    
    test('should get alternative paths', () => {
      const alternatives = optimizer.getAlternativePaths('course1', 'course3', 2);
      
      expect(alternatives).toHaveLength(2);
      alternatives.forEach(alt => {
        expect(alt.path).toContain('course1');
        expect(alt.path).toContain('course3');
        expect(alt.efficiency).toBeGreaterThan(0);
      });
    });
    
    test('should provide path analytics', () => {
      const path = ['course1', 'course2', 'course3'];
      const analytics = optimizer.getPathAnalytics(path);
      
      expect(analytics.totalCourses).toBe(3);
      expect(analytics.estimatedDuration).toBe(45); // 10 + 15 + 20
      expect(analytics.averageDifficulty).toBeGreaterThan(0);
      expect(analytics.prerequisitesSatisfied).toBe(true);
    });
  });
  
  describe('ResourceAllocationOptimizer', () => {
    let optimizer;
    const mockResources = [
      { id: 'instructor1', type: 'instructor', capacity: 1, cost: 100, quality: 0.9, skills: ['programming', 'algorithms'] },
      { id: 'classroom1', type: 'classroom', capacity: 30, cost: 50, quality: 0.8 },
      { id: 'equipment1', type: 'equipment', capacity: 1, cost: 20, quality: 0.7 }
    ];
    
    const mockDemands = [
      { id: 'demand1', type: 'instructor', requiredCapacity: 1, priority: 1, requiredSkills: ['programming'] },
      { id: 'demand2', type: 'classroom', requiredCapacity: 25, priority: 1 },
      { id: 'demand3', type: 'equipment', requiredCapacity: 1, priority: 0.5 }
    ];
    
    beforeEach(() => {
      optimizer = new ResourceAllocationOptimizer();
      optimizer.setupResources(mockResources);
      optimizer.setupDemands(mockDemands);
      optimizer.setObjectives([
        { type: 'minimize_cost', weight: 0.3 },
        { type: 'maximize_utilization', weight: 0.4 },
        { type: 'maximize_satisfaction', weight: 0.3 }
      ]);
    });
    
    test('should setup resources correctly', () => {
      expect(optimizer.resources.size).toBe(3);
      const instructor = optimizer.resources.get('instructor1');
      expect(instructor.type).toBe('instructor');
      expect(instructor.capacity).toBe(1);
    });
    
    test('should setup demands correctly', () => {
      expect(optimizer.demands.size).toBe(3);
      const demand = optimizer.demands.get('demand1');
      expect(demand.type).toBe('instructor');
      expect(demand.requiredCapacity).toBe(1);
    });
    
    test('should calculate allocation cost correctly', () => {
      const resource = optimizer.resources.get('instructor1');
      const demand = optimizer.demands.get('demand1');
      
      const cost = optimizer.calculateAllocationCost(resource, demand);
      
      expect(cost).toBeLessThan(Infinity);
      expect(cost).toBeGreaterThan(0);
    });
    
    test('should check resource availability', () => {
      const resource = optimizer.resources.get('instructor1');
      resource.availability.set(9, true); // 9 AM available
      resource.availability.set(10, true); // 10 AM available
      
      expect(optimizer.isResourceAvailable(resource, 9, 1)).toBe(true);
      expect(optimizer.isResourceAvailable(resource, 9, 2)).toBe(true);
      expect(optimizer.isResourceAvailable(resource, 11, 1)).toBe(false);
    });
    
    test('should calculate skills match correctly', () => {
      const resource = optimizer.resources.get('instructor1');
      const demand1 = { requiredSkills: ['programming'] };
      const demand2 = { requiredSkills: ['programming', 'databases'] };
      const demand3 = { requiredSkills: ['databases'] };
      
      expect(optimizer.calculateSkillsMatch(resource, demand1)).toBe(1);
      expect(optimizer.calculateSkillsMatch(resource, demand2)).toBe(0.5);
      expect(optimizer.calculateSkillsMatch(resource, demand3)).toBe(0);
    });
    
    test('should optimize resource allocation', () => {
      const result = optimizer.optimizeAllocation();
      
      expect(result.allocation).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
      expect(result.utilization).toBeGreaterThanOrEqual(0);
      expect(result.satisfaction).toBeGreaterThanOrEqual(0);
    });
    
    test('should validate allocation against constraints', () => {
      const allocation = [
        { resourceId: 'instructor1', demandId: 'demand1' },
        { resourceId: 'classroom1', demandId: 'demand2' }
      ];
      
      expect(optimizer.validateAllocation(allocation)).toBe(true);
    });
  });
  
  describe('DynamicPathReplanner', () => {
    let replanner;
    const mockCourses = [
      { id: 'course1', name: 'Course 1', level: 'beginner', duration: 10 },
      { id: 'course2', name: 'Course 2', level: 'intermediate', duration: 15 },
      { id: 'course3', name: 'Course 3', level: 'advanced', duration: 20 }
    ];
    
    beforeEach(() => {
      replanner = new DynamicPathReplanner();
      replanner.learningOptimizer.setupLearningEnvironment(mockCourses, {});
    });
    
    test('should initialize path for user', () => {
      const path = replanner.initializePath('user1', 'course1', 'course3', { preferredSubjects: ['course1'] });
      
      expect(path.userId).toBe('user1');
      expect(path.path).toContain('course1');
      expect(path.path).toContain('course3');
      expect(path.currentStep).toBe(0);
      expect(path.completedSteps.size).toBe(0);
    });
    
    test('should record change events', () => {
      const event = {
        type: 'course_change',
        data: { courseId: 'course1', changeType: 'updated' }
      };
      
      const eventId = replanner.recordChangeEvent(event);
      
      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^event_/);
      expect(replanner.changeEvents).toHaveLength(1);
    });
    
    test('should handle progress updates', () => {
      replanner.initializePath('user1', 'course1', 'course3');
      
      const event = {
        type: 'progress_update',
        data: { userId: 'user1', courseId: 'course1', completed: true }
      };
      
      replanner.recordChangeEvent(event);
      
      const path = replanner.getCurrentPath('user1');
      expect(path.completedSteps.has('course1')).toBe(true);
      expect(path.currentStep).toBe(1);
    });
    
    test('should get path analytics', () => {
      replanner.initializePath('user1', 'course1', 'course3');
      
      const analytics = replanner.getPathAnalytics('user1');
      
      expect(analytics).toBeDefined();
      expect(analytics.currentStep).toBe(0);
      expect(analytics.totalSteps).toBeGreaterThan(0);
      expect(analytics.progressPercentage).toBe(0);
    });
    
    test('should calculate system statistics', () => {
      replanner.initializePath('user1', 'course1', 'course3');
      replanner.initializePath('user2', 'course1', 'course2');
      
      const stats = replanner.getSystemStatistics();
      
      expect(stats.totalActiveUsers).toBe(2);
      expect(stats.averageProgress).toBe(0);
      expect(stats.systemStability).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('SwarmIntelligenceCoordinator', () => {
    let coordinator;
    
    beforeEach(() => {
      coordinator = new SwarmIntelligenceCoordinator({
        populationSize: 5,
        communicationRadius: 0.3
      });
    });
    
    test('should initialize with correct config', () => {
      expect(coordinator.config.populationSize).toBe(5);
      expect(coordinator.config.communicationRadius).toBe(0.3);
    });
    
    test('should add agents correctly', () => {
      const mockAgent = {
        optimize: jest.fn().mockResolvedValue({ fitness: 0.8 }),
        getParameters: jest.fn().mockReturnValue({ param1: 1.0 }),
        setParameters: jest.fn()
      };
      
      const agentInfo = coordinator.addAgent('agent1', mockAgent, 'learning_path');
      
      expect(coordinator.agents.size).toBe(1);
      expect(agentInfo.id).toBe('agent1');
      expect(agentInfo.specialization).toBe('learning_path');
    });
    
    test('should remove agents correctly', () => {
      const mockAgent = { optimize: jest.fn() };
      coordinator.addAgent('agent1', mockAgent);
      
      const removed = coordinator.removeAgent('agent1');
      
      expect(removed).toBe(true);
      expect(coordinator.agents.size).toBe(0);
    });
    
    test('should calculate agent distance correctly', () => {
      const mockAgent1 = { optimize: jest.fn() };
      const mockAgent2 = { optimize: jest.fn() };
      
      coordinator.addAgent('agent1', mockAgent1, 'learning_path');
      coordinator.addAgent('agent2', mockAgent2, 'resource_allocation');
      
      const distance = coordinator.calculateAgentDistance('agent1', 'agent2');
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(1);
    });
    
    test('should update agent connections', () => {
      const mockAgent1 = { optimize: jest.fn() };
      const mockAgent2 = { optimize: jest.fn() };
      
      coordinator.addAgent('agent1', mockAgent1);
      coordinator.addAgent('agent2', mockAgent2);
      
      coordinator.updateAgentConnections('agent1');
      
      const agent1 = coordinator.agents.get('agent1');
      expect(agent1.neighbors.has('agent2')).toBe(true);
    });
    
    test('should calculate swarm diversity', () => {
      const mockAgent1 = { optimize: jest.fn() };
      const mockAgent2 = { optimize: jest.fn() };
      
      coordinator.addAgent('agent1', mockAgent1);
      coordinator.addAgent('agent2', mockAgent2);
      
      const diversity = coordinator.calculateDiversity();
      
      expect(diversity).toBeGreaterThanOrEqual(0);
      expect(diversity).toBeLessThanOrEqual(1);
    });
    
    test('should get swarm statistics', () => {
      const mockAgent = { optimize: jest.fn() };
      coordinator.addAgent('agent1', mockAgent, 'learning_path');
      coordinator.addAgent('agent2', mockAgent, 'resource_allocation');
      
      const stats = coordinator.getSwarmStatistics();
      
      expect(stats.totalAgents).toBe(2);
      expect(stats.iteration).toBe(0);
      expect(stats.specializations['learning_path']).toBe(1);
      expect(stats.specializations['resource_allocation']).toBe(1);
    });
  });
  
  describe('OptimizationAnalytics', () => {
    let analytics;
    
    beforeEach(() => {
      analytics = new OptimizationAnalytics();
    });
    
    test('should record metrics correctly', () => {
      const metrics = {
        efficiency: 0.8,
        utilization: 0.7,
        satisfaction: 0.9,
        iterations: 50
      };
      
      const metricId = analytics.recordMetrics('opt1', metrics);
      
      expect(metricId).toMatch(/^metric_/);
      expect(analytics.metrics.size).toBe(1);
      expect(analytics.performanceHistory).toHaveLength(1);
    });
    
    test('should update real-time metrics', () => {
      const metrics = {
        efficiency: 0.8,
        utilization: 0.7,
        satisfaction: 0.9
      };
      
      analytics.recordMetrics('opt1', metrics);
      
      const realTime = analytics.realTimeMetrics.get('opt1');
      expect(realTime.currentEfficiency).toBe(0.8);
      expect(realTime.resourceUtilization).toBe(0.7);
      expect(realTime.userSatisfaction).toBe(0.9);
      expect(realTime.totalOptimizations).toBe(1);
    });
    
    test('should calculate convergence rate', () => {
      // Add multiple metrics
      for (let i = 0; i < 15; i++) {
        analytics.recordMetrics('opt1', {
          efficiency: 0.5 + (i * 0.02), // Increasing efficiency
          utilization: 0.7,
          satisfaction: 0.8
        });
      }
      
      const rate = analytics.calculateConvergenceRate('opt1');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
    
    test('should generate performance visualization', () => {
      // Add test data
      for (let i = 0; i < 10; i++) {
        analytics.recordMetrics('opt1', {
          efficiency: 0.5 + Math.random() * 0.3,
          utilization: 0.6 + Math.random() * 0.2,
          satisfaction: 0.7 + Math.random() * 0.2,
          iterations: i * 10
        });
      }
      
      const viz = analytics.getPerformanceVisualization('opt1');
      
      expect(viz.timeline).toHaveLength(10);
      expect(viz.trends).toBeDefined();
      expect(viz.summary).toBeDefined();
      expect(viz.realTime).toBeDefined();
    });
    
    test('should generate comparative analysis', () => {
      // Add data for multiple optimizations
      analytics.recordMetrics('opt1', { efficiency: 0.8, utilization: 0.7, satisfaction: 0.9 });
      analytics.recordMetrics('opt2', { efficiency: 0.6, utilization: 0.8, satisfaction: 0.7 });
      analytics.recordMetrics('opt1', { efficiency: 0.85, utilization: 0.75, satisfaction: 0.95 });
      analytics.recordMetrics('opt2', { efficiency: 0.65, utilization: 0.85, satisfaction: 0.75 });
      
      const comparison = analytics.generateComparativeAnalysis(['opt1', 'opt2']);
      
      expect(comparison.analysisId).toMatch(/^analysis_/);
      expect(comparison.optimizations).toBeDefined();
      expect(comparison.rankings).toBeDefined();
      expect(comparison.insights).toBeDefined();
    });
    
    test('should export data in different formats', () => {
      analytics.recordMetrics('opt1', { efficiency: 0.8, utilization: 0.7 });
      
      const jsonData = analytics.exportData('json');
      const csvData = analytics.exportData('csv');
      
      expect(jsonData).toContain('"efficiency"');
      expect(csvData).toContain('efficiency');
    });
    
    test('should get dashboard data', () => {
      analytics.recordMetrics('opt1', { efficiency: 0.8, utilization: 0.7, satisfaction: 0.9 });
      
      const dashboard = analytics.getDashboardData();
      
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.realTimeMetrics).toBeDefined();
      expect(dashboard.performanceTrends).toBeDefined();
      expect(dashboard.topOptimizations).toBeDefined();
    });
  });
  
  describe('Integration Tests', () => {
    test('should integrate learning path optimization with analytics', () => {
      const learningOptimizer = new LearningPathOptimizer();
      const analytics = new OptimizationAnalytics();
      
      const courses = [
        { id: 'course1', level: 'beginner', duration: 10 },
        { id: 'course2', level: 'intermediate', duration: 15 }
      ];
      
      learningOptimizer.setupLearningEnvironment(courses, {});
      const result = learningOptimizer.optimizeLearningPath('course1', 'course2');
      
      const metricId = analytics.recordMetrics('integration_test', {
        type: 'learning_path',
        efficiency: result.efficiency,
        totalDistance: result.totalDistance,
        iterations: result.iterations
      });
      
      expect(metricId).toBeDefined();
      expect(result.efficiency).toBeGreaterThan(0);
      expect(analytics.metrics.size).toBe(1);
    });
    
    test('should handle end-to-end resource allocation workflow', () => {
      const resourceOptimizer = new ResourceAllocationOptimizer();
      const analytics = new OptimizationAnalytics();
      
      const resources = [
        { id: 'res1', type: 'instructor', capacity: 1, cost: 100, quality: 0.9 }
      ];
      const demands = [
        { id: 'demand1', type: 'instructor', requiredCapacity: 1, priority: 1 }
      ];
      
      resourceOptimizer.setupResources(resources);
      resourceOptimizer.setupDemands(demands);
      
      const result = resourceOptimizer.optimizeAllocation();
      
      analytics.recordMetrics('resource_integration', {
        type: 'resource_allocation',
        utilization: result.utilization,
        satisfaction: result.satisfaction,
        cost: result.totalCost
      });
      
      expect(result.allocation).toBeDefined();
      expect(result.utilization).toBeGreaterThanOrEqual(0);
      expect(analytics.metrics.size).toBe(1);
    });
  });
});
