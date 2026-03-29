/**
 * Graph class for Ant Colony Optimization
 * Represents the problem space with nodes, edges, pheromones, and heuristics
 */
class Graph {
  constructor() {
    this.nodes = [];
    this.edges = new Map();
    this.pheromones = new Map();
    this.distances = new Map();
    this.heuristics = new Map();
    this.initialPheromone = 1.0;
  }

  /**
   * Add a node to the graph
   */
  addNode(node) {
    if (!this.nodes.includes(node)) {
      this.nodes.push(node);
    }
  }

  /**
   * Add multiple nodes to the graph
   */
  addNodes(nodes) {
    nodes.forEach(node => this.addNode(node));
  }

  /**
   * Add an edge between two nodes with distance
   */
  addEdge(from, to, distance) {
    // Create edge key
    const edgeKey = this.createEdgeKey(from, to);
    
    // Store edge
    if (!this.edges.has(edgeKey)) {
      this.edges.set(edgeKey, { from, to, distance });
    }

    // Store distance
    this.distances.set(edgeKey, distance);
    
    // Initialize pheromone
    if (!this.pheromones.has(edgeKey)) {
      this.pheromones.set(edgeKey, this.initialPheromone);
    }

    // Calculate heuristic (inverse of distance)
    const heuristic = distance > 0 ? 1 / distance : 1;
    this.heuristics.set(edgeKey, heuristic);

    // Add nodes if they don't exist
    this.addNode(from);
    this.addNode(to);
  }

  /**
   * Create a unique key for an edge
   */
  createEdgeKey(from, to) {
    return `${from}-${to}`;
  }

  /**
   * Check if an edge exists
   */
  hasEdge(from, to) {
    const edgeKey = this.createEdgeKey(from, to);
    return this.edges.has(edgeKey);
  }

  /**
   * Get all nodes in the graph
   */
  getNodes() {
    return [...this.nodes];
  }

  /**
   * Get distance between two nodes
   */
  getDistance(from, to) {
    const edgeKey = this.createEdgeKey(from, to);
    return this.distances.get(edgeKey) || Infinity;
  }

  /**
   * Get pheromone level on edge
   */
  getPheromone(from, to) {
    const edgeKey = this.createEdgeKey(from, to);
    return this.pheromones.get(edgeKey) || 0.001; // Minimum pheromone to avoid zero
  }

  /**
   * Get heuristic value for edge
   */
  getHeuristic(from, to) {
    const edgeKey = this.createEdgeKey(from, to);
    return this.heuristics.get(edgeKey) || 0.001; // Minimum heuristic to avoid zero
  }

  /**
   * Deposit pheromone on edge
   */
  depositPheromone(from, to, amount) {
    const edgeKey = this.createEdgeKey(from, to);
    const currentPheromone = this.pheromones.get(edgeKey) || 0;
    this.pheromones.set(edgeKey, currentPheromone + amount);
  }

  /**
   * Evaporate pheromones on all edges
   */
  evaporatePheromones(evaporationRate = 0.5) {
    for (const [edgeKey, pheromone] of this.pheromones) {
      const newPheromone = pheromone * (1 - evaporationRate);
      this.pheromones.set(edgeKey, Math.max(newPheromone, 0.001)); // Minimum pheromone
    }
  }

  /**
   * Reset all pheromones to initial value
   */
  resetPheromones() {
    for (const edgeKey of this.pheromones.keys()) {
      this.pheromones.set(edgeKey, this.initialPheromone);
    }
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(node) {
    const neighbors = [];
    
    for (const edgeKey of this.edges.keys()) {
      const edge = this.edges.get(edgeKey);
      if (edge.from === node) {
        neighbors.push(edge.to);
      }
    }
    
    return neighbors;
  }

  /**
   * Get graph statistics
   */
  getStats() {
    const totalPheromone = Array.from(this.pheromones.values())
      .reduce((sum, pheromone) => sum + pheromone, 0);
    
    const avgPheromone = this.pheromones.size > 0 ? totalPheromone / this.pheromones.size : 0;
    
    return {
      nodeCount: this.nodes.length,
      edgeCount: this.edges.size,
      totalPheromone,
      averagePheromone: avgPheromone
    };
  }

  /**
   * Create a complete graph from distance matrix
   */
  static fromDistanceMatrix(nodes, distanceMatrix) {
    const graph = new Graph();
    graph.addNodes(nodes);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i !== j) {
          const distance = distanceMatrix[i][j];
          if (distance > 0) {
            graph.addEdge(nodes[i], nodes[j], distance);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Create a random graph
   */
  static random(nodeCount, maxDistance = 100, connectivity = 0.3) {
    const graph = new Graph();
    const nodes = Array.from({ length: nodeCount }, (_, i) => i.toString());
    graph.addNodes(nodes);

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < connectivity) {
          const distance = Math.random() * maxDistance + 1;
          graph.addEdge(nodes[i], nodes[j], distance);
          graph.addEdge(nodes[j], nodes[i], distance); // Make it undirected
        }
      }
    }

    return graph;
  }
}

module.exports = Graph;
