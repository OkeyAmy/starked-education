/**
 * Dynamic Path Replanning System
 * Handles real-time path adjustments based on changing conditions
 */

const LearningPathOptimizer = require('./LearningPathOptimizer');
const ResourceAllocationOptimizer = require('./ResourceAllocationOptimizer');

class DynamicPathReplanner {
  constructor(options = {}) {
    this.learningOptimizer = new LearningPathOptimizer(options.learning);
    this.resourceOptimizer = new ResourceAllocationOptimizer(options.resource);
    
    this.currentPaths = new Map(); // userId -> current path
    this.pathHistory = new Map(); // userId -> path history
    this.changeEvents = [];
    this.replanThresholds = {
      efficiencyDrop: 0.3, // 30% efficiency drop triggers replan
      resourceUnavailable: 1.0, // Any resource unavailability triggers replan
      userPreferenceChange: 0.5, // 50% preference change triggers replan
      timeConstraint: 0.2 // 20% time constraint violation triggers replan
    };
  }

  /**
   * Initialize a learning path for a user
   */
  initializePath(userId, startCourse, endCourse, preferences = {}) {
    const path = this.learningOptimizer.optimizeLearningPath(startCourse, endCourse, {
      userPreferences: preferences
    });
    
    this.currentPaths.set(userId, {
      ...path,
      userId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      currentStep: 0,
      completedSteps: new Set(),
      preferences: { ...preferences }
    });
    
    this.pathHistory.set(userId, []);
    
    return this.currentPaths.get(userId);
  }

  /**
   * Record a change event that might trigger replanning
   */
  recordChangeEvent(event) {
    const changeEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: event.type, // course_change, resource_change, preference_change, time_constraint
      affectedUsers: event.affectedUsers || [],
      data: event.data,
      processed: false
    };
    
    this.changeEvents.push(changeEvent);
    this.processChangeEvents();
    
    return changeEvent.id;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Process pending change events and trigger replanning if needed
   */
  processChangeEvents() {
    const unprocessedEvents = this.changeEvents.filter(event => !event.processed);
    
    for (const event of unprocessedEvents) {
      this.processChangeEvent(event);
      event.processed = true;
    }
  }

  /**
   * Process a single change event
   */
  processChangeEvent(event) {
    switch (event.type) {
      case 'course_change':
        this.handleCourseChange(event);
        break;
      case 'resource_change':
        this.handleResourceChange(event);
        break;
      case 'preference_change':
        this.handlePreferenceChange(event);
        break;
      case 'time_constraint':
        this.handleTimeConstraintChange(event);
        break;
      case 'progress_update':
        this.handleProgressUpdate(event);
        break;
    }
  }

  /**
   * Handle course content changes
   */
  handleCourseChange(event) {
    const { courseId, changeType, newData } = event.data;
    
    // Update learning optimizer with new course data
    this.learningOptimizer.setupLearningEnvironment(
      this.learningOptimizer.courses.map(course => 
        course.id === courseId ? { ...course, ...newData } : course
      ),
      this.learningOptimizer.dependencies
    );
    
    // Check affected users
    const affectedUsers = this.getUsersWithCourseInPath(courseId);
    
    for (const userId of affectedUsers) {
      const currentPath = this.currentPaths.get(userId);
      if (currentPath) {
        const efficiencyImpact = this.calculateEfficiencyImpact(currentPath, event);
        
        if (efficiencyImpact > this.replanThresholds.efficiencyDrop) {
          this.replanPath(userId, `Course ${courseId} ${changeType}`);
        }
      }
    }
  }

  /**
   * Handle resource availability changes
   */
  handleResourceChange(event) {
    const { resourceId, available, timeSlot } = event.data;
    
    // Update resource optimizer
    const resource = this.resourceOptimizer.resources.get(resourceId);
    if (resource) {
      resource.availability.set(timeSlot, available);
    }
    
    // Check affected users
    const affectedUsers = this.getUsersWithResourceAllocation(resourceId);
    
    for (const userId of affectedUsers) {
      if (!available) {
        this.replanPath(userId, `Resource ${resourceId} unavailable at ${timeSlot}`);
      }
    }
  }

  /**
   * Handle user preference changes
   */
  handlePreferenceChange(event) {
    const { userId, newPreferences } = event.data;
    
    const currentPath = this.currentPaths.get(userId);
    if (currentPath) {
      const preferenceChange = this.calculatePreferenceChange(
        currentPath.preferences,
        newPreferences
      );
      
      if (preferenceChange > this.replanThresholds.userPreferenceChange) {
        currentPath.preferences = { ...newPreferences };
        this.replanPath(userId, 'User preferences changed');
      }
    }
  }

  /**
   * Handle time constraint changes
   */
  handleTimeConstraintChange(event) {
    const { userId, newTimeLimit } = event.data;
    
    const currentPath = this.currentPaths.get(userId);
    if (currentPath) {
      const currentTimeRequired = this.calculatePathDuration(currentPath);
      const timeViolation = Math.max(0, currentTimeRequired - newTimeLimit) / currentTimeRequired;
      
      if (timeViolation > this.replanThresholds.timeConstraint) {
        this.replanPath(userId, 'Time constraint violation');
      }
    }
  }

