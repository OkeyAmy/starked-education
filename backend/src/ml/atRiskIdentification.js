const moment = require('moment');
const _ = require('lodash');
const LearningOutcomePredictionEngine = require('./predictionEngine');

class AtRiskStudentIdentification {
  constructor() {
    this.predictionEngine = new LearningOutcomePredictionEngine();
    this.riskThresholds = {
      dropout: 0.6,        // 60% dropout probability (lowered for early detection)
      performance: 0.5,     // 50% chance of poor performance
      engagement: 0.4,     // 40% engagement decline (more sensitive)
      combined: 0.55        // 55% combined risk score (lowered for early warning)
    };
    this.timeWindows = {
      immediate: 7,         // 7 days - immediate intervention
      short: 14,           // 14 days - 2 weeks early detection requirement
      medium: 30,          // 30 days - medium-term intervention
      long: 60             // 60 days - long-term monitoring
    };
    this.earlyWarningIndicators = {
      loginFrequency: { threshold: 0.3, weight: 0.15 },
      assignmentCompletion: { threshold: 0.5, weight: 0.20 },
      gradeDecline: { threshold: 0.25, weight: 0.25 },
      engagementDrop: { threshold: 0.3, weight: 0.15 },
      forumActivity: { threshold: 0.2, weight: 0.10 },
      timeSpentDecline: { threshold: 0.2, weight: 0.15 }
    };
  }

  async initialize() {
    await this.predictionEngine.initializeModels();
  }

  async identifyAtRiskStudents(students, timeWindow = 'short') {
    const atRiskStudents = [];
    const windowDays = this.timeWindows[timeWindow] || this.timeWindows.short;
    
    for (const student of students) {
      const riskAssessment = await this.assessStudentRisk(student, windowDays);
      const earlyWarningScore = await this.calculateEarlyWarningScore(student, windowDays);
      
      // Combine traditional risk assessment with early warning indicators
      const combinedRiskScore = (riskAssessment.overall * 0.6) + (earlyWarningScore * 0.4);
      
      if (combinedRiskScore >= this.riskThresholds.combined || riskAssessment.isAtRisk) {
        atRiskStudents.push({
          studentId: student.id || student._id,
          studentData: student,
          riskAssessment: {
            ...riskAssessment,
            earlyWarningScore,
            combinedRiskScore,
            isAtRisk: true
          },
          interventionUrgency: this.calculateInterventionUrgency(riskAssessment, earlyWarningScore),
          recommendedActions: this.getRecommendedActions(riskAssessment, earlyWarningScore),
          predictionWindow: timeWindow,
          daysUntilPotentialDropout: this.estimateDaysUntilDropout(combinedRiskScore, windowDays)
        });
      }
    }

    // Sort by urgency (highest first)
    return _.orderBy(atRiskStudents, ['interventionUrgency.score'], ['desc']);
  }

  async calculateEarlyWarningScore(student, windowDays) {
    const indicators = this.earlyWarningIndicators;
    let totalScore = 0;
    const detectedIndicators = [];

    // Check each early warning indicator
    Object.keys(indicators).forEach(indicator => {
      const config = indicators[indicator];
      const score = this.evaluateIndicator(student, indicator, config.threshold, windowDays);
      
      if (score > 0) {
        totalScore += score * config.weight;
        detectedIndicators.push({
          indicator,
          score,
          threshold: config.threshold,
          weight: config.weight
        });
      }
    });

    return {
      overall: Math.min(totalScore, 1),
      indicators: detectedIndicators,
      needsImmediateAttention: totalScore > 0.7
    };
  }

  evaluateIndicator(student, indicator, threshold, windowDays) {
    switch (indicator) {
      case 'loginFrequency':
        const loginFrequency = this.getLoginFrequency(student, windowDays);
        return loginFrequency < threshold ? (1 - loginFrequency) : 0;
        
      case 'assignmentCompletion':
        const completionRate = this.getAssignmentCompletionRate(student, windowDays);
        return completionRate < threshold ? (1 - completionRate) : 0;
        
      case 'gradeDecline':
        const gradeTrend = this.getGradeTrend(student, windowDays);
        return Math.abs(gradeTrend) > threshold ? Math.abs(gradeTrend) : 0;
        
      case 'engagementDrop':
        const engagementTrend = this.getEngagementTrend(student, windowDays);
        return engagementTrend < -threshold ? Math.abs(engagementTrend) : 0;
        
      case 'forumActivity':
        const forumActivity = this.getForumActivity(student, windowDays);
        return forumActivity < threshold ? (1 - forumActivity) : 0;
        
      case 'timeSpentDecline':
        const timeTrend = this.getTimeSpentTrend(student, windowDays);
        return timeTrend < -threshold ? Math.abs(timeTrend) : 0;
        
      default:
        return 0;
    }
  }

