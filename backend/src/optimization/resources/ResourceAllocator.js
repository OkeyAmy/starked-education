const AntColonyOptimizer = require('../aco/AntColonyOptimizer');
const Graph = require('../aco/Graph');

/**
 * Resource Allocation Optimization System
 * Uses Ant Colony Optimization to optimize resource distribution and utilization
 */
class ResourceAllocator {
  constructor(options = {}) {
    this.resources = new Map();
    this.demands = new Map();
    this.constraints = new Map();
    this.allocationHistory = [];
    this.utilizationMetrics = new Map();
    
    // Optimization parameters
    this.maxUtilization = options.maxUtilization || 0.85;
    this.fairnessWeight = options.fairnessWeight || 0.3;
    this.efficiencyWeight = options.efficiencyWeight || 0.7;
    this.timeWindow = options.timeWindow || 24; // hours
  }

  /**
   * Add a resource to the system
   */
  addResource(resourceId, resourceData) {
    this.resources.set(resourceId, {
      id: resourceId,
      type: resourceData.type || 'compute',
      capacity: resourceData.capacity || 100,
      cost: resourceData.cost || 1,
      availability: resourceData.availability || 1.0,
      location: resourceData.location || 'global',
      performance: resourceData.performance || 1.0,
      currentLoad: 0,
      allocatedTo: new Set(),
      ...resourceData
    });

    // Initialize utilization metrics
    if (!this.utilizationMetrics.has(resourceId)) {
      this.utilizationMetrics.set(resourceId, {
        totalAllocations: 0,
        averageUtilization: 0,
        peakUtilization: 0,
        efficiencyScore: 0
      });
    }
  }

  /**
   * Add a demand/request to the system
   */
  addDemand(demandId, demandData) {
    this.demands.set(demandId, {
      id: demandId,
      priority: demandData.priority || 'medium',
      requiredCapacity: demandData.requiredCapacity || 10,
      duration: demandData.duration || 1, // hours
      deadline: demandData.deadline || null,
      flexibility: demandData.flexibility || 0.5, // 0 = rigid, 1 = very flexible
      location: demandData.location || 'any',
      resourceType: demandData.resourceType || 'any',
      cost: demandData.cost || 0,
      value: demandData.value || 1,
      dependencies: demandData.dependencies || [],
      allocated: false,
      allocatedTo: null,
      ...demandData
    });
  }

  /**
   * Add allocation constraints
   */
  addConstraint(constraintId, constraintData) {
    this.constraints.set(constraintId, {
      id: constraintId,
      type: constraintData.type || 'capacity',
      resources: constraintData.resources || [],
      demands: constraintData.demands || [],
      rule: constraintData.rule || null,
      weight: constraintData.weight || 1.0,
      ...constraintData
    });
  }

  /**
   * Build optimization graph for resource allocation
   */
  buildAllocationGraph() {
    const graph = new Graph();
    
    // Create nodes: resources and demands
    const nodes = [];
    
    // Add resource nodes
    for (const [resourceId, resource] of this.resources) {
      nodes.push(`resource_${resourceId}`);
    }
    
    // Add demand nodes
    for (const [demandId, demand] of this.demands) {
      if (!demand.allocated) {
        nodes.push(`demand_${demandId}`);
      }
    }
    
    graph.addNodes(nodes);

    // Create edges between compatible resources and demands
    for (const [resourceId, resource] of this.resources) {
      for (const [demandId, demand] of this.demands) {
        if (demand.allocated) continue;
        
        if (this.isCompatible(resource, demand)) {
          const cost = this.calculateAllocationCost(resource, demand);
          graph.addEdge(`resource_${resourceId}`, `demand_${demandId}`, cost);
        }
      }
    }

    return graph;
  }

