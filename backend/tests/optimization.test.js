const request = require('supertest');
const app = require('../src/index');
const LearningPathOptimizer = require('../src/optimization/learning/LearningPathOptimizer');
const ResourceAllocator = require('../src/optimization/resources/ResourceAllocator');
const AntColonyOptimizer = require('../src/optimization/aco/AntColonyOptimizer');
const Graph = require('../src/optimization/aco/Graph');

describe('Optimization System Tests', () => {
  let learningOptimizer;
  let resourceAllocator;

  beforeAll(async () => {
    learningOptimizer = new LearningPathOptimizer();
    resourceAllocator = new ResourceAllocator();
  });

  afterAll(async () => {
    learningOptimizer = null;
    resourceAllocator = null;
  });

  describe('Ant Colony Optimization Core', () => {
    test('Graph should create nodes and edges correctly', () => {
      const graph = new Graph();
      
      graph.addNode('A');
      graph.addNode('B');
      graph.addEdge('A', 'B', 10);
      
      expect(graph.getNodes()).toContain('A');
      expect(graph.getNodes()).toContain('B');
      expect(graph.getDistance('A', 'B')).toBe(10);
      expect(graph.hasEdge('A', 'B')).toBe(true);
    });

    test('Ant should construct valid path', () => {
      const graph = new Graph();
      graph.addNodes(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B', 10);
      graph.addEdge('B', 'C', 15);
      graph.addEdge('C', 'D', 20);
      graph.addEdge('A', 'C', 25);
      graph.addEdge('B', 'D', 30);

      const optimizer = new AntColonyOptimizer({ graph });
      optimizer.initializeColony();
      
      const ant = optimizer.ants[0];
      ant.constructPath('A');
      
      expect(ant.path.length).toBeGreaterThan(0);
      expect(ant.path[0]).toBe('A');
      expect(ant.totalDistance).toBeGreaterThan(0);
    });

    test('ACO should optimize and find better solutions', async () => {
      const graph = Graph.random(5, 100, 0.5);
      const optimizer = new AntColonyOptimizer({
        graph,
        antCount: 5,
        maxIterations: 10
      });

      const results = await optimizer.optimize();
      
      expect(results).toHaveProperty('bestSolution');
      expect(results).toHaveProperty('convergenceHistory');
      expect(results.bestSolution).toHaveProperty('path');
      expect(results.bestSolution).toHaveProperty('fitness');
      expect(results.convergenceHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Learning Path Optimization', () => {
    test('Should add courses correctly', () => {
      const courseData = {
        title: 'Test Course',
        difficulty: 'beginner',
        duration: 60,
        topics: ['programming'],
        skills: ['coding'],
        rating: 4.5
      };

      learningOptimizer.addCourse('course1', courseData);
      
      expect(learningOptimizer.courses.has('course1')).toBe(true);
      const course = learningOptimizer.courses.get('course1');
      expect(course.title).toBe('Test Course');
      expect(course.difficulty).toBe('beginner');
    });

    test('Should set user profile', () => {
      const profile = {
        currentSkills: ['basic'],
        learningStyle: 'visual',
        timeAvailable: 30,
        difficulty: 'beginner'
      };

      learningOptimizer.setUserProfile(profile);
      
      expect(learningOptimizer.userProfile).toBeDefined();
      expect(learningOptimizer.userProfile.learningStyle).toBe('visual');
      expect(learningOptimizer.userProfile.timeAvailable).toBe(30);
    });

    test('Should optimize learning path', async () => {
      // Add test courses
      learningOptimizer.addCourse('course1', {
        title: 'Introduction to Programming',
        difficulty: 'beginner',
        duration: 30,
        topics: ['programming', 'basics'],
        skills: ['coding', 'problem-solving'],
        rating: 4.2
      });

      learningOptimizer.addCourse('course2', {
        title: 'Advanced Programming',
        difficulty: 'advanced',
        duration: 60,
        topics: ['programming', 'advanced'],
        skills: ['advanced-coding', 'architecture'],
        prerequisites: ['course1'],
        rating: 4.8
      });

      learningOptimizer.setUserProfile({
        currentSkills: ['basic'],
        learningStyle: 'visual',
        timeAvailable: 45,
        difficulty: 'intermediate'
      });

      const result = await learningOptimizer.optimizeLearningPath(['coding'], {
        antCount: 5,
        maxIterations: 10
      });

      expect(result).toHaveProperty('learningPath');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.learningPath)).toBe(true);
      expect(result.metadata.totalDuration).toBeGreaterThan(0);
    }, 30000);

    test('Should calculate relevance scores correctly', () => {
      learningOptimizer.addCourse('course3', {
        title: 'Data Structures',
        topics: ['data structures', 'algorithms'],
        skills: ['algorithms', 'data-structures'],
        rating: 4.6
      });

      const relevance = learningOptimizer.calculateRelevanceScore(
        learningOptimizer.courses.get('course3'),
        ['algorithms', 'programming']
      );

      expect(relevance).toBeGreaterThan(0);
      expect(typeof relevance).toBe('number');
    });
  });

  describe('Resource Allocation Optimization', () => {
    test('Should add resources correctly', () => {
      const resourceData = {
        type: 'compute',
        capacity: 100,
        cost: 50,
        availability: 0.9
      };

      resourceAllocator.addResource('resource1', resourceData);
      
      expect(resourceAllocator.resources.has('resource1')).toBe(true);
      const resource = resourceAllocator.resources.get('resource1');
      expect(resource.type).toBe('compute');
      expect(resource.capacity).toBe(100);
    });

    test('Should add demands correctly', () => {
      const demandData = {
        priority: 'high',
        requiredCapacity: 20,
        duration: 2,
        resourceType: 'compute'
      };

      resourceAllocator.addDemand('demand1', demandData);
      
      expect(resourceAllocator.demands.has('demand1')).toBe(true);
      const demand = resourceAllocator.demands.get('demand1');
      expect(demand.priority).toBe('high');
      expect(demand.requiredCapacity).toBe(20);
    });

    test('Should check resource-demand compatibility', () => {
      const resource = {
        type: 'compute',
        capacity: 100,
        currentLoad: 30,
        location: 'us-east'
      };

      const demand = {
        resourceType: 'compute',
        requiredCapacity: 20,
        location: 'us-east'
      };

      const compatible = resourceAllocator.isCompatible(resource, demand);
      expect(compatible).toBe(true);
    });

    test('Should optimize resource allocation', async () => {
      // Add test resources
      resourceAllocator.addResource('cpu1', {
        type: 'compute',
        capacity: 100,
        cost: 10,
        performance: 1.0
      });

      resourceAllocator.addResource('gpu1', {
        type: 'gpu',
        capacity: 50,
        cost: 50,
        performance: 2.0
      });

      // Add test demands
      resourceAllocator.addDemand('task1', {
        priority: 'high',
        requiredCapacity: 20,
        duration: 1,
        resourceType: 'compute',
        value: 10
      });

      resourceAllocator.addDemand('task2', {
        priority: 'medium',
        requiredCapacity: 30,
        duration: 2,
        resourceType: 'gpu',
        value: 15
      });

      const result = await resourceAllocator.optimizeAllocation({
        antCount: 5,
        maxIterations: 10
      });

      expect(result).toHaveProperty('allocationPlan');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('optimization');
      expect(Array.isArray(result.allocationPlan)).toBe(true);
      expect(result.metrics.totalAllocations).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('Should calculate allocation metrics correctly', () => {
      const allocationPlan = [
        {
          resourceId: 'cpu1',
          demandId: 'task1',
          allocatedCapacity: 20,
          cost: 10,
          efficiency: 0.8
        }
      ];

      const metrics = resourceAllocator.calculateAllocationMetrics(allocationPlan);

      expect(metrics).toHaveProperty('totalAllocations');
      expect(metrics).toHaveProperty('totalCost');
      expect(metrics).toHaveProperty('efficiencyScore');
      expect(metrics.totalAllocations).toBe(1);
      expect(metrics.totalCost).toBe(10);
    });
  });

  describe('API Endpoints', () => {
    test('GET /api/optimization/health should return health status', async () => {
      const response = await request(app)
        .get('/api/optimization/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('health');
      expect(response.body.health).toHaveProperty('status', 'healthy');
    });

    test('POST /api/optimization/initialize should initialize services', async () => {
      const response = await request(app)
        .post('/api/optimization/initialize')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('POST /api/optimization/learning-paths/optimize should validate input', async () => {
      const response = await request(app)
        .post('/api/optimization/learning-paths/optimize')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    test('POST /api/optimization/resources/optimize should validate input', async () => {
      const response = await request(app)
        .post('/api/optimization/resources/optimize')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    test('GET /api/optimization/analytics should return analytics data', async () => {
      const response = await request(app)
        .get('/api/optimization/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analytics');
    });

    test('GET /api/optimization/visualizations should return visualizations', async () => {
      const response = await request(app)
        .get('/api/optimization/visualizations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('visualizations');
      expect(Array.isArray(response.body.visualizations)).toBe(true);
    });

    test('GET /api/optimization/realtime should return real-time data', async () => {
      const response = await request(app)
        .get('/api/optimization/realtime')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid visualization ID', async () => {
      const response = await request(app)
        .get('/api/optimization/visualizations/invalid-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('Should handle invalid session ID', async () => {
      const response = await request(app)
        .get('/api/optimization/sessions/invalid-session')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Performance Tests', () => {
    test('Should handle medium-sized optimization within time limit', async () => {
      const graph = Graph.random(10, 100, 0.4);
      const optimizer = new AntColonyOptimizer({
        graph,
        antCount: 10,
        maxIterations: 20
      });

      const startTime = Date.now();
      const results = await optimizer.optimize();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
      expect(results.bestSolution).toBeDefined();
    }, 15000);

    test('Should handle multiple concurrent optimizations', async () => {
      const optimizations = [];
      
      for (let i = 0; i < 3; i++) {
        const graph = Graph.random(5, 50, 0.5);
        const optimizer = new AntColonyOptimizer({
          graph,
          antCount: 5,
          maxIterations: 10
        });
        
        optimizations.push(optimizer.optimize());
      }

      const results = await Promise.all(optimizations);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('bestSolution');
        expect(result).toHaveProperty('convergenceHistory');
      });
    }, 30000);
  });
});