  /**
   * Handle user progress updates
   */
  handleProgressUpdate(event) {
    const { userId, courseId, completed } = event.data;
    
    const currentPath = this.currentPaths.get(userId);
    if (currentPath) {
      if (completed) {
        currentPath.completedSteps.add(courseId);
        
        // Update current step
        const currentIndex = currentPath.path.indexOf(courseId);
        if (currentIndex >= currentPath.currentStep) {
          currentPath.currentStep = currentIndex + 1;
        }
        
        // Check if we need to optimize remaining path
        const remainingPath = currentPath.path.slice(currentPath.currentStep);
        if (remainingPath.length > 1) {
          this.optimizeRemainingPath(userId);
        }
      }
    }
  }

  /**
   * Get users who have a specific course in their path
   */
  getUsersWithCourseInPath(courseId) {
    const affectedUsers = [];
    
    for (const [userId, path] of this.currentPaths) {
      if (path.path.includes(courseId)) {
        affectedUsers.push(userId);
      }
    }
    
    return affectedUsers;
  }

  /**
   * Get users who have a specific resource allocated
   */
  getUsersWithResourceAllocation(resourceId) {
    // This would integrate with the resource allocation system
    // For now, return all active users as a placeholder
    return Array.from(this.currentPaths.keys());
  }

  /**
   * Calculate efficiency impact of a change
   */
  calculateEfficiencyImpact(currentPath, event) {
    // Recalculate path efficiency with new conditions
    const newPath = this.learningOptimizer.optimizeLearningPath(
      currentPath.path[0],
      currentPath.path[currentPath.path.length - 1],
      { userPreferences: currentPath.preferences }
    );
    
    const efficiencyDrop = (currentPath.efficiency - newPath.efficiency) / currentPath.efficiency;
    return Math.max(0, efficiencyDrop);
  }

  /**
   * Calculate preference change magnitude
   */
  calculatePreferenceChange(oldPrefs, newPrefs) {
    const allKeys = new Set([...Object.keys(oldPrefs), ...Object.keys(newPrefs)]);
    let totalChange = 0;
    let keyCount = 0;
    
    for (const key of allKeys) {
      const oldValue = oldPrefs[key] || 0;
      const newValue = newPrefs[key] || 0;
      
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        // Handle array/object preferences
        const change = this.calculateObjectChange(oldValue, newValue);
        totalChange += change;
      } else {
        // Handle simple values
        const change = Math.abs(oldValue - newValue) / Math.max(Math.abs(oldValue), Math.abs(newValue), 1);
        totalChange += change;
      }
      
      keyCount++;
    }
    
