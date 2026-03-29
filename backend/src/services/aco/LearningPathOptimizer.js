/**
 * Learning Path Optimization Engine using Ant Colony Optimization
 * Optimizes learning journeys based on course dependencies, difficulty, and user preferences
 */

const AntColonyOptimizer = require('./AntColonyOptimizer');

class LearningPathOptimizer {
  constructor(options = {}) {
    this.aco = new AntColonyOptimizer({
      numAnts: options.numAnts || 15,
      numIterations: options.numIterations || 200,
      alpha: options.alpha || 1.5,
      beta: options.beta || 2.5,
      rho: options.rho || 0.15,
      q: options.q || 100
    });
    
    this.courses = [];
    this.dependencies = new Map();
    this.difficultyWeights = new Map();
    this.userPreferences = new Map();
  }

  /**
   * Set up the learning environment with courses and dependencies
   */
  setupLearningEnvironment(courses, dependencies = {}) {
    this.courses = courses;
    this.dependencies = new Map();
    
    // Build dependency graph
    Object.entries(dependencies).forEach(([courseId, prereqs]) => {
      this.dependencies.set(courseId, prereqs);
    });
    
    // Calculate difficulty weights based on course metadata
    this.calculateDifficultyWeights();
  }

  /**
   * Calculate difficulty weights for courses
   */
  calculateDifficultyWeights() {
    this.courses.forEach(course => {
      let difficulty = 1.0;
      
      // Base difficulty from course level
      if (course.level === 'beginner') difficulty *= 1.0;
      else if (course.level === 'intermediate') difficulty *= 1.5;
      else if (course.level === 'advanced') difficulty *= 2.0;
      
      // Adjust based on duration
      difficulty *= (course.duration || 10) / 10;
      
      // Adjust based on prerequisites count
      const prereqs = this.dependencies.get(course.id) || [];
      difficulty *= (1 + prereqs.length * 0.2);
      
      this.difficultyWeights.set(course.id, difficulty);
    });
  }

  /**
   * Set user preferences for optimization
   */
  setUserPreferences(preferences) {
    this.userPreferences = new Map(Object.entries(preferences));
  }

  /**
   * Build distance matrix for ACO based on learning objectives
   */
  buildDistanceMatrix(startCourse, endCourse) {
    const numCourses = this.courses.length;
    const distanceMatrix = Array(numCourses).fill(null).map(() => 
      Array(numCourses).fill(Infinity)
    );
    
    // Calculate distances between courses
    for (let i = 0; i < numCourses; i++) {
      for (let j = 0; j < numCourses; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
        } else {
          distanceMatrix[i][j] = this.calculateLearningDistance(
            this.courses[i], 
            this.courses[j]
          );
        }
      }
    }
    
