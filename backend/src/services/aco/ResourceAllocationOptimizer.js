/**
 * Resource Allocation Optimization using Ant Colony Optimization
 * Optimizes allocation of educational resources (instructors, classrooms, equipment)
 */

const AntColonyOptimizer = require('./AntColonyOptimizer');

class ResourceAllocationOptimizer {
  constructor(options = {}) {
    this.aco = new AntColonyOptimizer({
      numAnts: options.numAnts || 20,
      numIterations: options.numIterations || 150,
      alpha: options.alpha || 1.2,
      beta: options.beta || 2.0,
      rho: options.rho || 0.1,
      q: options.q || 100
    });
    
    this.resources = new Map();
    this.demands = new Map();
    this.constraints = new Map();
    this.objectives = [];
  }

  /**
   * Set up resources and their properties
   */
  setupResources(resources) {
    this.resources = new Map();
    
    resources.forEach(resource => {
      this.resources.set(resource.id, {
        id: resource.id,
        type: resource.type, // instructor, classroom, equipment
        capacity: resource.capacity || 1,
        cost: resource.cost || 1,
        quality: resource.quality || 1,
        availability: resource.availability || new Map(), // time slots
        skills: resource.skills || [],
        location: resource.location || null,
        preferences: resource.preferences || new Map()
      });
    });
  }

  /**
   * Set up demands for resources
   */
  setupDemands(demands) {
    this.demands = new Map();
    
    demands.forEach(demand => {
      this.demands.set(demand.id, {
        id: demand.id,
        type: demand.type,
        requiredCapacity: demand.requiredCapacity || 1,
        timeSlot: demand.timeSlot,
        duration: demand.duration || 1,
        priority: demand.priority || 1,
        requiredSkills: demand.requiredSkills || [],
        preferredLocation: demand.preferredLocation || null,
        maxCost: demand.maxCost || Infinity,
        minQuality: demand.minQuality || 0
      });
    });
  }

  /**
   * Set up allocation constraints
   */
  setupConstraints(constraints) {
    this.constraints = new Map();
    
    constraints.forEach(constraint => {
      this.constraints.set(constraint.id, {
        id: constraint.id,
        type: constraint.type, // conflict, dependency, capacity
        resources: constraint.resources || [],
        demands: constraint.demands || [],
        condition: constraint.condition || null
      });
    });
  }

  /**
   * Set optimization objectives
   */
  setObjectives(objectives) {
    this.objectives = objectives;
  }

  /**
   * Build cost matrix for resource allocation
   */
  buildCostMatrix() {
    const resourceIds = Array.from(this.resources.keys());
    const demandIds = Array.from(this.demands.keys());
    
    const costMatrix = Array(resourceIds.length).fill(null).map(() => 
      Array(demandIds.length).fill(Infinity)
    );
    
    for (let i = 0; i < resourceIds.length; i++) {
      for (let j = 0; j < demandIds.length; j++) {
        const resource = this.resources.get(resourceIds[i]);
        const demand = this.demands.get(demandIds[j]);
        
        costMatrix[i][j] = this.calculateAllocationCost(resource, demand);
      }
    }
    
    return costMatrix;
  }

  /**
   * Calculate cost of allocating a resource to a demand
   */
  calculateAllocationCost(resource, demand) {
    let cost = 1.0;
    
    // Type compatibility
    if (resource.type !== demand.type) {
      return Infinity; // Incompatible types
    }
    
    // Capacity match
    if (resource.capacity < demand.requiredCapacity) {
      return Infinity; // Insufficient capacity
    }
    
    // Time availability
    if (!this.isResourceAvailable(resource, demand.timeSlot, demand.duration)) {
      return Infinity; // Resource not available
    }
    
    // Skills match
    const skillsMatch = this.calculateSkillsMatch(resource, demand);
    if (skillsMatch === 0) {
      return Infinity; // No required skills
    }
    cost *= (2 - skillsMatch); // Lower cost for better skills match
    
    // Quality requirement
    if (resource.quality < demand.minQuality) {
      return Infinity; // Insufficient quality
    }
    cost *= (2 - resource.quality); // Lower cost for higher quality
    
    // Cost constraint
    if (resource.cost > demand.maxCost) {
      return Infinity; // Too expensive
    }
    cost *= resource.cost;
    
    // Location preference
    if (demand.preferredLocation && resource.location) {
      const distance = this.calculateDistance(resource.location, demand.preferredLocation);
      cost *= (1 + distance * 0.1);
    }
    
    // Priority weighting
    cost /= demand.priority;
    
    // Resource preferences
    const preferenceScore = this.calculatePreferenceScore(resource, demand);
    cost *= (2 - preferenceScore);
    
    return cost;
  }