    return keyCount > 0 ? totalChange / keyCount : 0;
  }

  /**
   * Calculate change between two objects/arrays
   */
  calculateObjectChange(oldObj, newObj) {
    const oldArray = Array.isArray(oldObj) ? oldObj : Object.values(oldObj);
    const newArray = Array.isArray(newObj) ? newObj : Object.values(newObj);
    
    const union = new Set([...oldArray, ...newArray]);
    const intersection = new Set(oldArray.filter(x => newArray.includes(x)));
    
    return union.size > 0 ? 1 - (intersection.size / union.size) : 0;
  }

  /**
   * Calculate total duration of a path
   */
  calculatePathDuration(path) {
    return this.learningOptimizer.getPathAnalytics(path.path).estimatedDuration;
  }

  /**
   * Replan a user's learning path
   */
  replanPath(userId, reason) {
    const currentPath = this.currentPaths.get(userId);
    if (!currentPath) return null;
    
    // Save current path to history
    const history = this.pathHistory.get(userId) || [];
    history.push({
      ...currentPath,
      replanReason: reason,
      replanTimestamp: new Date()
    });
    this.pathHistory.set(userId, history);
    
    // Determine new start and end points
    const remainingPath = currentPath.path.slice(currentPath.currentStep);
    const startCourse = remainingPath[0];
    const endCourse = currentPath.path[currentPath.path.length - 1];
    
    try {
      // Generate new optimized path
      const newPath = this.learningOptimizer.optimizeLearningPath(
        startCourse,
        endCourse,
        { userPreferences: currentPath.preferences }
      );
      
      // Preserve completed courses
      const completedPath = currentPath.path.slice(0, currentPath.currentStep);
      const fullNewPath = [...completedPath, ...newPath.path];
      
      // Update current path
      this.currentPaths.set(userId, {
        ...newPath,
        path: fullNewPath,
        userId,
        createdAt: currentPath.createdAt,
        lastUpdated: new Date(),
        currentStep: currentPath.currentStep,
        completedSteps: currentPath.completedSteps,
        preferences: currentPath.preferences,
        replanCount: (currentPath.replanCount || 0) + 1,
        lastReplanReason: reason
      });
      
      return this.currentPaths.get(userId);
    } catch (error) {
      console.error(`Failed to replan path for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Optimize only the remaining portion of a path
   */
  optimizeRemainingPath(userId) {
    const currentPath = this.currentPaths.get(userId);
    if (!currentPath || currentPath.currentStep >= currentPath.path.length - 1) {
      return null;
    }
    
    const remainingPath = currentPath.path.slice(currentPath.currentStep);
    const startCourse = remainingPath[0];
    const endCourse = currentPath.path[currentPath.path.length - 1];
    
    try {
      const optimizedRemaining = this.learningOptimizer.optimizeLearningPath(
        startCourse,
        endCourse,
        { userPreferences: currentPath.preferences }
      );
      
      // Combine completed portion with optimized remaining
      const completedPath = currentPath.path.slice(0, currentPath.currentStep);
      const fullOptimizedPath = [...completedPath, ...optimizedRemaining.path];
      
      // Update current path
      this.currentPaths.set(userId, {
        ...currentPath,
        path: fullOptimizedPath,
        efficiency: optimizedRemaining.efficiency,
        totalDistance: optimizedRemaining.totalDistance,
        lastUpdated: new Date()
      });
      
      return this.currentPaths.get(userId);
    } catch (error) {
      console.error(`Failed to optimize remaining path for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get current path for a user
   */
  getCurrentPath(userId) {
    return this.currentPaths.get(userId) || null;
  }

  /**
   * Get path history for a user
   */
  getPathHistory(userId) {
    return this.pathHistory.get(userId) || [];
  }

  /**
   * Get all active paths
   */
  getAllActivePaths() {
    return Array.from(this.currentPaths.values());
  }

  /**
   * Get path analytics for a user
   */
  getPathAnalytics(userId) {
    const currentPath = this.currentPaths.get(userId);
    if (!currentPath) return null;
    
    const analytics = this.learningOptimizer.getPathAnalytics(currentPath.path);
    const history = this.pathHistory.get(userId) || [];
    
    return {
      ...analytics,
      currentStep: currentPath.currentStep,
      completedSteps: currentPath.completedSteps.size,
      totalSteps: currentPath.path.length,
      progressPercentage: (currentPath.completedSteps.size / currentPath.path.length) * 100,
      replanCount: currentPath.replanCount || 0,
      lastReplanReason: currentPath.lastReplanReason,
      pathStability: this.calculatePathStability(userId),
      estimatedCompletion: this.estimateCompletionTime(userId)
    };
  }

  /**
   * Calculate path stability (how often it's been replanned)
   */
  calculatePathStability(userId) {
    const history = this.pathHistory.get(userId) || [];
    const currentPath = this.currentPaths.get(userId);
    
    if (!currentPath || history.length === 0) return 1.0;
    
    const totalChanges = history.length + (currentPath.replanCount || 0);
    const timeSinceCreation = (Date.now() - currentPath.createdAt.getTime()) / (1000 * 60 * 60 * 24); // days
    
    return Math.max(0, 1 - (totalChanges / Math.max(1, timeSinceCreation)));
  }

  /**
   * Estimate completion time based on current progress
   */
  estimateCompletionTime(userId) {
    const currentPath = this.currentPaths.get(userId);
    if (!currentPath) return null;
    
    const remainingPath = currentPath.path.slice(currentPath.currentStep);
    const analytics = this.learningOptimizer.getPathAnalytics(remainingPath);
    
    return {
      estimatedHours: analytics.estimatedDuration,
      estimatedDays: Math.ceil(analytics.estimatedDuration / 8), // Assuming 8 hours per day
      remainingCourses: remainingPath.length,
      averageDifficulty: analytics.averageDifficulty
    };
  }

  /**
   * Set replan thresholds
   */
  setReplanThresholds(thresholds) {
    this.replanThresholds = { ...this.replanThresholds, ...thresholds };
  }

  /**
   * Get system statistics
   */
  getSystemStatistics() {
    const activePaths = this.getAllActivePaths();
    const totalUsers = activePaths.length;
    
    let totalReplans = 0;
    let averageEfficiency = 0;
    let averageProgress = 0;
    
    activePaths.forEach(path => {
      totalReplans += path.replanCount || 0;
      averageEfficiency += path.efficiency;
      averageProgress += (path.completedSteps.size / path.path.length) * 100;
    });
    
    return {
      totalActiveUsers: totalUsers,
      totalReplans: totalReplans,
      averageReplansPerUser: totalUsers > 0 ? totalReplans / totalUsers : 0,
      averageEfficiency: totalUsers > 0 ? averageEfficiency / totalUsers : 0,
      averageProgress: totalUsers > 0 ? averageProgress / totalUsers : 0,
      pendingChangeEvents: this.changeEvents.filter(e => !e.processed).length,
      systemStability: this.calculateSystemStability()
    };
  }

  /**
   * Calculate overall system stability
   */
  calculateSystemStability() {
    const activePaths = this.getAllActivePaths();
    
    if (activePaths.length === 0) return 1.0;
    
    let totalStability = 0;
    activePaths.forEach(path => {
      const userId = path.userId;
      totalStability += this.calculatePathStability(userId);
    });
    
    return totalStability / activePaths.length;
  }
}

module.exports = DynamicPathReplanner;