    return distanceMatrix;
  }

  /**
   * Calculate learning distance between two courses
   */
  calculateLearningDistance(course1, course2) {
    let distance = 1.0;
    
    // Check if course2 depends on course1
    const prereqs = this.dependencies.get(course2.id) || [];
    if (prereqs.includes(course1.id)) {
      distance *= 0.5; // Lower distance if it's a prerequisite
    } else if (prereqs.length > 0 && !prereqs.includes(course1.id)) {
      distance *= 2.0; // Higher distance if prerequisites are not met
    }
    
    // Difficulty progression
    const diff1 = this.difficultyWeights.get(course1.id) || 1.0;
    const diff2 = this.difficultyWeights.get(course2.id) || 1.0;
    const difficultyRatio = diff2 / diff1;
    
    if (difficultyRatio > 1.5) {
      distance *= 1.5; // Penalize large difficulty jumps
    } else if (difficultyRatio < 0.5) {
      distance *= 1.2; // Slight penalty for going back to easier content
    }
    
    // Subject similarity (if available)
    if (course1.subject && course2.subject) {
      if (course1.subject === course2.subject) {
        distance *= 0.8; // Reward staying in same subject
      }
    }
    
    // User preferences
    const preferredSubjects = this.userPreferences.get('preferredSubjects') || [];
    if (preferredSubjects.includes(course2.subject)) {
      distance *= 0.9; // Reward preferred subjects
    }
    
    const avoidedSubjects = this.userPreferences.get('avoidedSubjects') || [];
    if (avoidedSubjects.includes(course2.subject)) {
      distance *= 1.5; // Penalize avoided subjects
    }
    
    return distance;
  }

  /**
   * Validate that a path respects all dependencies
   */
  validatePath(path) {
    const completed = new Set();
    
    for (let i = 0; i < path.length; i++) {
      const courseId = this.courses[path[i]].id;
      const prereqs = this.dependencies.get(courseId) || [];
      
      // Check if all prerequisites are completed
      for (const prereq of prereqs) {
        if (!completed.has(prereq)) {
          return false; // Dependency violation
        }
      }
      
      completed.add(courseId);
    }
    
    return true;
  }

  /**
   * Calculate the efficiency score of a learning path
   */
  calculatePathEfficiency(path) {
    if (!this.validatePath(path)) {
      return 0;
    }
    
    let totalDifficulty = 0;
    let difficultyProgression = 0;
    let subjectConsistency = 0;
    
    // Calculate total difficulty and progression
    for (let i = 0; i < path.length; i++) {
      const course = this.courses[path[i]];
      const difficulty = this.difficultyWeights.get(course.id) || 1.0;
      totalDifficulty += difficulty;
      
      if (i > 0) {
        const prevCourse = this.courses[path[i - 1]];
        const prevDifficulty = this.difficultyWeights.get(prevCourse.id) || 1.0;
        
        // Reward smooth difficulty progression
        const progression = difficulty / prevDifficulty;
        if (progression >= 1.0 && progression <= 1.5) {
          difficultyProgression += 1;
        }
      }
      
      // Subject consistency
      if (i > 0) {
        const prevCourse = this.courses[path[i - 1]];
        if (course.subject === prevCourse.subject) {
          subjectConsistency += 1;
        }
      }
    }
    
    // Normalize scores
    const maxProgression = path.length - 1;
    const maxConsistency = path.length - 1;
    
    const progressionScore = maxProgression > 0 ? difficultyProgression / maxProgression : 0;
    const consistencyScore = maxConsistency > 0 ? subjectConsistency / maxConsistency : 0;
    
    // Combined efficiency score
    return (progressionScore * 0.4 + consistencyScore * 0.3 + (1 / totalDifficulty) * 0.3);
  }

  /**
   * Optimize learning path from start to end course
   */
  optimizeLearningPath(startCourseId, endCourseId, options = {}) {
    const startIndex = this.courses.findIndex(c => c.id === startCourseId);
    const endIndex = this.courses.findIndex(c => c.id === endCourseId);
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Start or end course not found');
    }
    
    // Build distance matrix
    const distanceMatrix = this.buildDistanceMatrix(startIndex, endIndex);
    
    // Run ACO optimization
    const result = this.aco.optimize(distanceMatrix, startIndex);
    
    // Convert indices back to course IDs and validate
    const optimizedPath = result.bestPath.map(index => this.courses[index].id);
    
    // Filter out invalid paths and return the best valid one
    if (this.validatePath(result.bestPath)) {
      return {
        path: optimizedPath,
        efficiency: this.calculatePathEfficiency(result.bestPath),
        totalDistance: result.bestDistance,
        iterations: result.iterationHistory.length,
        convergenceData: result.iterationHistory
      };
    }
    
    // If best path is invalid, find the best valid path from history
    for (const record of result.iterationHistory.reverse()) {
      if (this.validatePath(record.bestPath)) {
        const validPath = record.bestPath.map(index => this.courses[index].id);
        return {
          path: validPath,
          efficiency: this.calculatePathEfficiency(record.bestPath),
          totalDistance: record.bestDistance,
          iterations: record.iteration,
          convergenceData: result.iterationHistory
        };
      }
    }
    
    throw new Error('No valid learning path found');
  }

  /**
   * Get multiple alternative learning paths
   */
  getAlternativePaths(startCourseId, endCourseId, numAlternatives = 3) {
    const paths = [];
    const usedPaths = new Set();
    
    // Reset ACO for each run to get different results
    for (let i = 0; i < numAlternatives; i++) {
      this.aco.reset();
      
      try {
        const result = this.optimizeLearningPath(startCourseId, endCourseId);
        const pathKey = result.path.join('-');
        
        if (!usedPaths.has(pathKey)) {
          paths.push(result);
          usedPaths.add(pathKey);
        }
      } catch (error) {
        console.warn(`Failed to generate alternative path ${i + 1}:`, error.message);
      }
    }
    
    return paths.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Get learning analytics for a path
   */
  getPathAnalytics(path) {
    const pathIndices = path.map(courseId => 
      this.courses.findIndex(c => c.id === courseId)
    );
    
    return {
      totalCourses: path.length,
      estimatedDuration: pathIndices.reduce((sum, index) => 
        sum + (this.courses[index].duration || 10), 0
      ),
      averageDifficulty: pathIndices.reduce((sum, index) => 
        sum + (this.difficultyWeights.get(this.courses[index].id) || 1.0), 0
      ) / path.length,
      difficultyProgression: this.calculateDifficultyProgression(pathIndices),
      subjectDistribution: this.calculateSubjectDistribution(pathIndices),
      prerequisitesSatisfied: this.validatePath(pathIndices)
    };
  }

  /**
   * Calculate difficulty progression score
   */
  calculateDifficultyProgression(pathIndices) {
    let progressionScore = 0;
    
    for (let i = 1; i < pathIndices.length; i++) {
      const prevDifficulty = this.difficultyWeights.get(this.courses[pathIndices[i - 1]].id) || 1.0;
      const currDifficulty = this.difficultyWeights.get(this.courses[pathIndices[i]].id) || 1.0;
      
      const ratio = currDifficulty / prevDifficulty;
      if (ratio >= 1.0 && ratio <= 1.5) {
        progressionScore += 1;
      }
    }
    
    return pathIndices.length > 1 ? progressionScore / (pathIndices.length - 1) : 0;
  }

  /**
   * Calculate subject distribution in path
   */
  calculateSubjectDistribution(pathIndices) {
    const distribution = new Map();
    
    pathIndices.forEach(index => {
      const subject = this.courses[index].subject || 'unknown';
      distribution.set(subject, (distribution.get(subject) || 0) + 1);
    });
    
    return Object.fromEntries(distribution);
  }
}

module.exports = LearningPathOptimizer;