  estimateDaysUntilDropout(riskScore, windowDays) {
    if (riskScore < 0.3) return null; // Low risk, no immediate concern
    
    // Estimate based on risk score and time window
    const urgencyFactor = Math.max(0, (riskScore - 0.3) / 0.7); // Normalize to 0-1
    const estimatedDays = Math.ceil(windowDays * (1 - urgencyFactor * 0.8));
    
    return Math.max(1, estimatedDays); // At least 1 day
  }

  async assessStudentRisk(student, windowDays) {
    try {
      // Get ML predictions
      const predictions = await this.predictionEngine.predictStudentOutcomes(student);
      
      // Calculate time-based risk factors
      const temporalRisk = this.calculateTemporalRisk(student, windowDays);
      
      // Calculate behavioral risk factors
      const behavioralRisk = this.calculateBehavioralRisk(student);
      
      // Calculate academic risk factors
      const academicRisk = this.calculateAcademicRisk(student);
      
      // Calculate engagement risk factors
      const engagementRisk = this.calculateEngagementRisk(student);
      
      // Combine all risk factors
      const combinedRisk = this.combineRiskFactors({
        predictions,
        temporalRisk,
        behavioralRisk,
        academicRisk,
        engagementRisk
      });

      return {
        isAtRisk: combinedRisk.overall >= this.riskThresholds.combined,
        overall: combinedRisk.overall,
        breakdown: {
          predictions: predictions.riskAssessment,
          temporal: temporalRisk,
          behavioral: behavioralRisk,
          academic: academicRisk,
          engagement: engagementRisk
        },
        riskFactors: this.identifyKeyRiskFactors(combinedRisk),
        timeToDropout: this.estimateTimeToDropout(predictions, temporalRisk),
        confidence: predictions.confidence
      };

    } catch (error) {
      console.error('Error assessing student risk:', error);
      return {
        isAtRisk: false,
        overall: 0,
        error: error.message
      };
    }
  }

  calculateTemporalRisk(student, windowDays) {
    const now = moment();
    const riskFactors = {};

    // Last login risk
    const lastLogin = student.lastLogin ? moment(student.lastLogin) : null;
    if (lastLogin) {
      const daysSinceLogin = now.diff(lastLogin, 'days');
      riskFactors.lastLogin = Math.min(daysSinceLogin / windowDays, 1);
    } else {
      riskFactors.lastLogin = 1; // Never logged in
    }

    // Activity frequency risk
    const recentActivity = this.getRecentActivityCount(student, windowDays);
    const expectedActivity = windowDays * 0.5; // Expect activity every 2 days
    riskFactors.activityFrequency = Math.max(0, 1 - (recentActivity / expectedActivity));

    // Assignment completion trend
    const assignmentTrend = this.getAssignmentTrend(student, windowDays);
    riskFactors.assignmentTrend = assignmentTrend < -0.2 ? 0.8 : 0;

    // Progress stagnation
    const progressStagnation = this.getProgressStagnation(student, windowDays);
    riskFactors.progressStagnation = progressStagnation;

    // Session duration decline
    const sessionDecline = this.getSessionDurationDecline(student, windowDays);
    riskFactors.sessionDecline = sessionDecline;

    // Weight and combine temporal risks
    const weights = {
      lastLogin: 0.3,
      activityFrequency: 0.25,
      assignmentTrend: 0.2,
      progressStagnation: 0.15,
      sessionDecline: 0.1
    };

    const overall = Object.keys(riskFactors).reduce((sum, factor) => {
      return sum + (riskFactors[factor] * weights[factor]);
    }, 0);

    return {
      overall: Math.min(overall, 1),
      factors: riskFactors,
      level: this.getRiskLevel(overall)
    };
  }

