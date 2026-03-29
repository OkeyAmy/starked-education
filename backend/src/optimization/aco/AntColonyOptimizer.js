const Ant = require('./Ant');
const Graph = require('./Graph');

/**
 * Main Ant Colony Optimization algorithm implementation
 * Solves combinatorial optimization problems using swarm intelligence
 */
class AntColonyOptimizer {
  constructor(options = {}) {
    this.graph = options.graph || new Graph();
    this.antCount = options.antCount || 10;
    this.maxIterations = options.maxIterations || 100;
    this.alpha = options.alpha || 1.0; // Pheromone importance
    this.beta = options.beta || 2.0;   // Heuristic importance
    this.rho = options.rho || 0.5;     // Evaporation rate
    this.q = options.q || 100;         // Pheromone deposit factor
    this.elitist = options.elitist || false; // Elitist ACO variant
    this.rankBased = options.rankBased || false; // Rank-based ACO variant
    
    this.ants = [];
    this.bestSolution = null;
    this.iterationBest = null;
    this.convergenceHistory = [];
    this.currentIteration = 0;
  }

  /**
   * Initialize the ant colony
   */
  initializeColony() {
    this.ants = [];
    for (let i = 0; i < this.antCount; i++) {
      this.ants.push(new Ant(i, this.graph, this.alpha, this.beta));
    }
  }

  /**
   * Run the complete ACO algorithm
   */
  async optimize(progressCallback = null) {
    this.initializeColony();
    this.bestSolution = null;
    this.convergenceHistory = [];
    this.currentIteration = 0;

    console.log(`Starting ACO optimization with ${this.antCount} ants for ${this.maxIterations} iterations`);

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      this.currentIteration = iteration;
      
      // Reset iteration best
      this.iterationBest = null;

      // Each ant constructs a solution
      for (const ant of this.ants) {
        ant.constructPath();
        const solution = ant.getSolution();
        
        // Update iteration best
        if (!this.iterationBest || solution.fitness > this.iterationBest.fitness) {
          this.iterationBest = solution;
        }

        // Update global best
        if (!this.bestSolution || solution.fitness > this.bestSolution.fitness) {
          this.bestSolution = solution;
        }
      }

      // Update pheromones
      this.updatePheromones();

      // Record convergence
      this.convergenceHistory.push({
        iteration,
        bestFitness: this.bestSolution.fitness,
        bestDistance: this.bestSolution.distance,
        iterationBestFitness: this.iterationBest.fitness,
        avgPheromone: this.graph.getStats().averagePheromone
      });

      // Progress callback
      if (progressCallback) {
        await progressCallback({
          iteration,
          bestSolution: this.bestSolution,
          convergence: this.convergenceHistory
        });
      }

      // Check for convergence
      if (this.hasConverged()) {
        console.log(`Converged at iteration ${iteration}`);
        break;
      }
    }

    console.log(`ACO optimization completed. Best distance: ${this.bestSolution.distance}`);
    return this.getResults();
  }

  /**
   * Update pheromone trails based on ant solutions
   */
  updatePheromones() {
    // Evaporation
    this.graph.evaporatePheromones(this.rho);

    if (this.elitist) {
      // Elitist ACO: best ant deposits extra pheromone
      this.bestAntDeposit();
    } else if (this.rankBased) {
      // Rank-based ACO: rank ants and deposit accordingly
      this.rankBasedDeposit();
    } else {
      // Standard ACO: all ants deposit pheromone
      this.standardDeposit();
    }
  }

  /**
   * Standard pheromone deposit (all ants)
   */
  standardDeposit() {
    for (const ant of this.ants) {
      ant.updatePheromones(this.q);
    }
  }

  /**
   * Elitist pheromone deposit (best ant gets extra deposit)
   */
  bestAntDeposit() {
    // Standard deposit
    this.standardDeposit();
    
    // Extra deposit from best ant
    if (this.bestSolution) {
      const depositAmount = (this.q * this.antCount) / this.bestSolution.distance;
      const path = this.bestSolution.path;
      
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        this.graph.depositPheromone(from, to, depositAmount);
      }
    }
  }

  /**
   * Rank-based pheromone deposit
   */
  rankBasedDeposit() {
    // Rank ants by fitness
    const rankedAnts = [...this.ants].sort((a, b) => b.fitness - a.fitness);
    
    // Deposit based on rank (best ant deposits most)
    for (let rank = 0; rank < rankedAnts.length; rank++) {
      const ant = rankedAnts[rank];
      const weight = this.antCount - rank; // Higher weight for better rank
      ant.updatePheromones(this.q * weight);
    }
  }

  /**
   * Check if algorithm has converged
   */
  hasConverged() {
    if (this.convergenceHistory.length < 10) return false;

    // Check if best solution hasn't improved in last 10 iterations
    const recentHistory = this.convergenceHistory.slice(-10);
    const recentBest = recentHistory.map(h => h.bestFitness);
    
    const variance = this.calculateVariance(recentBest);
    return variance < 1e-6; // Very small variance indicates convergence
  }

  /**
   * Calculate variance of an array
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get optimization results
   */
  getResults() {
    return {
      bestSolution: this.bestSolution,
      convergenceHistory: this.convergenceHistory,
      iterations: this.currentIteration + 1,
      graphStats: this.graph.getStats(),
      parameters: {
        antCount: this.antCount,
        maxIterations: this.maxIterations,
        alpha: this.alpha,
        beta: this.beta,
        rho: this.rho,
        q: this.q,
        elitist: this.elitist,
        rankBased: this.rankBased
      }
    };
  }

  /**
   * Reset optimizer for new run
   */
  reset() {
    this.graph.resetPheromones();
    this.bestSolution = null;
    this.iterationBest = null;
    this.convergenceHistory = [];
    this.currentIteration = 0;
  }

  /**
   * Set custom parameters
   */
  setParameters(params) {
    Object.assign(this, params);
    
    // Update ant parameters
    for (const ant of this.ants) {
      ant.alpha = this.alpha;
      ant.beta = this.beta;
    }
  }

  /**
   * Get current state for monitoring
   */
  getState() {
    return {
      currentIteration: this.currentIteration,
      bestSolution: this.bestSolution,
      iterationBest: this.iterationBest,
      convergenceHistory: this.convergenceHistory,
      graphStats: this.graph.getStats()
    };
  }
}

module.exports = AntColonyOptimizer;
