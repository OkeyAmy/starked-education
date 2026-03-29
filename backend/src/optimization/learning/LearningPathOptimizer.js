const AntColonyOptimizer = require('../aco/AntColonyOptimizer');
const Graph = require('../aco/Graph');

/**
 * Learning Path Optimization Engine
 * Uses Ant Colony Optimization to create optimal learning journeys
 */
class LearningPathOptimizer {
  constructor(options = {}) {
    this.courses = new Map();
    this.prerequisites = new Map();
    this.difficultyWeights = options.difficultyWeights || { beginner: 1.0, intermediate: 1.5, advanced: 2.0 };
    this.timeWeights = options.timeWeights || { short: 1.0, medium: 1.2, long: 1.5 };
    this.learningStyles = options.learningStyles || ['visual', 'auditory', 'kinesthetic', 'reading'];
    this.userProfile = null;
    this.optimizationHistory = [];
  }

  /**
   * Add a course to the system
   */
  addCourse(courseId, courseData) {
    this.courses.set(courseId, {
      id: courseId,
      title: courseData.title,
      difficulty: courseData.difficulty || 'intermediate',
      duration: courseData.duration || 60, // minutes
      topics: courseData.topics || [],
      skills: courseData.skills || [],
      prerequisites: courseData.prerequisites || [],
      learningStyle: courseData.learningStyle || 'reading',
      rating: courseData.rating || 0,
      completionRate: courseData.completionRate || 0,
      ...courseData
    });

    // Store prerequisites for quick lookup
    this.prerequisites.set(courseId, courseData.prerequisites || []);
  }

  /**
   * Set user profile for personalized optimization
   */
  setUserProfile(profile) {
    this.userProfile = {
      currentSkills: profile.currentSkills || [],
      learningStyle: profile.learningStyle || 'reading',
      timeAvailable: profile.timeAvailable || 60, // minutes per session
      difficulty: profile.difficulty || 'intermediate',
      goals: profile.goals || [],
      preferences: profile.preferences || {},
      ...profile
    };
  }

