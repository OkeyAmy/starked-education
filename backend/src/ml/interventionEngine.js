const moment = require('moment');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

class InterventionRecommendationEngine {
  constructor() {
    this.interventionTypes = {
      academic: {
        tutoring: { priority: 'high', impact: 0.85, cost: 'medium', effectiveness: 0.90 },
        additionalResources: { priority: 'medium', impact: 0.65, cost: 'low', effectiveness: 0.75 },
        studyGroups: { priority: 'medium', impact: 0.70, cost: 'low', effectiveness: 0.80 },
        officeHours: { priority: 'medium', impact: 0.60, cost: 'low', effectiveness: 0.70 },
        adaptiveLearning: { priority: 'high', impact: 0.80, cost: 'high', effectiveness: 0.85 },
        personalizedFeedback: { priority: 'high', impact: 0.75, cost: 'medium', effectiveness: 0.82 },
        microlearning: { priority: 'medium', impact: 0.68, cost: 'low', effectiveness: 0.78 }
      },
      engagement: {
        gamification: { priority: 'medium', impact: 0.75, cost: 'medium', effectiveness: 0.80 },
        socialIntegration: { priority: 'high', impact: 0.70, cost: 'low', effectiveness: 0.75 },
        interactiveContent: { priority: 'medium', impact: 0.65, cost: 'medium', effectiveness: 0.72 },
        mentorship: { priority: 'high', impact: 0.80, cost: 'medium', effectiveness: 0.85 },
        recognition: { priority: 'low', impact: 0.55, cost: 'low', effectiveness: 0.65 },
        progressTracking: { priority: 'medium', impact: 0.62, cost: 'low', effectiveness: 0.70 },
        communityBuilding: { priority: 'high', impact: 0.72, cost: 'low', effectiveness: 0.78 }
      },
      behavioral: {
        timeManagement: { priority: 'medium', impact: 0.70, cost: 'low', effectiveness: 0.75 },
        counseling: { priority: 'high', impact: 0.75, cost: 'medium', effectiveness: 0.82 },
        peerSupport: { priority: 'medium', impact: 0.65, cost: 'low', effectiveness: 0.72 },
        coaching: { priority: 'high', impact: 0.80, cost: 'high', effectiveness: 0.88 },
        selfRegulation: { priority: 'medium', impact: 0.60, cost: 'low', effectiveness: 0.68 },
        motivationalCoaching: { priority: 'high', impact: 0.78, cost: 'medium', effectiveness: 0.83 }
      },
      technical: {
        techSupport: { priority: 'high', impact: 0.70, cost: 'low', effectiveness: 0.78 },
        accessibility: { priority: 'high', impact: 0.75, cost: 'medium', effectiveness: 0.82 },
        training: { priority: 'medium', impact: 0.60, cost: 'low', effectiveness: 0.70 },
        deviceSupport: { priority: 'high', impact: 0.80, cost: 'high', effectiveness: 0.85 }
      }
    };

    this.impactThreshold = 0.25; // 25% improvement target
    this.maxInterventionsPerStudent = 5;
    this.interventionHistory = new Map();
    this.effectivenessTracker = new Map();
    this.combinationStrategies = {
      synergistic: 1.15, // 15% boost for complementary interventions
      sequential: 1.10,  // 10% boost for properly sequenced interventions
      personalized: 1.20   // 20% boost for highly personalized interventions
    };
  }