  calculateBehavioralRisk(student) {
    const riskFactors = {};

    // Login pattern irregularity
    riskFactors.loginIrregularity = this.calculateLoginIrregularity(student);

    // Help seeking behavior (too little or too much)
    riskFactors.helpSeekingPattern = this.analyzeHelpSeekingPattern(student);

    // Social isolation
    riskFactors.socialIsolation = this.assessSocialIsolation(student);

    // Procrastination patterns
    riskFactors.procrastination = this.identifyProcrastinationPatterns(student);

    // Time management issues
    riskFactors.timeManagement = this.assessTimeManagement(student);

    const weights = {
      loginIrregularity: 0.2,
      helpSeekingPattern: 0.25,
      socialIsolation: 0.2,
      procrastination: 0.2,
      timeManagement: 0.15
    };

    const overall = Object.keys(riskFactors).reduce((sum, factor) => {
      return sum + (riskFactors[factor] * weights[factor]);
    }, 0);

    return {
      overall: Math.min(overall, 1),
      factors: riskFactors,
      level: this.getRiskLevel(overall)
    };
  }

  calculateAcademicRisk(student) {
    const riskFactors = {};

    // Grade decline
    riskFactors.gradeDecline = this.calculateGradeDecline(student);

    // Assignment completion rate
    const completionRate = this.getAssignmentCompletionRate(student);
    riskFactors.completionRate = Math.max(0, 1 - completionRate);

    // Quiz performance trend
    riskFactors.quizTrend = this.getQuizPerformanceTrend(student);

    // Difficulty with recent topics
    riskFactors.topicDifficulty = this.assessRecentTopicDifficulty(student);

    // Skill gaps
    riskFactors.skillGaps = this.identifySkillGaps(student);

    const weights = {
      gradeDecline: 0.3,
      completionRate: 0.25,
      quizTrend: 0.2,
      topicDifficulty: 0.15,
      skillGaps: 0.1
    };

    const overall = Object.keys(riskFactors).reduce((sum, factor) => {
      return sum + (riskFactors[factor] * weights[factor]);
    }, 0);

    return {
      overall: Math.min(overall, 1),
      factors: riskFactors,
      level: this.getRiskLevel(overall)
    };
  }

  calculateEngagementRisk(student) {
    const riskFactors = {};

    // Forum participation decline
    riskFactors.forumDecline = this.getForumParticipationDecline(student);

    // Video completion rate
    const videoCompletion = this.getVideoCompletionRate(student);
    riskFactors.videoCompletion = Math.max(0, 1 - videoCompletion);

    // Peer interaction
    riskFactors.peerInteraction = this.assessPeerInteraction(student);

    // Content interaction depth
    riskFactors.contentInteraction = this.assessContentInteraction(student);

    // Motivation indicators
    riskFactors.motivation = this.assessMotivationIndicators(student);

    const weights = {
      forumDecline: 0.25,
      videoCompletion: 0.2,
      peerInteraction: 0.2,
      contentInteraction: 0.2,
      motivation: 0.15
    };

    const overall = Object.keys(riskFactors).reduce((sum, factor) => {
      return sum + (riskFactors[factor] * weights[factor]);
    }, 0);

    return {
      overall: Math.min(overall, 1),
      factors: riskFactors,
      level: this.getRiskLevel(overall)
    };
  }

  combineRiskFactors(riskData) {
    const weights = {
      predictions: 0.4,      // ML predictions have highest weight
      temporal: 0.25,        // Recent behavior patterns
      academic: 0.2,         // Academic performance
      behavioral: 0.1,       // Behavioral patterns
      engagement: 0.05       // Engagement metrics
    };

    const combinedRisk = {
      overall: 0,
      components: {}
    };

    // Combine dropout risk from predictions
    combinedRisk.components.predictions = riskData.predictions.riskAssessment.overall;
    
    // Combine temporal risk
    combinedRisk.components.temporal = riskData.temporal.overall;
    
    // Combine academic risk
    combinedRisk.components.academic = riskData.academic.overall;
    
    // Combine behavioral risk
    combinedRisk.components.behavioral = riskData.behavioral.overall;
    
    // Combine engagement risk
    combinedRisk.components.engagement = riskData.engagement.overall;

    // Calculate weighted overall risk
    combinedRisk.overall = Object.keys(combinedRisk.components).reduce((sum, component) => {
      return sum + (combinedRisk.components[component] * weights[component]);
    }, 0);

    return combinedRisk;
  }