  /**
   * Build optimization graph from courses and user profile
   */
  buildOptimizationGraph(targetSkills, maxCourses = 10) {
    const relevantCourses = this.getRelevantCourses(targetSkills);
    const graph = new Graph();
    
    // Add courses as nodes
    const courseNodes = relevantCourses.map(course => course.id);
    graph.addNodes(courseNodes);

    // Calculate distances between courses
    for (let i = 0; i < relevantCourses.length; i++) {
      for (let j = 0; j < relevantCourses.length; j++) {
        if (i !== j) {
          const course1 = relevantCourses[i];
          const course2 = relevantCourses[j];
          
          // Check if course2 can follow course1
          if (this.canFollowCourse(course1, course2)) {
            const distance = this.calculateCourseDistance(course1, course2);
            graph.addEdge(course1.id, course2.id, distance);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Get courses relevant to target skills
   */
  getRelevantCourses(targetSkills) {
    const relevantCourses = [];
    
    for (const [courseId, course] of this.courses) {
      const relevanceScore = this.calculateRelevanceScore(course, targetSkills);
      if (relevanceScore > 0) {
        relevantCourses.push({
          ...course,
          relevanceScore
        });
      }
    }

    // Sort by relevance and return top courses
    return relevantCourses
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20); // Limit to prevent explosion
  }

  /**
   * Calculate relevance score of a course to target skills
   */
  calculateRelevanceScore(course, targetSkills) {
    let score = 0;
    
    // Direct skill matches
    for (const skill of targetSkills) {
      if (course.skills.includes(skill)) {
        score += 10;
      }
      
      // Topic matches
      for (const topic of course.topics) {
        if (topic.toLowerCase().includes(skill.toLowerCase())) {
          score += 5;
        }
      }
    }

    // User preference alignment
    if (this.userProfile) {
      // Learning style preference
      if (course.learningStyle === this.userProfile.learningStyle) {
        score += 3;
      }

      // Difficulty preference
      if (course.difficulty === this.userProfile.difficulty) {
        score += 2;
      }

      // Time constraints
      if (course.duration <= this.userProfile.timeAvailable) {
        score += 2;
      }

      // Rating bonus
      score += course.rating * 0.5;
      
      // Completion rate bonus
      score += course.completionRate * 0.3;
    }

    return score;
  }

  /**
   * Check if course2 can follow course1
   */
  canFollowCourse(course1, course2) {
    // Check prerequisites
    const prerequisites = this.prerequisites.get(course2.id) || [];
    
    // Course1 must satisfy at least one prerequisite or be a foundation
    if (prerequisites.length === 0) return true;
    
    // Check if course1 is a prerequisite
    if (prerequisites.includes(course1.id)) return true;
    
    // Check if course1 provides required skills
    const course1Skills = new Set(course1.skills);
    const prerequisiteSkills = this.getPrerequisiteSkills(prerequisites);
    
    for (const skill of prerequisiteSkills) {
      if (course1Skills.has(skill)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get skills from prerequisite courses
   */
  getPrerequisiteSkills(prerequisiteIds) {
    const skills = new Set();
    
    for (const prereqId of prerequisiteIds) {
      const course = this.courses.get(prereqId);
      if (course) {
        course.skills.forEach(skill => skills.add(skill));
      }
    }
    
    return skills;
  }

  /**
   * Calculate distance between two courses
   */
  calculateCourseDistance(course1, course2) {
    let distance = 1;

    // Difficulty progression penalty
    const diff1 = this.difficultyWeights[course1.difficulty] || 1.5;
    const diff2 = this.difficultyWeights[course2.difficulty] || 1.5;
    
    if (diff2 > diff1) {
      distance *= (diff2 / diff1); // Harder courses cost more
    } else {
      distance *= 1.2; // Easier or same level courses have small cost
    }

    // Time cost
    const timeWeight = this.timeWeights[this.getDurationCategory(course2.duration)] || 1.2;
    distance *= timeWeight;

    // Relevance bonus (lower distance for more relevant courses)
    if (course2.relevanceScore) {
      distance *= (1 / (1 + course2.relevanceScore * 0.1));
    }

    // Rating and completion rate bonuses
    distance *= (1 / (1 + course2.rating * 0.05));
    distance *= (1 / (1 + course2.completionRate * 0.03));

    return Math.max(distance, 0.1); // Minimum distance
  }

  /**
   * Get duration category
   */
  getDurationCategory(duration) {
    if (duration <= 30) return 'short';
    if (duration <= 90) return 'medium';
    return 'long';
  }

  /**
   * Optimize learning path using ACO
   */
  async optimizeLearningPath(targetSkills, options = {}) {
    if (!this.userProfile) {
      throw new Error('User profile must be set before optimization');
    }

    const graph = this.buildOptimizationGraph(targetSkills, options.maxCourses || 10);
    
    const optimizer = new AntColonyOptimizer({
      antCount: options.antCount || 15,
      maxIterations: options.maxIterations || 50,
      alpha: options.alpha || 1.0,
      beta: options.beta || 2.0,
      rho: options.rho || 0.3,
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
    
    // Convert path to learning journey
    const learningPath = this.convertPathToLearningPath(results.bestSolution.path);
    
    // Store optimization history
    this.optimizationHistory.push({
      timestamp: new Date(),
      targetSkills,
      userProfile: this.userProfile,
      results,
      learningPath
    });

    return {
      learningPath,
      optimization: results,
      metadata: {
        totalDuration: learningPath.reduce((sum, course) => sum + course.duration, 0),
        courseCount: learningPath.length,
        skillsCovered: this.getSkillsCovered(learningPath),
        difficultyProgression: this.getDifficultyProgression(learningPath)
      }
    };
  }

  /**
   * Convert optimized path to learning path with metadata
   */
  convertPathToLearningPath(path) {
    const learningPath = [];
    
    for (const courseId of path) {
      const course = this.courses.get(courseId);
      if (course) {
        learningPath.push({
          ...course,
          position: learningPath.length + 1,
          estimatedTime: course.duration,
          prerequisitesMet: this.checkPrerequisitesMet(course, learningPath),
          personalizedNotes: this.generatePersonalizedNotes(course)
        });
      }
    }

    return learningPath;
  }

  /**
   * Check if prerequisites are met in current path
   */
  checkPrerequisitesMet(course, currentPath) {
    const prerequisites = this.prerequisites.get(course.id) || [];
    const completedCourses = new Set(currentPath.map(c => c.id));
    
    return prerequisites.every(prereq => completedCourses.has(prereq));
  }

  /**
   * Generate personalized notes for a course
   */
  generatePersonalizedNotes(course) {
    const notes = [];
    
    if (this.userProfile) {
      // Learning style tips
      if (course.learningStyle !== this.userProfile.learningStyle) {
        notes.push(`Consider adapting to ${course.learningStyle} learning style for this course`);
      }

      // Difficulty warnings
      if (course.difficulty === 'advanced' && this.userProfile.difficulty === 'beginner') {
        notes.push('This course may be challenging - consider additional preparation');
      }

      // Time management
      if (course.duration > this.userProfile.timeAvailable) {
        notes.push(`Course duration (${course.duration}min) exceeds your typical session time`);
      }
    }

    return notes;
  }

  /**
   * Get all skills covered in learning path
   */
  getSkillsCovered(learningPath) {
    const skills = new Set();
    
    for (const course of learningPath) {
      course.skills.forEach(skill => skills.add(skill));
    }
    
    return Array.from(skills);
  }

  /**
   * Get difficulty progression in learning path
   */
  getDifficultyProgression(learningPath) {
    return learningPath.map(course => course.difficulty);
  }

  /**
   * Re-optimize path with new constraints
   */
  async reoptimizePath(existingPath, newConstraints = {}) {
    // Update user profile with new constraints
    if (newConstraints.userProfile) {
      this.setUserProfile({ ...this.userProfile, ...newConstraints.userProfile });
    }

    // Get target skills from existing path
    const targetSkills = this.getSkillsCovered(existingPath);
    
    // Add completed courses as constraints
    const completedCourses = existingPath.slice(0, newConstraints.completedCount || 0);
    
    // Re-optimize remaining path
    const options = {
      ...newConstraints,
      maxCourses: existingPath.length,
      startFromCourse: completedCourses.length > 0 ? completedCourses[completedCourses.length - 1].id : null
    };

    return await this.optimizeLearningPath(targetSkills, options);
  }

  /**
   * Get optimization analytics
   */
  getAnalytics() {
    const analytics = {
      totalOptimizations: this.optimizationHistory.length,
      averagePathLength: 0,
      mostOptimizedSkills: {},
      averageOptimizationTime: 0,
      convergencePatterns: []
    };

    if (this.optimizationHistory.length === 0) return analytics;

    // Calculate averages
    const totalPathLength = this.optimizationHistory.reduce((sum, opt) => sum + opt.learningPath.length, 0);
    analytics.averagePathLength = totalPathLength / this.optimizationHistory.length;

    // Most optimized skills
    const skillCounts = {};
    for (const opt of this.optimizationHistory) {
      for (const skill of opt.targetSkills) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    }
    analytics.mostOptimizedSkills = skillCounts;

    // Convergence patterns
    analytics.convergencePatterns = this.optimizationHistory.map(opt => ({
      timestamp: opt.timestamp,
      iterations: opt.results.iterations,
      bestFitness: opt.results.bestSolution.fitness
    }));

    return analytics;
  }
}

module.exports = LearningPathOptimizer;