  async generateInterventions(studentRiskProfile, availableResources = {}) {
    try {
      const studentId = studentRiskProfile.studentId;
      const interventions = [];
      
      // Generate personalized interventions based on risk factors
      const academicInterventions = this.generateAcademicInterventions(studentRiskProfile);
      const engagementInterventions = this.generateEngagementInterventions(studentRiskProfile);
      const behavioralInterventions = this.generateBehavioralInterventions(studentRiskProfile);
      const technicalInterventions = this.generateTechnicalInterventions(studentRiskProfile);

      // Combine all interventions
      interventions.push(...academicInterventions, ...engagementInterventions, ...behavioralInterventions, ...technicalInterventions);

      // Apply combination strategies to maximize effectiveness
      const enhancedInterventions = this.applyCombinationStrategies(interventions, studentRiskProfile);

      // Filter and prioritize interventions based on effectiveness and impact
      const prioritizedInterventions = this.prioritizeInterventions(enhancedInterventions, studentRiskProfile, availableResources);

      // Check for conflicts with previous interventions
      const filteredInterventions = this.filterConflictingInterventions(prioritizedInterventions, studentId);

      // Optimize for 25% improvement target
      const optimizedInterventions = this.optimizeForTargetImprovement(filteredInterventions, studentRiskProfile);

      // Limit number of interventions
      const finalInterventions = optimizedInterventions.slice(0, this.maxInterventionsPerStudent);

      // Store intervention history
      this.recordInterventionHistory(studentId, finalInterventions);

      const expectedImprovement = this.calculateExpectedImprovement(finalInterventions);

      return {
        studentId,
        interventions: finalInterventions,
        expectedImprovement,
        meetsTarget: expectedImprovement.overall >= this.impactThreshold,
        implementationPlan: this.createImplementationPlan(finalInterventions),
        monitoringStrategy: this.createMonitoringStrategy(finalInterventions),
        estimatedCost: this.calculateTotalCost(finalInterventions),
        timeline: this.estimateImplementationTimeline(finalInterventions),
        successProbability: this.calculateSuccessProbability(finalInterventions, studentRiskProfile),
        recommendations: this.generateAdditionalRecommendations(finalInterventions, expectedImprovement)
      };

    } catch (error) {
      console.error('Error generating interventions:', error);
      throw new Error('Failed to generate intervention recommendations');
    }
  }

  applyCombinationStrategies(interventions, riskProfile) {
    const enhancedInterventions = [];
    
    // Group interventions by type for combination analysis
    const groupedInterventions = _.groupBy(interventions, 'type');
    
    Object.keys(groupedInterventions).forEach(type => {
      const typeInterventions = groupedInterventions[type];
      
      // Apply synergistic strategy for complementary interventions
      if (typeInterventions.length >= 2) {
        typeInterventions.forEach(intervention => {
          intervention.combinationBonus = this.combinationStrategies.synergistic;
          intervention.enhancedEffectiveness = intervention.effectiveness * intervention.combinationBonus;
        });
      }
      
      // Apply personalized strategy boost
      const personalizationScore = this.calculatePersonalizationScore(riskProfile);
      typeInterventions.forEach(intervention => {
        if (personalizationScore > 0.7) {
          intervention.personalizationBonus = this.combinationStrategies.personalized;
          intervention.enhancedEffectiveness = (intervention.enhancedEffectiveness || intervention.effectiveness) * 
            (1 + (intervention.personalizationBonus - 1) * personalizationScore);
        }
      });
      
      enhancedInterventions.push(...typeInterventions);
    });
    
    return enhancedInterventions;
  }

  optimizeForTargetImprovement(interventions, riskProfile) {
    // Sort by effectiveness and impact
    const sortedInterventions = _.orderBy(interventions, ['enhancedEffectiveness', 'impact'], ['desc']);
    
    // Select interventions that collectively meet the 25% target
    const selectedInterventions = [];
    let cumulativeImpact = 0;
    
    for (const intervention of sortedInterventions) {
      if (cumulativeImpact >= this.impactThreshold) break;
      
      selectedInterventions.push(intervention);
      cumulativeImpact += intervention.impact * (intervention.enhancedEffectiveness || intervention.effectiveness);
    }
    
    // If still below target, add additional high-impact interventions
    if (cumulativeImpact < this.impactThreshold) {
      const remainingInterventions = sortedInterventions.filter(i => !selectedInterventions.includes(i));
      selectedInterventions.push(...remainingInterventions.slice(0, 2));
    }
    
    return selectedInterventions;
  }

  calculateSuccessProbability(interventions, riskProfile) {
    const baseProbability = 0.75; // 75% base success rate
    const riskMultiplier = Math.max(0.5, 1 - (riskProfile.overall || 0)); // Higher risk reduces success probability
    const interventionQuality = _.mean(interventions.map(i => i.enhancedEffectiveness || i.effectiveness));
    
    return Math.min(0.95, baseProbability * riskMultiplier * interventionQuality);
  }