  calculateInterventionUrgency(riskAssessment) {
    let urgencyScore = 0;
    let urgencyLevel = 'low';
    let timeframe = 'long-term';

    // Base urgency from overall risk
    urgencyScore += riskAssessment.overall * 40;

    // Urgency from specific high-risk factors
    if (riskAssessment.breakdown.predictions.dropout > 0.8) {
      urgencyScore += 30;
      timeframe = 'immediate';
    }

    if (riskAssessment.breakdown.temporal.lastLogin > 0.9) {
      urgencyScore += 25;
      timeframe = 'immediate';
    }

    if (riskAssessment.breakdown.academic.completionRate > 0.8) {
      urgencyScore += 20;
      timeframe = 'short-term';
    }

    if (riskAssessment.breakdown.behavioral.socialIsolation > 0.7) {
      urgencyScore += 15;
      timeframe = 'short-term';
    }

    // Determine urgency level
    if (urgencyScore >= 80) {
      urgencyLevel = 'critical';
      timeframe = 'immediate';
    } else if (urgencyScore >= 60) {
      urgencyLevel = 'high';
      timeframe = 'short-term';
    } else if (urgencyScore >= 40) {
      urgencyLevel = 'medium';
      timeframe = 'medium-term';
    } else {
      urgencyLevel = 'low';
      timeframe = 'long-term';
    }

    return {
      score: Math.min(urgencyScore, 100),
      level: urgencyLevel,
      timeframe,
      recommendedResponseTime: this.getResponseTime(timeframe)
    };
  }

  getRecommendedActions(riskAssessment) {
    const actions = [];

    // High dropout risk actions
    if (riskAssessment.breakdown.predictions.dropout > 0.7) {
      actions.push({
        type: 'immediate_contact',
        priority: 'high',
        description: 'Immediate personal outreach from instructor or advisor',
        timeframe: '24-48 hours'
      });
    }

    // Academic support actions
    if (riskAssessment.breakdown.academic.completionRate > 0.6) {
      actions.push({
        type: 'academic_support',
        priority: 'high',
        description: 'Schedule tutoring session and review assignment difficulties',
        timeframe: '3-5 days'
      });
    }

    // Engagement actions
    if (riskAssessment.breakdown.engagement.overall > 0.6) {
      actions.push({
        type: 'engagement_intervention',
        priority: 'medium',
        description: 'Assign study buddy and increase interactive content',
        timeframe: '1 week'
      });
    }

    // Behavioral interventions
    if (riskAssessment.breakdown.behavioral.socialIsolation > 0.7) {
      actions.push({
        type: 'social_integration',
        priority: 'medium',
        description: 'Invite to study groups and virtual office hours',
        timeframe: '1 week'
      });
    }

    // Time management support
    if (riskAssessment.breakdown.behavioral.timeManagement > 0.6) {
      actions.push({
        type: 'time_management',
        priority: 'low',
        description: 'Provide time management tools and study planning resources',
        timeframe: '2 weeks'
      });
    }

    // Motivation boost
    if (riskAssessment.breakdown.engagement.motivation > 0.5) {
      actions.push({
        type: 'motivation_boost',
        priority: 'low',
        description: 'Highlight achievements and set short-term goals',
        timeframe: '1 week'
      });
    }

    return actions;
  }

  identifyKeyRiskFactors(combinedRisk) {
    const keyFactors = [];
    const threshold = 0.6;

    Object.keys(combinedRisk.components).forEach(component => {
      if (combinedRisk.components[component] > threshold) {
        keyFactors.push({
          type: component,
          severity: combinedRisk.components[component],
          description: this.getRiskFactorDescription(component, combinedRisk.components[component])
        });
      }
    });

    return _.orderBy(keyFactors, ['severity'], ['desc']);
  }

