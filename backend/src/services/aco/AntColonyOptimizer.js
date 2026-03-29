/**
 * Ant Colony Optimization (ACO) Algorithm Implementation
 * for learning path optimization and resource allocation
 */

class AntColonyOptimizer {
  constructor(options = {}) {
    this.numAnts = options.numAnts || 10;
    this.numIterations = options.numIterations || 100;
    this.alpha = options.alpha || 1.0; // Pheromone importance
    this.beta = options.beta || 2.0; // Heuristic importance
    this.rho = options.rho || 0.1; // Evaporation rate
    this.q = options.q || 100; // Pheromone deposit factor
    this.tau0 = options.tau0 || 0.1; // Initial pheromone level
    
    this.pheromoneTrails = null;
    this.distances = null;
    this.bestPath = null;
    this.bestDistance = Infinity;
    this.iterationHistory = [];
  }

  /**
   * Initialize the ACO algorithm with distance matrix
   */
  initialize(distances) {
    this.distances = distances;
    const numNodes = distances.length;
    
    // Initialize pheromone trails
    this.pheromoneTrails = Array(numNodes).fill(null).map(() => 
      Array(numNodes).fill(this.tau0)
    );
    
    this.bestPath = null;
    this.bestDistance = Infinity;
    this.iterationHistory = [];
  }

  /**
   * Calculate heuristic information (visibility)
   */
  calculateHeuristics() {
    const numNodes = this.distances.length;
    const heuristics = Array(numNodes).fill(null).map(() => Array(numNodes).fill(0));
    
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (i !== j && this.distances[i][j] > 0) {
          heuristics[i][j] = 1 / this.distances[i][j];
        }
      }
    }
    
    return heuristics;
  }

  /**
   * Calculate transition probabilities for ant movement
   */
  calculateProbabilities(currentNode, visited, heuristics) {
    const numNodes = this.distances.length;
    const probabilities = [];
    let denominator = 0;
    
    // Calculate denominator
    for (let j = 0; j < numNodes; j++) {
      if (!visited.has(j)) {
        const pheromone = Math.pow(this.pheromoneTrails[currentNode][j], this.alpha);
        const heuristic = Math.pow(heuristics[currentNode][j], this.beta);
        denominator += pheromone * heuristic;
      }
    }
    
    // Calculate probabilities
    for (let j = 0; j < numNodes; j++) {
      if (!visited.has(j)) {
        const pheromone = Math.pow(this.pheromoneTrails[currentNode][j], this.alpha);
        const heuristic = Math.pow(heuristics[currentNode][j], this.beta);
        probabilities.push({
          node: j,
          probability: (pheromone * heuristic) / denominator
        });
      }
    }
    
    return probabilities;
  }

  /**
   * Select next node using roulette wheel selection
   */
  selectNextNode(probabilities) {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const option of probabilities) {
      cumulativeProbability += option.probability;
      if (random <= cumulativeProbability) {
        return option.node;
      }
    }
    
    return probabilities[probabilities.length - 1].node;
  }

  /**
   * Construct path for a single ant
   */
  constructPath(startNode, heuristics) {
    const numNodes = this.distances.length;
    const visited = new Set([startNode]);
    const path = [startNode];
    let currentNode = startNode;
    
    while (visited.size < numNodes) {
      const probabilities = this.calculateProbabilities(currentNode, visited, heuristics);
      const nextNode = this.selectNextNode(probabilities);
      
      path.push(nextNode);
      visited.add(nextNode);
      currentNode = nextNode;
    }
    
    // Return to start node to complete the cycle
    path.push(startNode);
    
    return path;
  }

  /**
   * Calculate total distance of a path
   */
  calculatePathDistance(path) {
    let totalDistance = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += this.distances[path[i]][path[i + 1]];
    }
    
    return totalDistance;
  }

  /**
   * Update pheromone trails
   */
  updatePheromones(paths, distances) {
    const numNodes = this.distances.length;
    
    // Evaporation
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        this.pheromoneTrails[i][j] *= (1 - this.rho);
      }
    }
    
    // Deposit pheromones
    for (let k = 0; k < paths.length; k++) {
      const path = paths[k];
      const distance = distances[k];
      const deposit = this.q / distance;
      
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        this.pheromoneTrails[from][to] += deposit;
        this.pheromoneTrails[to][from] += deposit; // Symmetric
      }
    }
  }

  /**
   * Run the complete ACO optimization
   */
  optimize(distances, startNode = 0) {
    this.initialize(distances);
    const heuristics = this.calculateHeuristics();
    
    for (let iteration = 0; iteration < this.numIterations; iteration++) {
      const paths = [];
      const distances = [];
      
      // Each ant constructs a path
      for (let ant = 0; ant < this.numAnts; ant++) {
        const path = this.constructPath(startNode, heuristics);
        const distance = this.calculatePathDistance(path);
        
        paths.push(path);
        distances.push(distance);
        
        // Update best solution
        if (distance < this.bestDistance) {
          this.bestDistance = distance;
          this.bestPath = [...path];
        }
      }
      
      // Update pheromone trails
      this.updatePheromones(paths, distances);
      
      // Record iteration history
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      this.iterationHistory.push({
        iteration: iteration + 1,
        bestDistance: this.bestDistance,
        avgDistance: avgDistance,
        bestPath: [...this.bestPath]
      });
      
      // Early stopping if convergence is achieved
      if (iteration > 10 && this.checkConvergence()) {
        break;
      }
    }
    
    return {
      bestPath: this.bestPath,
      bestDistance: this.bestDistance,
      iterationHistory: this.iterationHistory
    };
  }

  /**
   * Check for convergence
   */
  checkConvergence() {
    if (this.iterationHistory.length < 10) return false;
    
    const recent = this.iterationHistory.slice(-10);
    const improvements = recent.filter((record, index) => {
      if (index === 0) return false;
      return record.bestDistance < recent[index - 1].bestDistance;
    });
    
    return improvements.length < 2; // Less than 2 improvements in last 10 iterations
  }

  /**
   * Get current pheromone trail matrix
   */
  getPheromoneTrails() {
    return this.pheromoneTrails;
  }

  /**
   * Reset the optimizer
   */
  reset() {
    this.bestPath = null;
    this.bestDistance = Infinity;
    this.iterationHistory = [];
    if (this.distances) {
      this.initialize(this.distances);
    }
  }
}

module.exports = AntColonyOptimizer;
