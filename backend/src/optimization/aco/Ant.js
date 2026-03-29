/**
 * Ant class for Ant Colony Optimization
 * Represents a single ant in the colony that constructs solutions through path traversal
 */
class Ant {
  constructor(id, graph, alpha = 1.0, beta = 2.0) {
    this.id = id;
    this.graph = graph;
    this.alpha = alpha; // Pheromone importance
    this.beta = beta;   // Heuristic importance
    this.path = [];
    this.visited = new Set();
    this.totalDistance = 0;
    this.fitness = 0;
  }

  /**
   * Reset ant for new iteration
   */
  reset() {
    this.path = [];
    this.visited.clear();
    this.totalDistance = 0;
    this.fitness = 0;
  }

  /**
   * Select next node based on pheromone and heuristic information
   */
  selectNextNode(currentNode, availableNodes) {
    if (availableNodes.length === 0) return null;
    if (availableNodes.length === 1) return availableNodes[0];

    const probabilities = [];
    let totalProbability = 0;

    // Calculate probabilities for each available node
    for (const node of availableNodes) {
      const pheromone = this.graph.getPheromone(currentNode, node);
      const heuristic = this.graph.getHeuristic(currentNode, node);
      
      const probability = Math.pow(pheromone, this.alpha) * Math.pow(heuristic, this.beta);
      probabilities.push(probability);
      totalProbability += probability;
    }

    // Normalize probabilities
    const normalizedProbs = probabilities.map(p => p / totalProbability);

    // Roulette wheel selection
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < availableNodes.length; i++) {
      cumulative += normalizedProbs[i];
      if (random <= cumulative) {
        return availableNodes[i];
      }
    }

    return availableNodes[availableNodes.length - 1];
  }

  /**
   * Construct a complete path through the graph
   */
  constructPath(startNode = null) {
    this.reset();
    
    const nodes = this.graph.getNodes();
    if (nodes.length === 0) return;

    // Start from specified node or random node
    const start = startNode || nodes[Math.floor(Math.random() * nodes.length)];
    this.path.push(start);
    this.visited.add(start);

    let currentNode = start;
    
    // Continue until all nodes are visited or no more moves possible
    while (this.visited.size < nodes.length) {
      const availableNodes = nodes.filter(node => 
        !this.visited.has(node) && this.graph.hasEdge(currentNode, node)
      );

      if (availableNodes.length === 0) break;

      const nextNode = this.selectNextNode(currentNode, availableNodes);
      if (!nextNode) break;

      const distance = this.graph.getDistance(currentNode, nextNode);
      this.totalDistance += distance;
      
      this.path.push(nextNode);
      this.visited.add(nextNode);
      currentNode = nextNode;
    }

    // Calculate fitness (inverse of total distance for minimization)
    this.fitness = this.totalDistance > 0 ? 1 / this.totalDistance : 0;
  }

  /**
   * Update pheromone trails based on ant's solution quality
   */
  updatePheromones(q = 100) {
    if (this.path.length < 2) return;

    const pheromoneDeposit = q / this.totalDistance;

    for (let i = 0; i < this.path.length - 1; i++) {
      const from = this.path[i];
      const to = this.path[i + 1];
      this.graph.depositPheromone(from, to, pheromoneDeposit);
    }
  }

  /**
   * Get ant's current solution
   */
  getSolution() {
    return {
      path: [...this.path],
      distance: this.totalDistance,
      fitness: this.fitness
    };
  }
}

module.exports = Ant;
