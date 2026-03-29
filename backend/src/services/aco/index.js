/**
 * ACO Services Index
 * Central export point for all Ant Colony Optimization services
 */

const AntColonyOptimizer = require('./AntColonyOptimizer');
const LearningPathOptimizer = require('./LearningPathOptimizer');
const ResourceAllocationOptimizer = require('./ResourceAllocationOptimizer');
const DynamicPathReplanner = require('./DynamicPathReplanner');
const SwarmIntelligenceCoordinator = require('./SwarmIntelligenceCoordinator');
const OptimizationAnalytics = require('./OptimizationAnalytics');

module.exports = {
  AntColonyOptimizer,
  LearningPathOptimizer,
  ResourceAllocationOptimizer,
  DynamicPathReplanner,
  SwarmIntelligenceCoordinator,
  OptimizationAnalytics
};