  /**
   * Check if resource is available for the given time slot
   */
  isResourceAvailable(resource, timeSlot, duration) {
    const availability = resource.availability;
    
    for (let t = timeSlot; t < timeSlot + duration; t++) {
      if (!availability.get(t)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate skills match score
   */
  calculateSkillsMatch(resource, demand) {
    const requiredSkills = demand.requiredSkills;
    const resourceSkills = resource.skills;
    
    if (requiredSkills.length === 0) return 1.0;
    
    const matchedSkills = requiredSkills.filter(skill => 
      resourceSkills.includes(skill)
    );
    
    return matchedSkills.length / requiredSkills.length;
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(location1, location2) {
    // Simple Euclidean distance for demonstration
    // In practice, this could use real地理 data or travel time
    const dx = location1.x - location2.x;
    const dy = location1.y - location2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate preference score for resource-demand pairing
   */
  calculatePreferenceScore(resource, demand) {
    const preferences = resource.preferences;
    let score = 1.0;
    
    // Check time preference
    const timePreference = preferences.get(demand.timeSlot) || 1.0;
    score *= timePreference;
    
    // Check demand type preference
    const typePreference = preferences.get(demand.type) || 1.0;
    score *= typePreference;
    
    return Math.min(1.0, Math.max(0.1, score));
  }

  /**
   * Validate allocation against constraints
   */
  validateAllocation(allocation) {
    // Check each constraint
    for (const constraint of this.constraints.values()) {
      if (!this.checkConstraint(constraint, allocation)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if allocation satisfies a specific constraint
   */
  checkConstraint(constraint, allocation) {
    switch (constraint.type) {
      case 'conflict':
        return this.checkConflictConstraint(constraint, allocation);
      case 'dependency':
        return this.checkDependencyConstraint(constraint, allocation);
      case 'capacity':
        return this.checkCapacityConstraint(constraint, allocation);
      default:
        return true;
    }
  }

  /**
   * Check conflict constraint (no overlapping allocations)
   */
  checkConflictConstraint(constraint, allocation) {
    const resourceIds = constraint.resources;
    
    for (const resourceId of resourceIds) {
      const allocations = allocation.filter(a => a.resourceId === resourceId);
      
      // Check for time overlaps
      for (let i = 0; i < allocations.length; i++) {
        for (let j = i + 1; j < allocations.length; j++) {
          const a1 = allocations[i];
          const a2 = allocations[j];
          
          if (this.timeSlotsOverlap(a1.timeSlot, a1.duration, a2.timeSlot, a2.duration)) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Check dependency constraint
   */
  checkDependencyConstraint(constraint, allocation) {
    const demandIds = constraint.demands;
    
    // Find allocations for these demands
    const allocations = demandIds.map(demandId => 
      allocation.find(a => a.demandId === demandId)
    ).filter(Boolean);
    
    if (allocations.length < 2) return true;
    
    // Sort by time slot
    allocations.sort((a, b) => a.timeSlot - b.timeSlot);
    
    // Check if dependency condition is met
    if (constraint.condition) {
      return constraint.condition(allocations);
    }
    
    return true;
  }

  /**
   * Check capacity constraint
   */
  checkCapacityConstraint(constraint, allocation) {
    const resourceIds = constraint.resources;
    
    for (const resourceId of resourceIds) {
      const resource = this.resources.get(resourceId);
      const allocations = allocation.filter(a => a.resourceId === resourceId);
      
      let totalCapacity = 0;
      for (const alloc of allocations) {
        const demand = this.demands.get(alloc.demandId);
        totalCapacity += demand.requiredCapacity;
      }
      
      if (totalCapacity > resource.capacity) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if two time slots overlap
   */
  timeSlotsOverlap(slot1, duration1, slot2, duration2) {
    const end1 = slot1 + duration1;
    const end2 = slot2 + duration2;
    
    return !(end1 <= slot2 || end2 <= slot1);
  }

  /**
   * Calculate overall allocation score
   */
  calculateAllocationScore(allocation) {
    if (!this.validateAllocation(allocation)) {
      return -Infinity;
    }
    
    let score = 0;
    
    for (const objective of this.objectives) {
      switch (objective.type) {
        case 'minimize_cost':
          score -= this.calculateTotalCost(allocation) * objective.weight;
          break;
        case 'maximize_utilization':
          score += this.calculateUtilization(allocation) * objective.weight;
          break;
        case 'maximize_satisfaction':
          score += this.calculateSatisfaction(allocation) * objective.weight;
          break;
        case 'minimize_travel':
          score -= this.calculateTotalTravel(allocation) * objective.weight;
          break;
      }
    }
    
    return score;
  }

  /**
   * Calculate total cost of allocation
   */
  calculateTotalCost(allocation) {
    return allocation.reduce((total, alloc) => {
      const resource = this.resources.get(alloc.resourceId);
      return total + resource.cost;
    }, 0);
  }

  /**
   * Calculate resource utilization
   */
  calculateUtilization(allocation) {
    const utilization = new Map();
    
    // Calculate utilization per resource
    for (const alloc of allocation) {
      const resource = this.resources.get(alloc.resourceId);
      const demand = this.demands.get(alloc.demandId);
      
      const currentUtil = utilization.get(alloc.resourceId) || 0;
      utilization.set(alloc.resourceId, currentUtil + demand.requiredCapacity);
    }
    
    // Calculate average utilization
    let totalUtilization = 0;
    let totalCapacity = 0;
    
    for (const [resourceId, util] of utilization) {
      const resource = this.resources.get(resourceId);
      totalUtilization += util;
      totalCapacity += resource.capacity;
    }
    
    return totalCapacity > 0 ? totalUtilization / totalCapacity : 0;
  }

  /**
   * Calculate satisfaction score
   */
  calculateSatisfaction(allocation) {
    let totalSatisfaction = 0;
    
    for (const alloc of allocation) {
      const resource = this.resources.get(alloc.resourceId);
      const demand = this.demands.get(alloc.demandId);
      
      // Skills satisfaction
      const skillsSatisfaction = this.calculateSkillsMatch(resource, demand);
      
      // Quality satisfaction
      const qualitySatisfaction = Math.min(1.0, resource.quality / demand.minQuality);
      
      // Cost satisfaction
      const costSatisfaction = Math.max(0, 1 - (resource.cost / demand.maxCost));
      
      totalSatisfaction += (skillsSatisfaction + qualitySatisfaction + costSatisfaction) / 3;
    }
    
    return allocation.length > 0 ? totalSatisfaction / allocation.length : 0;
  }

  /**
   * Calculate total travel distance
   */
  calculateTotalTravel(allocation) {
    let totalDistance = 0;
    
    for (const alloc of allocation) {
      const resource = this.resources.get(alloc.resourceId);
      const demand = this.demands.get(alloc.demandId);
      
      if (resource.location && demand.preferredLocation) {
        totalDistance += this.calculateDistance(resource.location, demand.preferredLocation);
      }
    }
    
    return totalDistance;
  }

  /**
   * Optimize resource allocation using ACO
   */
  optimizeAllocation() {
    const costMatrix = this.buildCostMatrix();
    
    // Run ACO optimization
    const result = this.aco.optimize(costMatrix);
    
    // Convert path indices to allocation
    const resourceIds = Array.from(this.resources.keys());
    const demandIds = Array.from(this.demands.keys());
    
    const allocation = result.bestPath.map((resourceIndex, demandIndex) => ({
      resourceId: resourceIds[resourceIndex],
      demandId: demandIds[demandIndex],
      cost: costMatrix[resourceIndex][demandIndex]
    })).filter(alloc => alloc.cost < Infinity);
    
    // Calculate final score
    const score = this.calculateAllocationScore(allocation);
    
    return {
      allocation,
      score,
      totalCost: this.calculateTotalCost(allocation),
      utilization: this.calculateUtilization(allocation),
      satisfaction: this.calculateSatisfaction(allocation),
      convergenceData: result.iterationHistory
    };
  }

  /**
   * Get allocation analytics
   */
  getAllocationAnalytics(allocation) {
    const resourceUsage = new Map();
    const demandFulfillment = new Map();
    
    // Calculate resource usage
    for (const alloc of allocation) {
      const resource = this.resources.get(alloc.resourceId);
      const demand = this.demands.get(alloc.demandId);
      
      resourceUsage.set(alloc.resourceId, (resourceUsage.get(alloc.resourceId) || 0) + demand.requiredCapacity);
      demandFulfillment.set(alloc.demandId, true);
    }
    
    return {
      totalResources: this.resources.size,
      totalDemands: this.demands.size,
      allocatedDemands: allocation.length,
      unallocatedDemands: this.demands.size - allocation.length,
      resourceUtilization: Object.fromEntries(resourceUsage),
      demandFulfillmentRate: allocation.length / this.demands.size,
      averageUtilization: this.calculateUtilization(allocation),
      totalSatisfaction: this.calculateSatisfaction(allocation)
    };
  }
}

module.exports = ResourceAllocationOptimizer;
