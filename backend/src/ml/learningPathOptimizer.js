const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

class LearningPathOptimizer {
  constructor() {
    this.complexityLevels = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4
    };
    
    this.learningStyles = {
      visual: ['videos', 'infographics', 'diagrams'],
      auditory: ['lectures', 'podcasts', 'discussions'],
      kinesthetic: ['simulations', 'hands-on', 'projects'],
      reading: ['textbooks', 'articles', 'documentation']
    };

    this.contentTypes = {
      video: { engagement: 0.8, retention: 0.6, difficulty: 0.3 },
      text: { engagement: 0.5, retention: 0.7, difficulty: 0.4 },
      interactive: { engagement: 0.9, retention: 0.8, difficulty: 0.6 },
      assessment: { engagement: 0.6, retention: 0.9, difficulty: 0.7 },
      project: { engagement: 0.85, retention: 0.85, difficulty: 0.8 }
    };
  }

  async optimizeLearningPath(studentProfile, courseContent, performanceData = {}) {
    try {
      // Analyze student learning characteristics
      const learningCharacteristics = this.analyzeLearningCharacteristics(studentProfile, performanceData);
      
      // Assess content difficulty and prerequisites
      const contentAnalysis = this.analyzeContent(courseContent);
      
      // Generate optimized path
      const optimizedPath = this.generateOptimizedPath(
        learningCharacteristics,
        contentAnalysis,
        performanceData
      );
      
      // Add adaptive elements
      const adaptivePath = this.addAdaptiveElements(optimizedPath, learningCharacteristics);
      
      // Create milestones and checkpoints
      const pathWithMilestones = this.addMilestones(adaptivePath);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        pathWithMilestones,
        learningCharacteristics,
        performanceData
      );

      return {
        studentId: studentProfile.id,
        optimizedPath: pathWithMilestones,
        recommendations,
        expectedOutcomes: this.calculateExpectedOutcomes(pathWithMilestones, learningCharacteristics),
        adaptationStrategy: this.createAdaptationStrategy(learningCharacteristics),
        progressTracking: this.setupProgressTracking(pathWithMilestones)
      };

    } catch (error) {
      console.error('Error optimizing learning path:', error);
      throw new Error('Failed to optimize learning path');
    }
  }

  analyzeLearningCharacteristics(studentProfile, performanceData) {
    const characteristics = {
      learningStyle: this.determineLearningStyle(studentProfile, performanceData),
      pace: this.determineLearningPace(studentProfile, performanceData),
      difficultyPreference: this.determineDifficultyPreference(studentProfile, performanceData),
      engagementPatterns: this.analyzeEngagementPatterns(performanceData),
      strengths: this.identifyStrengths(performanceData),
      weaknesses: this.identifyWeaknesses(performanceData),
      motivationLevel: this.assessMotivationLevel(studentProfile, performanceData),
      timeAvailability: this.assessTimeAvailability(studentProfile),
      priorKnowledge: this.assessPriorKnowledge(studentProfile, performanceData)
    };

    return characteristics;
  }

  determineLearningStyle(studentProfile, performanceData) {
    // Analyze performance across different content types
    const styleScores = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      reading: 0
    };

    // Analyze content type performance
    if (performanceData.contentTypePerformance) {
      Object.keys(performanceData.contentTypePerformance).forEach(contentType => {
        const performance = performanceData.contentTypePerformance[contentType];
        
        if (this.learningStyles.visual.includes(contentType)) {
          styleScores.visual += performance;
        } else if (this.learningStyles.auditory.includes(contentType)) {
          styleScores.auditory += performance;
        } else if (this.learningStyles.kinesthetic.includes(contentType)) {
          styleScores.kinesthetic += performance;
        } else if (this.learningStyles.reading.includes(contentType)) {
          styleScores.reading += performance;
        }
      });
    }

    // Consider student preferences
    if (studentProfile.preferences) {
      Object.keys(studentProfile.preferences).forEach(style => {
        if (styleScores[style] !== undefined) {
          styleScores[style] += studentProfile.preferences[style] * 0.3;
        }
      });
    }

    // Find dominant learning style
    const maxScore = Math.max(...Object.values(styleScores));
    const dominantStyle = Object.keys(styleScores).find(style => styleScores[style] === maxScore);

    return {
      dominant: dominantStyle || 'visual',
      scores: styleScores,
      confidence: maxScore / 4 // Normalize to 0-1
    };
  }

  determineLearningPace(studentProfile, performanceData) {
    const paceMetrics = {
      averageCompletionTime: performanceData.averageCompletionTime || 0,
      consistencyScore: this.calculateConsistencyScore(performanceData),
      accelerationRate: this.calculateAccelerationRate(performanceData),
      preferredSessionLength: studentProfile.preferredSessionLength || 30
    };

    let pace = 'normal';
    if (paceMetrics.averageCompletionTime < 0.7) pace = 'fast';
    else if (paceMetrics.averageCompletionTime > 1.3) pace = 'slow';

    return {
      category: pace,
      metrics: paceMetrics,
      recommendations: this.getPaceRecommendations(pace, paceMetrics)
    };
  }

  determineDifficultyPreference(studentProfile, performanceData) {
    const difficultyMetrics = {
      optimalChallengeLevel: this.calculateOptimalChallengeLevel(performanceData),
      frustrationThreshold: this.calculateFrustrationThreshold(performanceData),
      successRate: performanceData.successRate || 0.8,
      retryBehavior: this.analyzeRetryBehavior(performanceData)
    };

    let preference = 'balanced';
    if (difficultyMetrics.successRate > 0.9 && difficultyMetrics.retryBehavior < 0.3) {
      preference = 'challenging';
    } else if (difficultyMetrics.successRate < 0.7 || difficultyMetrics.retryBehavior > 0.7) {
      preference = 'supportive';
    }

    return {
      preference,
      metrics: difficultyMetrics
    };
  }

  analyzeContent(courseContent) {
    const analysis = {
      modules: [],
      prerequisites: this.mapPrerequisites(courseContent),
      difficultyProgression: this.analyzeDifficultyProgression(courseContent),
      contentDistribution: this.analyzeContentDistribution(courseContent),
      estimatedDuration: this.calculateEstimatedDuration(courseContent),
      skillMapping: this.mapSkillsToContent(courseContent)
    };

    // Analyze each module
    courseContent.modules.forEach((module, index) => {
      const moduleAnalysis = {
        id: module.id,
        title: module.title,
        difficulty: this.assessModuleDifficulty(module),
        estimatedTime: module.estimatedTime || this.estimateModuleTime(module),
        contentTypes: this.analyzeModuleContentTypes(module),
        prerequisites: module.prerequisites || [],
        skills: module.skills || [],
        assessmentWeight: module.assessmentWeight || 0.1
      };

      analysis.modules.push(moduleAnalysis);
    });

    return analysis;
  }

  generateOptimizedPath(learningCharacteristics, contentAnalysis, performanceData) {
    const path = {
      id: uuidv4(),
      modules: [],
      adaptations: [],
      totalEstimatedTime: 0,
      difficultyCurve: []
    };

    // Sort modules based on prerequisites and optimal learning sequence
    const sortedModules = this.sortModulesByOptimalSequence(
      contentAnalysis.modules,
      learningCharacteristics,
      performanceData
    );

    // Generate optimized sequence for each module
    sortedModules.forEach((module, index) => {
      const optimizedModule = this.optimizeModule(
        module,
        learningCharacteristics,
        index,
        sortedModules.length
      );

      path.modules.push(optimizedModule);
      path.totalEstimatedTime += optimizedModule.estimatedTime;
      path.difficultyCurve.push(optimizedModule.adjustedDifficulty);
    });

    return path;
  }

  optimizeModule(module, learningCharacteristics, position, totalModules) {
    const optimized = {
      ...module,
      originalDifficulty: module.difficulty,
      adjustedDifficulty: this.adjustModuleDifficulty(module, learningCharacteristics, position, totalModules),
      contentSequence: this.optimizeContentSequence(module, learningCharacteristics),
      adaptations: this.generateModuleAdaptations(module, learningCharacteristics),
      estimatedTime: this.adjustModuleTime(module, learningCharacteristics),
      supportResources: this.identifySupportResources(module, learningCharacteristics)
    };

    return optimized;
  }

  adjustModuleDifficulty(module, learningCharacteristics, position, totalModules) {
    let adjustedDifficulty = module.difficulty;

    // Adjust based on learning characteristics
    if (learningCharacteristics.difficultyPreference.preference === 'supportive') {
      adjustedDifficulty = Math.max(1, adjustedDifficulty - 0.5);
    } else if (learningCharacteristics.difficultyPreference.preference === 'challenging') {
      adjustedDifficulty = Math.min(4, adjustedDifficulty + 0.3);
    }

    // Adjust based on position in course (gradual progression)
    const progressionFactor = position / Math.max(totalModules - 1, 1);
    adjustedDifficulty += progressionFactor * 0.5;

    // Adjust based on prior knowledge
    if (learningCharacteristics.priorKnowledge.level === 'high') {
      adjustedDifficulty += 0.3;
    } else if (learningCharacteristics.priorKnowledge.level === 'low') {
      adjustedDifficulty -= 0.3;
    }

    return Math.max(1, Math.min(4, adjustedDifficulty));
  }

  optimizeContentSequence(module, learningCharacteristics) {
    const dominantStyle = learningCharacteristics.learningStyle.dominant;
    const preferredTypes = this.learningStyles[dominantStyle] || [];
    
    // Reorder content based on learning style preference
    const reorderedContent = [...(module.content || [])];
    
    // Move preferred content types to the beginning
    reorderedContent.sort((a, b) => {
      const aPreferred = preferredTypes.includes(a.type);
      const bPreferred = preferredTypes.includes(b.type);
      
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });

    // Insert engagement boosters based on pace
    if (learningCharacteristics.pace.category === 'slow') {
      this.insertEngagementBoosters(reorderedContent);
    }

    return reorderedContent;
  }

  addAdaptiveElements(path, learningCharacteristics) {
    const adaptivePath = { ...path };

    // Add adaptive checkpoints
    adaptivePath.checkpoints = this.createAdaptiveCheckpoints(path.modules, learningCharacteristics);
    
    // Add branching paths
    adaptivePath.branchingPaths = this.createBranchingPaths(path.modules, learningCharacteristics);
    
    // Add remediation loops
    adaptivePath.remediationLoops = this.createRemediationLoops(path.modules, learningCharacteristics);

    return adaptivePath;
  }

  addMilestones(path) {
    const pathWithMilestones = { ...path };
    
    // Create milestones at regular intervals
    const milestoneInterval = Math.ceil(path.modules.length / 4);
    
    pathWithMilestones.milestones = [];
    
    for (let i = milestoneInterval - 1; i < path.modules.length; i += milestoneInterval) {
      const milestone = {
        id: uuidv4(),
        name: `Milestone ${Math.floor(i / milestoneInterval) + 1}`,
        position: i,
        modules: path.modules.slice(Math.max(0, i - milestoneInterval + 1), i + 1),
        assessmentRequired: true,
        minimumCompetency: 0.7,
        rewards: this.generateMilestoneRewards(i, path.modules.length)
      };
      
      pathWithMilestones.milestones.push(milestone);
    }

    return pathWithMilestones;
  }

  generateRecommendations(path, learningCharacteristics, performanceData) {
    const recommendations = [];

    // Learning style recommendations
    recommendations.push({
      type: 'learning_style',
      priority: 'high',
      title: 'Optimize for Your Learning Style',
      description: `Your dominant learning style is ${learningCharacteristics.learningStyle.dominant}. Focus on ${this.learningStyles[learningCharacteristics.learningStyle.dominant].join(', ')} content types.`,
      actionable: true
    });

    // Pace recommendations
    if (learningCharacteristics.pace.category !== 'normal') {
      recommendations.push({
        type: 'pace',
        priority: 'medium',
        title: 'Adjust Your Learning Pace',
        description: learningCharacteristics.pace.recommendations,
        actionable: true
      });
    }

    // Time management recommendations
    if (learningCharacteristics.timeAvailability.limited) {
      recommendations.push({
        type: 'time_management',
        priority: 'high',
        title: 'Optimize Study Time',
        description: 'Consider breaking study sessions into shorter, more frequent chunks to maximize retention.',
        actionable: true
      });
    }

    // Strength-based recommendations
    if (learningCharacteristics.strengths.length > 0) {
      recommendations.push({
        type: 'strengths',
        priority: 'medium',
        title: 'Leverage Your Strengths',
        description: `Build on your strengths in ${learningCharacteristics.strengths.join(', ')} to tackle more challenging content.`,
        actionable: true
      });
    }

    // Weakness improvement recommendations
    if (learningCharacteristics.weaknesses.length > 0) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        title: 'Address Learning Gaps',
        description: `Focus on improving ${learningCharacteristics.weaknesses.join(', ')} through targeted practice and additional resources.`,
        actionable: true
      });
    }

    return recommendations;
  }

  calculateExpectedOutcomes(path, learningCharacteristics) {
    const outcomes = {
      completionProbability: this.calculateCompletionProbability(path, learningCharacteristics),
      expectedGrade: this.calculateExpectedGrade(path, learningCharacteristics),
      timeToCompletion: path.totalEstimatedTime,
      skillMastery: this.calculateSkillMastery(path),
      engagementLevel: this.calculateExpectedEngagement(path, learningCharacteristics),
      confidenceLevel: this.calculateConfidenceLevel(path, learningCharacteristics)
    };

    return outcomes;
  }

  createAdaptationStrategy(learningCharacteristics) {
    return {
      triggers: this.defineAdaptationTriggers(learningCharacteristics),
      adaptationRules: this.defineAdaptationRules(learningCharacteristics),
      monitoringFrequency: this.getMonitoringFrequency(learningCharacteristics),
      interventionCriteria: this.defineInterventionCriteria(learningCharacteristics)
    };
  }

  setupProgressTracking(path) {
    return {
      metrics: this.defineProgressMetrics(path),
      checkpoints: path.milestones || [],
      assessmentPoints: this.identifyAssessmentPoints(path),
      progressAlerts: this.defineProgressAlerts(path),
      reportingSchedule: 'Weekly progress reports, monthly comprehensive reviews'
    };
  }

  // Helper methods
  calculateConsistencyScore(performanceData) {
    // Calculate how consistent the student's performance is
    const sessionTimes = performanceData.sessionTimes || [];
    if (sessionTimes.length < 2) return 0.5;
    
    const variance = this.calculateVariance(sessionTimes);
    return Math.max(0, 1 - variance);
  }

  calculateAccelerationRate(performanceData) {
    // Calculate how quickly the student is accelerating through content
    const completionTimes = performanceData.completionTimes || [];
    if (completionTimes.length < 2) return 0;
    
    const recent = completionTimes.slice(-5);
    const older = completionTimes.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = this.average(recent);
    const olderAvg = this.average(older);
    
    return (olderAvg - recentAvg) / olderAvg;
  }

  calculateOptimalChallengeLevel(performanceData) {
    const successRate = performanceData.successRate || 0.8;
    const engagementLevel = performanceData.engagementLevel || 0.7;
    
    // Optimal challenge is where success rate is around 70-80% with high engagement
    if (successRate >= 0.7 && successRate <= 0.8 && engagementLevel > 0.7) {
      return 0.8; // High optimal challenge
    } else if (successRate > 0.9) {
      return 0.6; // Too easy
    } else if (successRate < 0.6) {
      return 0.4; // Too hard
    }
    
    return 0.7; // Good balance
  }

  calculateFrustrationThreshold(performanceData) {
    const retryRate = performanceData.retryRate || 0.3;
    const abandonmentRate = performanceData.abandonmentRate || 0.1;
    
    return Math.min(0.9, retryRate + abandonmentRate * 2);
  }

  analyzeRetryBehavior(performanceData) {
    const retryAttempts = performanceData.retryAttempts || [];
    if (retryAttempts.length === 0) return 0.5;
    
    const averageRetries = this.average(retryAttempts);
    return Math.min(1, averageRetries / 3); // Normalize to 0-1
  }

  getPaceRecommendations(pace, metrics) {
    const recommendations = {
      fast: 'Consider additional challenging content and advanced topics to maintain engagement.',
      normal: 'Maintain current pace with regular breaks and consistent study schedule.',
      slow: 'Focus on mastering concepts before moving forward. Consider additional practice exercises.'
    };
    
    return recommendations[pace] || recommendations.normal;
  }

  assessMotivationLevel(studentProfile, performanceData) {
    const indicators = {
      loginFrequency: performanceData.loginFrequency || 0.5,
      sessionDuration: performanceData.averageSessionDuration || 30,
      goalCompletion: performanceData.goalCompletionRate || 0.7,
      selfReportedMotivation: studentProfile.motivationLevel || 0.7
    };
    
    const motivationScore = Object.values(indicators).reduce((sum, val) => sum + val, 0) / Object.keys(indicators).length;
    
    return {
      score: motivationScore,
      level: motivationScore > 0.8 ? 'high' : motivationScore > 0.5 ? 'medium' : 'low',
      indicators
    };
  }

  assessTimeAvailability(studentProfile) {
    const weeklyHours = studentProfile.weeklyStudyHours || 10;
    const dailyHours = studentProfile.dailyStudyHours || 1.5;
    
    return {
      weeklyHours,
      dailyHours,
      limited: weeklyHours < 10,
      recommended: Math.max(10, weeklyHours)
    };
  }

  assessPriorKnowledge(studentProfile, performanceData) {
    const priorKnowledge = {
      level: 'medium',
      confidence: 0.7,
      areas: []
    };
    
    // Assess from performance data
    if (performanceData.priorAssessment) {
      priorKnowledge.level = performanceData.priorAssessment.level || 'medium';
      priorKnowledge.confidence = performanceData.priorAssessment.confidence || 0.7;
      priorKnowledge.areas = performanceData.priorAssessment.areas || [];
    }
    
    return priorKnowledge;
  }

  calculateVariance(values) {
    const mean = this.average(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return this.average(squaredDiffs);
  }

  average(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  // Additional helper methods for content analysis
  mapPrerequisites(courseContent) {
    const prerequisites = new Map();
    
    courseContent.modules.forEach(module => {
      if (module.prerequisites) {
        prerequisites.set(module.id, module.prerequisites);
      }
    });
    
    return prerequisites;
  }

  analyzeDifficultyProgression(courseContent) {
    const difficulties = courseContent.modules.map(module => module.difficulty || 2);
    
    return {
      progression: difficulties,
      average: this.average(difficulties),
      variance: this.calculateVariance(difficulties),
      trend: this.calculateTrend(difficulties)
    };
  }

  analyzeContentDistribution(courseContent) {
    const distribution = {};
    let totalContent = 0;
    
    courseContent.modules.forEach(module => {
      module.content.forEach(content => {
        distribution[content.type] = (distribution[content.type] || 0) + 1;
        totalContent++;
      });
    });
    
    // Convert to percentages
    Object.keys(distribution).forEach(type => {
      distribution[type] = distribution[type] / totalContent;
    });
    
    return distribution;
  }

  calculateEstimatedDuration(courseContent) {
    return courseContent.modules.reduce((total, module) => {
      return total + (module.estimatedTime || this.estimateModuleTime(module));
    }, 0);
  }

  estimateModuleTime(module) {
    const baseTime = 60; // 1 hour base
    const difficultyMultiplier = (module.difficulty || 2) / 2;
    const contentCount = (module.content || []).length;
    
    return baseTime * difficultyMultiplier * Math.max(1, contentCount / 5);
  }

  mapSkillsToContent(courseContent) {
    const skillMap = new Map();
    
    courseContent.modules.forEach(module => {
      if (module.skills) {
        module.skills.forEach(skill => {
          if (!skillMap.has(skill)) {
            skillMap.set(skill, []);
          }
          skillMap.get(skill).push(module.id);
        });
      }
    });
    
    return skillMap;
  }

  sortModulesByOptimalSequence(modules, learningCharacteristics, performanceData) {
    // Sort by prerequisites first, then by learning preferences
    const sorted = [...modules].sort((a, b) => {
      // Check prerequisite relationships
      if (a.prerequisites && a.prerequisites.includes(b.id)) return 1;
      if (b.prerequisites && b.prerequisites.includes(a.id)) return -1;
      
      // Then sort by difficulty progression
      return (a.difficulty || 2) - (b.difficulty || 2);
    });
    
    return sorted;
  }

  generateModuleAdaptations(module, learningCharacteristics) {
    const adaptations = [];
    
    // Learning style adaptations
    const dominantStyle = learningCharacteristics.learningStyle.dominant;
    adaptations.push({
      type: 'learning_style',
      description: `Emphasize ${dominantStyle} learning materials`,
      priority: 'high'
    });
    
    // Pace adaptations
    if (learningCharacteristics.pace.category === 'slow') {
      adaptations.push({
        type: 'pace',
        description: 'Break content into smaller chunks with more practice',
        priority: 'medium'
      });
    }
    
    return adaptations;
  }

  adjustModuleTime(module, learningCharacteristics) {
    let adjustedTime = module.estimatedTime;
    
    // Adjust based on pace
    if (learningCharacteristics.pace.category === 'fast') {
      adjustedTime *= 0.8;
    } else if (learningCharacteristics.pace.category === 'slow') {
      adjustedTime *= 1.3;
    }
    
    // Adjust based on prior knowledge
    if (learningCharacteristics.priorKnowledge.level === 'high') {
      adjustedTime *= 0.9;
    } else if (learningCharacteristics.priorKnowledge.level === 'low') {
      adjustedTime *= 1.2;
    }
    
    return Math.round(adjustedTime);
  }

  identifySupportResources(module, learningCharacteristics) {
    const resources = [];
    
    // Add support based on weaknesses
    learningCharacteristics.weaknesses.forEach(weakness => {
      resources.push({
        type: 'remediation',
        target: weakness,
        description: `Additional resources for ${weakness}`
      });
    });
    
    return resources;
  }

  insertEngagementBoosters(content) {
    // Insert interactive elements every 3-4 content items
    for (let i = 3; i < content.length; i += 4) {
      content.splice(i, 0, {
        type: 'engagement_booster',
        title: 'Quick Check-in',
        duration: 5
      });
    }
  }

  createAdaptiveCheckpoints(modules, learningCharacteristics) {
    const checkpoints = [];
    const interval = Math.ceil(modules.length / 3);
    
    for (let i = interval - 1; i < modules.length; i += interval) {
      checkpoints.push({
        position: i,
        type: 'adaptive_assessment',
        criteria: this.generateAdaptiveCriteria(learningCharacteristics)
      });
    }
    
    return checkpoints;
  }

  createBranchingPaths(modules, learningCharacteristics) {
    // Create alternative paths for different learning scenarios
    return {
      remediation: 'Additional practice for struggling students',
      enrichment: 'Advanced content for high-performing students',
      alternative: 'Different approaches for different learning styles'
    };
  }

  createRemediationLoops(modules, learningCharacteristics) {
    const loops = [];
    
    modules.forEach((module, index) => {
      if (module.difficulty > 2.5) {
        loops.push({
          moduleId: module.id,
          trigger: 'score < 0.7',
          remediationContent: 'Additional practice and review materials'
        });
      }
    });
    
    return loops;
  }

  generateMilestoneRewards(position, totalModules) {
    const rewards = [
      'Digital badge',
      'Certificate of completion',
      'Access to advanced content',
      'Peer recognition'
    ];
    
    return rewards[Math.floor(position / totalModules * rewards.length)];
  }

  calculateCompletionProbability(path, learningCharacteristics) {
    let probability = 0.8; // Base probability
    
    // Adjust based on characteristics
    if (learningCharacteristics.motivationLevel.level === 'high') {
      probability += 0.1;
    } else if (learningCharacteristics.motivationLevel.level === 'low') {
      probability -= 0.2;
    }
    
    if (learningCharacteristics.pace.category === 'normal') {
      probability += 0.05;
    }
    
    if (learningCharacteristics.timeAvailability.limited) {
      probability -= 0.1;
    }
    
    return Math.max(0.3, Math.min(0.95, probability));
  }

  calculateExpectedGrade(path, learningCharacteristics) {
    let baseGrade = 85; // B+ baseline
    
    // Adjust based on prior knowledge
    if (learningCharacteristics.priorKnowledge.level === 'high') {
      baseGrade += 10;
    } else if (learningCharacteristics.priorKnowledge.level === 'low') {
      baseGrade -= 10;
    }
    
    // Adjust based on motivation
    if (learningCharacteristics.motivationLevel.level === 'high') {
      baseGrade += 5;
    } else if (learningCharacteristics.motivationLevel.level === 'low') {
      baseGrade -= 8;
    }
    
    return Math.max(60, Math.min(100, baseGrade));
  }

  calculateSkillMastery(path) {
    return path.modules.reduce((mastery, module) => {
      return mastery + (module.skills ? module.skills.length : 0);
    }, 0);
  }

  calculateExpectedEngagement(path, learningCharacteristics) {
    let engagement = 0.7; // Base engagement
    
    // Adjust based on learning style match
    if (learningCharacteristics.learningStyle.confidence > 0.7) {
      engagement += 0.15;
    }
    
    // Adjust based on motivation
    if (learningCharacteristics.motivationLevel.level === 'high') {
      engagement += 0.1;
    }
    
    return Math.max(0.3, Math.min(1, engagement));
  }

  calculateConfidenceLevel(path, learningCharacteristics) {
    const factors = [
      learningCharacteristics.priorKnowledge.confidence,
      learningCharacteristics.motivationLevel.score,
      learningCharacteristics.learningStyle.confidence
    ];
    
    return this.average(factors);
  }

  defineAdaptationTriggers(learningCharacteristics) {
    return {
      performance: 'score < 0.6 or score > 0.9',
      engagement: 'session_duration < 50% of expected',
      time: 'completion_time > 150% of estimated',
      frustration: 'retry_attempts > 3 or abandonment'
    };
  }

  defineAdaptationRules(learningCharacteristics) {
    return {
      difficulty_adjustment: 'Adjust based on performance and frustration levels',
      content_modification: 'Switch content types based on engagement',
      pace_modification: 'Adjust pace based on completion rates',
      support_provision: 'Provide additional support when struggling'
    };
  }

  getMonitoringFrequency(learningCharacteristics) {
    if (learningCharacteristics.pace.category === 'fast') return 'daily';
    if (learningCharacteristics.pace.category === 'slow') return 'bi-daily';
    return 'every 2 days';
  }

  defineInterventionCriteria(learningCharacteristics) {
    return {
      automatic: 'score < 0.4 for 3 consecutive assessments',
      manual: 'engagement < 0.3 for 1 week',
      alert: 'no progress for 5 days'
    };
  }

  defineProgressMetrics(path) {
    return {
      completion_rate: 'Percentage of completed modules',
      assessment_scores: 'Performance on assessments',
      time_spent: 'Actual vs estimated time',
      engagement_level: 'Interaction with content',
      skill_progression: 'Mastery of targeted skills'
    };
  }

  identifyAssessmentPoints(path) {
    const assessmentPoints = [];
    
    path.modules.forEach((module, index) => {
      if (module.assessmentWeight > 0) {
        assessmentPoints.push({
          moduleId: module.id,
          position: index,
          weight: module.assessmentWeight,
          type: 'module_assessment'
        });
      }
    });
    
    return assessmentPoints;
  }

  defineProgressAlerts(path) {
    return {
      behind_schedule: 'completion_rate < 0.7 of expected',
      struggling: 'assessment_score < 0.6',
      disengaged: 'engagement_level < 0.4 for 3 days',
      at_risk: 'combination of multiple negative indicators'
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
}

module.exports = LearningPathOptimizer;