  /**
   * Check if resource and demand are compatible
   */
  isCompatible(resource, demand) {
    // Type compatibility
    if (demand.resourceType !== 'any' && resource.type !== demand.resourceType) {
      return false;
    }

    // Capacity compatibility
    if (resource.capacity < demand.requiredCapacity) {
      return false;
    }

    // Location compatibility
    if (demand.location !== 'any' && resource.location !== demand.location && resource.location !== 'global') {
      return false;
    }

    // Availability check
    const availableCapacity = resource.capacity - resource.currentLoad;
    if (availableCapacity < demand.requiredCapacity) {
      return false;
    }

    // Deadline check
    if (demand.deadline && new Date() > new Date(demand.deadline)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate allocation cost between resource and demand
   */
  calculateAllocationCost(resource, demand) {
    let cost = 1;

    // Base cost
    cost *= resource.cost * demand.requiredCapacity;

    // Efficiency factor
    const utilization = (resource.currentLoad + demand.requiredCapacity) / resource.capacity;
    if (utilization > this.maxUtilization) {
      cost *= 10; // High penalty for over-utilization
    } else {
      cost *= (2 - utilization); // Bonus for efficient utilization
    }

    // Priority factor
    const priorityWeight = this.getPriorityWeight(demand.priority);
    cost *= (1 / priorityWeight);

    // Value factor
    cost *= (1 / (1 + demand.value * 0.5));

    // Location proximity factor
    if (demand.location !== 'any' && resource.location === demand.location) {
      cost *= 0.8; // Bonus for local allocation
    }

    // Performance factor
    cost *= (1 / resource.performance);

    return Math.max(cost, 0.1);
  }

  /**
   * Get priority weight
   */
  getPriorityWeight(priority) {
    const weights = {
      'critical': 3.0,
      'high': 2.0,
      'medium': 1.0,
      'low': 0.5
    };
    return weights[priority] || 1.0;
  }

  /**
   * Optimize resource allocation using ACO
   */
  async optimizeAllocation(options = {}) {
    const graph = this.buildAllocationGraph();
    
    const optimizer = new AntColonyOptimizer({
      antCount: options.antCount || 20,
      maxIterations: options.maxIterations || 100,
      alpha: options.alpha || 1.0,
      beta: options.beta || 2.0,
      rho: options.rho || 0.4,
      q: options.q || 100,
      elitist: options.elitist || true,
      graph
    });

    // Progress callback
    const progressCallback = (progress) => {
      if (options.onProgress) {
        options.onProgress(progress);
      }
    };

    const results = await optimizer.optimize(progressCallback);
    
    // Convert path to allocation plan
    const allocationPlan = this.convertPathToAllocation(results.bestSolution.path);
    
    // Apply allocation
    this.applyAllocation(allocationPlan);

    // Calculate metrics
    const metrics = this.calculateAllocationMetrics(allocationPlan);

    // Store allocation history
    this.allocationHistory.push({
      timestamp: new Date(),
      plan: allocationPlan,
      metrics,
      optimization: results
    });

    return {
      allocationPlan,
      metrics,
      optimization: results
    };
  }

  /**
   * Convert ACO path to allocation plan
   */
  convertPathToAllocation(path) {
    const allocations = [];
    
    for (let i = 0; i < path.length - 1; i += 2) {
      if (i + 1 < path.length) {
        const resourceNode = path[i];
        const demandNode = path[i + 1];
        
        if (resourceNode.startsWith('resource_') && demandNode.startsWith('demand_')) {
          const resourceId = resourceNode.replace('resource_', '');
          const demandId = demandNode.replace('demand_', '');
          
          const resource = this.resources.get(resourceId);
          const demand = this.demands.get(demandId);
          
          if (resource && demand) {
            allocations.push({
              resourceId,
              demandId,
              allocatedCapacity: demand.requiredCapacity,
              cost: this.calculateAllocationCost(resource, demand),
              efficiency: this.calculateEfficiency(resource, demand),
              startTime: new Date(),
              endTime: new Date(Date.now() + demand.duration * 60 * 60 * 1000)
            });
          }
        }
      }
    }

    return allocations;
  }

  /**
   * Apply allocation plan to resources and demands
   */
  applyAllocation(allocationPlan) {
    // Reset current allocations
    for (const resource of this.resources.values()) {
      resource.currentLoad = 0;
      resource.allocatedTo.clear();
    }

    for (const demand of this.demands.values()) {
      demand.allocated = false;
      demand.allocatedTo = null;
    }

    // Apply new allocations
    for (const allocation of allocationPlan) {
      const resource = this.resources.get(allocation.resourceId);
      const demand = this.demands.get(allocation.demandId);
      
      if (resource && demand) {
        resource.currentLoad += allocation.allocatedCapacity;
        resource.allocatedTo.add(allocation.demandId);
        
        demand.allocated = true;
        demand.allocatedTo = allocation.resourceId;
      }
    }
  }

  /**
   * Calculate efficiency of allocation
   */
  calculateEfficiency(resource, demand) {
    const utilization = (resource.currentLoad + demand.requiredCapacity) / resource.capacity;
    
    // Optimal utilization is around 70-80%
    const optimalUtilization = 0.75;
    const utilizationScore = 1 - Math.abs(utilization - optimalUtilization);
    
    // Performance factor
    const performanceScore = resource.performance;
    
    // Availability factor
    const availabilityScore = resource.availability;
    
    return (utilizationScore * 0.4 + performanceScore * 0.4 + availabilityScore * 0.2);
  }

  /**
   * Calculate allocation metrics
   */
  calculateAllocationMetrics(allocationPlan) {
    const metrics = {
      totalAllocations: allocationPlan.length,
      totalCost: 0,
      averageUtilization: 0,
      fairnessIndex: 0,
      efficiencyScore: 0,
      unmetDemand: 0,
      resourceUtilization: new Map()
    };

    // Total cost
    metrics.totalCost = allocationPlan.reduce((sum, alloc) => sum + alloc.cost, 0);

    // Resource utilization
    let totalUtilization = 0;
    let resourceCount = 0;
    
    for (const [resourceId, resource] of this.resources) {
      const utilization = resource.currentLoad / resource.capacity;
      metrics.resourceUtilization.set(resourceId, utilization);
      totalUtilization += utilization;
      resourceCount++;
      
      // Update resource metrics
      const resourceMetrics = this.utilizationMetrics.get(resourceId);
      if (resourceMetrics) {
        resourceMetrics.totalAllocations++;
        resourceMetrics.averageUtilization = 
          (resourceMetrics.averageUtilization * (resourceMetrics.totalAllocations - 1) + utilization) / 
          resourceMetrics.totalAllocations;
        resourceMetrics.peakUtilization = Math.max(resourceMetrics.peakUtilization, utilization);
      }
    }
    
    metrics.averageUtilization = resourceCount > 0 ? totalUtilization / resourceCount : 0;

    // Fairness index (Jain's fairness index)
    const utilizations = Array.from(metrics.resourceUtilization.values());
    if (utilizations.length > 0) {
      const sum = utilizations.reduce((a, b) => a + b, 0);
      const sumSquares = utilizations.reduce((a, b) => a + b * b, 0);
      metrics.fairnessIndex = (sum * sum) / (utilizations.length * sumSquares);
    }

    // Efficiency score
    const totalEfficiency = allocationPlan.reduce((sum, alloc) => sum + alloc.efficiency, 0);
    metrics.efficiencyScore = allocationPlan.length > 0 ? totalEfficiency / allocationPlan.length : 0;

    // Unmet demand
    for (const demand of this.demands.values()) {
      if (!demand.allocated) {
        metrics.unmetDemand++;
      }
    }

    return metrics;
  }

  /**
   * Re-optimize allocation with new demands or constraints
   */
  async reoptimizeAllocation(newDemands = [], newConstraints = [], options = {}) {
    // Add new demands
    for (const demand of newDemands) {
      this.addDemand(demand.id, demand);
    }

    // Add new constraints
    for (const constraint of newConstraints) {
      this.addConstraint(constraint.id, constraint);
    }

    // Re-optimize
    return await this.optimizeAllocation(options);
  }

  /**
   * Get real-time allocation status
   */
  getAllocationStatus() {
    const status = {
      totalResources: this.resources.size,
      totalDemands: this.demands.size,
      allocatedDemands: 0,
      unallocatedDemands: 0,
      averageUtilization: 0,
      resourceStatus: new Map()
    };

    // Count allocated/unallocated demands
    for (const demand of this.demands.values()) {
      if (demand.allocated) {
        status.allocatedDemands++;
      } else {
        status.unallocatedDemands++;
      }
    }

    // Calculate average utilization
    let totalUtilization = 0;
    for (const [resourceId, resource] of this.resources) {
      const utilization = resource.currentLoad / resource.capacity;
      totalUtilization += utilization;
      
      status.resourceStatus.set(resourceId, {
        capacity: resource.capacity,
        currentLoad: resource.currentLoad,
        utilization,
        allocatedTo: Array.from(resource.allocatedTo),
        available: resource.capacity - resource.currentLoad
      });
    }

    status.averageUtilization = this.resources.size > 0 ? totalUtilization / this.resources.size : 0;

    return status;
  }

  /**
   * Get allocation analytics
   */
  getAnalytics() {
    const analytics = {
      totalAllocations: this.allocationHistory.length,
      averageEfficiency: 0,
      averageFairness: 0,
      peakUtilization: 0,
      resourcePerformance: new Map(),
      demandPatterns: {},
      costOptimization: 0
    };

    if (this.allocationHistory.length === 0) return analytics;

    // Calculate averages
    const totalEfficiency = this.allocationHistory.reduce((sum, alloc) => sum + alloc.metrics.efficiencyScore, 0);
    const totalFairness = this.allocationHistory.reduce((sum, alloc) => sum + alloc.metrics.fairnessIndex, 0);
    
    analytics.averageEfficiency = totalEfficiency / this.allocationHistory.length;
    analytics.averageFairness = totalFairness / this.allocationHistory.length;

    // Peak utilization
    analytics.peakUtilization = Math.max(
      ...this.allocationHistory.map(alloc => alloc.metrics.averageUtilization)
    );

    // Resource performance
    for (const [resourceId, metrics] of this.utilizationMetrics) {
      analytics.resourcePerformance.set(resourceId, {
        ...metrics,
        efficiency: metrics.averageUtilization * metrics.efficiencyScore
      });
    }

    return analytics;
  }

  /**
   * Release allocated resources
   */
  releaseAllocations(allocationIds = null) {
    if (allocationIds) {
      // Release specific allocations
      for (const allocId of allocationIds) {
        // Find and release specific allocation
        for (const demand of this.demands.values()) {
          if (demand.allocatedTo && allocationIds.includes(demand.allocatedTo)) {
            const resource = this.resources.get(demand.allocatedTo);
            if (resource) {
              resource.currentLoad -= demand.requiredCapacity;
              resource.allocatedTo.delete(demand.id);
            }
            
            demand.allocated = false;
            demand.allocatedTo = null;
          }
        }
      }
    } else {
      // Release all allocations
      for (const resource of this.resources.values()) {
        resource.currentLoad = 0;
        resource.allocatedTo.clear();
      }

      for (const demand of this.demands.values()) {
        demand.allocated = false;
        demand.allocatedTo = null;
      }
    }
  }
}

module.exports = ResourceAllocator;