  estimateTimeToDropout(predictions, temporalRisk) {
    const dropoutRisk = predictions.riskAssessment.dropout;
    const temporalFactor = temporalRisk.overall;
    
    // Base estimation on dropout probability
    let estimatedDays = 30; // Base: 1 month
    
    if (dropoutRisk > 0.9) {
      estimatedDays = 7; // 1 week
    } else if (dropoutRisk > 0.8) {
      estimatedDays = 14; // 2 weeks
    } else if (dropoutRisk > 0.7) {
      estimatedDays = 21; // 3 weeks
    } else if (dropoutRisk > 0.6) {
      estimatedDays = 30; // 1 month
    } else {
      estimatedDays = 60; // 2 months
    }

    // Adjust based on temporal risk
    if (temporalFactor > 0.8) {
      estimatedDays *= 0.5; // Halve the time
    } else if (temporalFactor > 0.6) {
      estimatedDays *= 0.75; // Reduce by 25%
    }

    return Math.max(7, Math.round(estimatedDays)); // Minimum 1 week
  }

  // Helper methods for risk calculation
  getRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    if (riskScore >= 0.2) return 'low';
    return 'minimal';
  }

  getResponseTime(timeframe) {
    const responseTimes = {
      'immediate': 'Within 24 hours',
      'short-term': 'Within 3-5 days',
      'medium-term': 'Within 1-2 weeks',
      'long-term': 'Within 1 month'
    };
    return responseTimes[timeframe] || 'Within 1 month';
  }

  getRiskFactorDescription(factor, severity) {
    const descriptions = {
      predictions: `ML models indicate ${Math.round(severity * 100)}% probability of negative outcome`,
      temporal: `Recent activity patterns show concerning trends (${Math.round(severity * 100)}% risk)`,
      academic: `Academic performance indicators suggest difficulty (${Math.round(severity * 100)}% risk)`,
      behavioral: `Behavioral patterns indicate potential issues (${Math.round(severity * 100)}% risk)`,
      engagement: `Engagement metrics show declining interest (${Math.round(severity * 100)}% risk)`
    };
    return descriptions[factor] || `Risk factor detected: ${Math.round(severity * 100)}%`;
  }

  // Simplified implementations for data extraction methods
  getRecentActivityCount(student, days) {
    // This would typically query the database for recent activities
    return student.recentActivityCount || Math.floor(Math.random() * days);
  }

  getAssignmentTrend(student, days) {
    // Calculate trend in assignment completion over time
    return student.assignmentTrend || -0.1;
  }

  getProgressStagnation(student, days) {
    // Check if progress has stalled
    return student.progressStagnation || 0.3;
  }

  getSessionDurationDecline(student, days) {
    // Calculate decline in session duration
    return student.sessionDecline || 0.2;
  }

  calculateLoginIrregularity(student) {
    // Analyze login pattern consistency
    return student.loginIrregularity || 0.4;
  }

  analyzeHelpSeekingPattern(student) {
    // Analyze help-seeking behavior
    return student.helpSeekingPattern || 0.3;
  }

  assessSocialIsolation(student) {
    // Assess social connection levels
    return student.socialIsolation || 0.5;
  }

  identifyProcrastinationPatterns(student) {
    // Identify procrastination in assignment submission
    return student.procrastination || 0.6;
  }

  assessTimeManagement(student) {
    // Assess time management skills
    return student.timeManagement || 0.4;
  }

  calculateGradeDecline(student) {
    // Calculate trend in grades over time
    return student.gradeDecline || 0.3;
  }

  getAssignmentCompletionRate(student) {
    return student.assignmentCompletionRate || 0.8;
  }

  getQuizPerformanceTrend(student) {
    return student.quizTrend || -0.1;
  }

  assessRecentTopicDifficulty(student) {
    return student.topicDifficulty || 0.4;
  }

  identifySkillGaps(student) {
    return student.skillGaps || 0.3;
  }

  getForumParticipationDecline(student) {
    return student.forumDecline || 0.5;
  }

  getVideoCompletionRate(student) {
    return student.videoCompletionRate || 0.7;
  }

  assessPeerInteraction(student) {
    return student.peerInteraction || 0.6;
  }

  assessContentInteraction(student) {
    return student.contentInteraction || 0.5;
  }

  assessMotivationIndicators(student) {
    return student.motivation || 0.4;
  }
}

module.exports = AtRiskStudentIdentification;