  generateAdditionalRecommendations(interventions, expectedImprovement) {
    const recommendations = [];
    
    if (expectedImprovement.overall < this.impactThreshold) {
      recommendations.push({
        type: 'additional_interventions',
        message: 'Consider adding more interventions to meet the 25% improvement target',
        priority: 'high'
      });
    }
    
    if (interventions.some(i => i.cost === 'high')) {
      recommendations.push({
        type: 'cost_optimization',
        message: 'Some interventions have high costs - consider phased implementation',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  generateAcademicInterventions(riskProfile) {
    const interventions = [];
    const academicRisk = riskProfile.breakdown.academic;

    // High completion rate issues
    if (academicRisk.factors.completionRate > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'academic',
        category: 'tutoring',
        title: 'Personalized Tutoring Sessions',
        description: 'One-on-one tutoring focused on difficult concepts and assignment completion',
        rationale: 'Low assignment completion rate indicates need for additional academic support',
        expectedImpact: this.interventionTypes.academic.tutoring.impact,
        priority: this.interventionTypes.academic.tutoring.priority,
        cost: this.interventionTypes.academic.tutoring.cost,
        duration: '4-6 weeks',
        frequency: '2 sessions per week',
        resources: ['tutor', 'study materials', 'schedule coordination'],
        successMetrics: ['assignment completion rate', 'grade improvement', 'concept mastery'],
        implementationSteps: [
          'Assess specific knowledge gaps',
          'Match with qualified tutor',
          'Create personalized learning plan',
          'Schedule regular sessions',
          'Monitor progress weekly'
        ]
      });
    }

    // Grade decline issues
    if (academicRisk.factors.gradeDecline > 0.5) {
      interventions.push({
        id: uuidv4(),
        type: 'academic',
        category: 'adaptiveLearning',
        title: 'Adaptive Learning Path',
        description: 'Personalized learning path that adjusts difficulty based on performance',
        rationale: 'Grade decline suggests current content difficulty is mismatched',
        expectedImpact: this.interventionTypes.academic.adaptiveLearning.impact,
        priority: this.interventionTypes.academic.adaptiveLearning.priority,
        cost: this.interventionTypes.academic.adaptiveLearning.cost,
        duration: '8-12 weeks',
        frequency: 'ongoing',
        resources: ['adaptive learning platform', 'content library', 'analytics'],
        successMetrics: ['grade stabilization', 'learning efficiency', 'engagement time'],
        implementationSteps: [
          'Analyze current performance patterns',
          'Configure adaptive learning parameters',
          'Set up personalized content streams',
          'Implement progress tracking',
          'Adjust difficulty based on performance'
        ]
      });
    }

    // Quiz performance issues
    if (academicRisk.factors.quizTrend < -0.3) {
      interventions.push({
        id: uuidv4(),
        type: 'academic',
        category: 'studyGroups',
        title: 'Collaborative Study Groups',
        description: 'Small group study sessions focused on quiz preparation and concept review',
        rationale: 'Declining quiz performance indicates need for collaborative learning',
        expectedImpact: this.interventionTypes.academic.studyGroups.impact,
        priority: this.interventionTypes.academic.studyGroups.priority,
        cost: this.interventionTypes.academic.studyGroups.cost,
        duration: '6-8 weeks',
        frequency: 'weekly',
        resources: ['study space', 'group facilitator', 'practice materials'],
        successMetrics: ['quiz scores', 'participation rate', 'peer feedback'],
        implementationSteps: [
          'Identify students with similar needs',
          'Form balanced study groups',
          'Schedule regular meeting times',
          'Provide structured study materials',
          'Monitor group dynamics and progress'
        ]
      });
    }

    // Skill gaps
    if (academicRisk.factors.skillGaps > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'academic',
        category: 'additionalResources',
        title: 'Targeted Skill Development Resources',
        description: 'Curated learning resources to address specific skill gaps',
        rationale: 'Identified skill gaps require targeted remediation',
        expectedImpact: this.interventionTypes.academic.additionalResources.impact,
        priority: this.interventionTypes.academic.additionalResources.priority,
        cost: this.interventionTypes.academic.additionalResources.cost,
        duration: '4-8 weeks',
        frequency: 'self-paced',
        resources: ['digital resources', 'skill assessments', 'progress tracking'],
        successMetrics: ['skill assessment scores', 'resource utilization', 'confidence levels'],
        implementationSteps: [
          'Conduct detailed skill assessment',
          'Curate relevant learning resources',
          'Create skill development roadmap',
          'Set up progress milestones',
          'Provide regular feedback'
        ]
      });
    }

    return interventions;
  }

  generateEngagementInterventions(riskProfile) {
    const interventions = [];
    const engagementRisk = riskProfile.breakdown.engagement;

    // Low forum participation
    if (engagementRisk.factors.forumDecline > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'engagement',
        category: 'socialIntegration',
        title: 'Community Integration Program',
        description: 'Structured activities to increase social connection and peer interaction',
        rationale: 'Low forum participation indicates social disengagement',
        expectedImpact: this.interventionTypes.engagement.socialIntegration.impact,
        priority: this.interventionTypes.engagement.socialIntegration.priority,
        cost: this.interventionTypes.engagement.socialIntegration.cost,
        duration: '6-10 weeks',
        frequency: 'weekly activities',
        resources: ['community manager', 'discussion prompts', 'social platform'],
        successMetrics: ['forum posts', 'peer connections', 'satisfaction scores'],
        implementationSteps: [
          'Assign community buddy',
          'Create discussion groups',
          'Post engaging discussion prompts',
          'Organize virtual meetups',
          'Recognize active participants'
        ]
      });
    }

    // Low video completion
    if (engagementRisk.factors.videoCompletion > 0.5) {
      interventions.push({
        id: uuidv4(),
        type: 'engagement',
        category: 'interactiveContent',
        title: 'Interactive Content Enhancement',
        description: 'Transform passive video content into interactive learning experiences',
        rationale: 'Low video completion suggests content engagement issues',
        expectedImpact: this.interventionTypes.engagement.interactiveContent.impact,
        priority: this.interventionTypes.engagement.interactiveContent.priority,
        cost: this.interventionTypes.engagement.interactiveContent.cost,
        duration: '4-6 weeks',
        frequency: 'content updates',
        resources: ['interactive content tools', 'video editing', 'learning designers'],
        successMetrics: ['video completion rates', 'interaction rates', 'knowledge retention'],
        implementationSteps: [
          'Analyze current video engagement data',
          'Identify drop-off points',
          'Add interactive elements',
          'Create shorter, focused segments',
          'Implement knowledge checks'
        ]
      });
    }

    // Low motivation
    if (engagementRisk.factors.motivation > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'engagement',
        category: 'gamification',
        title: 'Motivation Gamification System',
        description: 'Game-like elements to increase motivation and engagement',
        rationale: 'Low motivation indicators require external motivation boosters',
        expectedImpact: this.interventionTypes.engagement.gamification.impact,
        priority: this.interventionTypes.engagement.gamification.priority,
        cost: this.interventionTypes.engagement.gamification.cost,
        duration: '8-12 weeks',
        frequency: 'ongoing',
        resources: ['gamification platform', 'reward system', 'leaderboards'],
        successMetrics: ['engagement time', 'achievement unlocks', 'motivation surveys'],
        implementationSteps: [
          'Design gamification framework',
          'Set up achievement system',
          'Create progress tracking',
          'Implement reward mechanisms',
          'Monitor engagement metrics'
        ]
      });
    }

    return interventions;
  }

  generateBehavioralInterventions(riskProfile) {
    const interventions = [];
    const behavioralRisk = riskProfile.breakdown.behavioral;

    // Time management issues
    if (behavioralRisk.factors.timeManagement > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'behavioral',
        category: 'timeManagement',
        title: 'Time Management Training',
        description: 'Structured training program to improve time management and study planning',
        rationale: 'Poor time management contributing to academic difficulties',
        expectedImpact: this.interventionTypes.behavioral.timeManagement.impact,
        priority: this.interventionTypes.behavioral.timeManagement.priority,
        cost: this.interventionTypes.behavioral.timeManagement.cost,
        duration: '4-6 weeks',
        frequency: 'weekly sessions',
        resources: ['time management tools', 'training materials', 'coach'],
        successMetrics: ['assignment timeliness', 'study schedule adherence', 'stress levels'],
        implementationSteps: [
          'Assess current time management skills',
          'Provide time management training',
          'Create personalized study schedules',
          'Implement tracking tools',
          'Review and adjust schedules weekly'
        ]
      });
    }

    // Social isolation
    if (behavioralRisk.factors.socialIsolation > 0.7) {
      interventions.push({
        id: uuidv4(),
        type: 'behavioral',
        category: 'peerSupport',
        title: 'Peer Support Network',
        description: 'Connect student with supportive peers and mentors',
        rationale: 'High social isolation risk requires social connection intervention',
        expectedImpact: this.interventionTypes.behavioral.peerSupport.impact,
        priority: this.interventionTypes.behavioral.peerSupport.priority,
        cost: this.interventionTypes.behavioral.peerSupport.cost,
        duration: '8-10 weeks',
        frequency: 'regular check-ins',
        resources: ['peer mentors', 'support groups', 'communication platform'],
        successMetrics: ['social connections', 'support utilization', 'well-being scores'],
        implementationSteps: [
          'Match with compatible peer mentor',
          'Schedule regular check-ins',
          'Create support group connections',
          'Provide communication tools',
          'Monitor social integration'
        ]
      });
    }

    // Procrastination patterns
    if (behavioralRisk.factors.procrastination > 0.6) {
      interventions.push({
        id: uuidv4(),
        type: 'behavioral',
        category: 'coaching',
        title: 'Behavioral Coaching Program',
        description: 'One-on-one coaching to address procrastination and build self-regulation',
        rationale: 'Procrastination patterns negatively impacting academic performance',
        expectedImpact: this.interventionTypes.behavioral.coaching.impact,
        priority: this.interventionTypes.behavioral.coaching.priority,
        cost: this.interventionTypes.behavioral.coaching.cost,
        duration: '8-12 weeks',
        frequency: 'bi-weekly coaching',
        resources: ['behavioral coach', 'goal-setting tools', 'progress tracking'],
        successMetrics: ['assignment submission timeliness', 'goal achievement', 'self-efficacy'],
        implementationSteps: [
          'Conduct behavioral assessment',
          'Set achievable goals',
          'Implement accountability systems',
          'Provide regular coaching sessions',
          'Track behavior change progress'
        ]
      });
    }

    return interventions;
  }

  generateTechnicalInterventions(riskProfile) {
    const interventions = [];
    // This would be based on technical risk factors if available
    
    // Example technical intervention
    interventions.push({
      id: uuidv4(),
      type: 'technical',
      category: 'techSupport',
      title: 'Technical Support Enhancement',
      description: 'Proactive technical support to ensure smooth learning experience',
      rationale: 'Technical barriers can impede learning progress',
      expectedImpact: this.interventionTypes.technical.techSupport.impact,
      priority: this.interventionTypes.technical.techSupport.priority,
      cost: this.interventionTypes.technical.techSupport.cost,
      duration: 'ongoing',
      frequency: 'as needed',
      resources: ['technical support team', 'help desk', 'troubleshooting guides'],
      successMetrics: ['issue resolution time', 'user satisfaction', 'technical barriers'],
      implementationSteps: [
        'Assess technical needs',
        'Provide dedicated support contact',
        'Create troubleshooting resources',
        'Monitor technical issues',
        'Proactive system checks'
      ]
    });

    return interventions;
  }

  prioritizeInterventions(interventions, riskProfile, availableResources) {
    // Sort by priority and expected impact
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return interventions.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by expected impact
      return b.expectedImpact - a.expectedImpact;
    });
  }

  filterConflictingInterventions(interventions, studentId) {
    const history = this.interventionHistory.get(studentId) || [];
    const recentInterventions = history.filter(i => 
      moment().diff(moment(i.timestamp), 'days') < 30
    );

    return interventions.filter(intervention => {
      // Check if similar intervention was recently implemented
      const hasRecentSimilar = recentInterventions.some(recent => 
        recent.category === intervention.category && 
        recent.type === intervention.type
      );
      
      return !hasRecentSimilar;
    });
  }

  calculateExpectedImprovement(interventions) {
    if (interventions.length === 0) return 0;
    
    // Calculate weighted average of expected impacts
    const totalWeight = interventions.reduce((sum, i) => sum + i.expectedImpact, 0);
    const averageImpact = totalWeight / interventions.length;
    
    // Consider diminishing returns for multiple interventions
    const diminishingFactor = Math.pow(0.9, interventions.length - 1);
    
    return Math.min(averageImpact * diminishingFactor, 0.9); // Cap at 90%
  }

  createImplementationPlan(interventions) {
    const phases = [];
    
    // Phase 1: Immediate interventions (high priority)
    const immediate = interventions.filter(i => i.priority === 'high');
    if (immediate.length > 0) {
      phases.push({
        phase: 1,
        name: 'Immediate Interventions',
        duration: '1-2 weeks',
        interventions: immediate.map(i => i.id),
        description: 'Critical interventions requiring immediate implementation'
      });
    }
    
    // Phase 2: Short-term interventions (medium priority)
    const shortTerm = interventions.filter(i => i.priority === 'medium');
    if (shortTerm.length > 0) {
      phases.push({
        phase: 2,
        name: 'Short-term Support',
        duration: '2-4 weeks',
        interventions: shortTerm.map(i => i.id),
        description: 'Supportive interventions for medium-term improvement'
      });
    }
    
    // Phase 3: Long-term interventions (low priority)
    const longTerm = interventions.filter(i => i.priority === 'low');
    if (longTerm.length > 0) {
      phases.push({
        phase: 3,
        name: 'Long-term Enhancement',
        duration: '4-8 weeks',
        interventions: longTerm.map(i => i.id),
        description: 'Enhancement interventions for sustained success'
      });
    }
    
    return phases;
  }

  createMonitoringStrategy(interventions) {
    const monitoringPoints = [];
    
    interventions.forEach(intervention => {
      monitoringPoints.push({
        interventionId: intervention.id,
        metrics: intervention.successMetrics,
        frequency: this.getMonitoringFrequency(intervention.duration),
        responsible: this.assignResponsibility(intervention.type),
        escalationCriteria: this.defineEscalationCriteria(intervention)
      });
    });
    
    return {
      monitoringPoints,
      reviewSchedule: 'Weekly for first month, then bi-weekly',
      reportingFormat: 'Dashboard updates + monthly summary reports',
      adjustmentProtocol: 'Review and adjust interventions based on progress metrics'
    };
  }

  calculateTotalCost(interventions) {
    const costValues = { 'low': 1, 'medium': 2, 'high': 3 };
    
    const totalCostScore = interventions.reduce((sum, i) => {
      return sum + (costValues[i.cost] || 1);
    }, 0);
    
    return {
      score: totalCostScore,
      level: this.getCostLevel(totalCostScore),
      breakdown: interventions.map(i => ({
        intervention: i.title,
        cost: i.cost,
        score: costValues[i.cost] || 1
      }))
    };
  }

  estimateImplementationTimeline(interventions) {
    const maxDuration = Math.max(...interventions.map(i => this.getDurationInWeeks(i.duration)));
    const minDuration = Math.min(...interventions.map(i => this.getDurationInWeeks(i.duration)));
    
    return {
      minimum: minDuration,
      maximum: maxDuration,
      estimated: Math.ceil((minDuration + maxDuration) / 2),
      phases: this.createImplementationPlan(interventions).length
    };
  }

  recordInterventionHistory(studentId, interventions) {
    if (!this.interventionHistory.has(studentId)) {
      this.interventionHistory.set(studentId, []);
    }
    
    const history = this.interventionHistory.get(studentId);
    interventions.forEach(intervention => {
      history.push({
        ...intervention,
        timestamp: new Date(),
        status: 'planned'
      });
    });
    
    // Keep only last 50 interventions per student
    if (history.length > 50) {
      this.interventionHistory.set(studentId, history.slice(-50));
    }
  }

  // Helper methods
  getMonitoringFrequency(duration) {
    if (duration.includes('1-2') || duration.includes('2-4')) return 'daily';
    if (duration.includes('4-6') || duration.includes('6-8')) return 'weekly';
    return 'bi-weekly';
  }

  assignResponsibility(type) {
    const responsibilities = {
      'academic': 'instructor',
      'engagement': 'community_manager',
      'behavioral': 'counselor',
      'technical': 'tech_support'
    };
    return responsibilities[type] || 'advisor';
  }

  defineEscalationCriteria(intervention) {
    return {
      noProgress: 'No improvement after 2 weeks',
      negativeImpact: 'Metrics decline by more than 10%',
      studentFeedback: 'Negative feedback from student',
      resourceIssues: 'Resource availability problems'
    };
  }

  getCostLevel(score) {
    if (score <= 3) return 'low';
    if (score <= 6) return 'medium';
    return 'high';
  }

  getDurationInWeeks(duration) {
    const match = duration.match(/(\d+)-(\d+)/);
    if (match) {
      return parseInt(match[2]); // Return the higher end of range
    }
    const singleMatch = duration.match(/(\d+)/);
    return singleMatch ? parseInt(singleMatch[1]) : 4;
  }

  // Public method to update intervention status
  updateInterventionStatus(studentId, interventionId, status, outcome = {}) {
    const history = this.interventionHistory.get(studentId) || [];
    const intervention = history.find(i => i.id === interventionId);
    
    if (intervention) {
      intervention.status = status;
      intervention.outcome = outcome;
      intervention.updatedAt = new Date();
    }
  }

  // Public method to get intervention effectiveness
  getInterventionEffectiveness(studentId) {
    const history = this.interventionHistory.get(studentId) || [];
    const completedInterventions = history.filter(i => i.status === 'completed');
    
    if (completedInterventions.length === 0) return 0;
    
    const totalImpact = completedInterventions.reduce((sum, i) => {
      return sum + (i.outcome.actualImpact || i.expectedImpact || 0);
    }, 0);
    
    return totalImpact / completedInterventions.length;
  }
}

module.exports = InterventionRecommendationEngine;
