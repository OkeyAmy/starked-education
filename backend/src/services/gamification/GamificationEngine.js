const EventEmitter = require('events');
const Achievement = require('../models/Achievement');
const PointTransaction = require('../models/PointTransaction');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const Challenge = require('../models/Challenge');
const logger = require('../../utils/logger');

/**
 * Gamification Engine
 * Core backend engine for managing points, badges, achievements, and leaderboards
 */
class GamificationEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      pointSystem: {
        lessonComplete: 10,
        quizComplete: 20,
        perfectQuizScore: 50,
        streakBonus: 5,
        challengeComplete: 100,
        socialShare: 5,
        ...config.pointSystem
      },
      levelThresholds: this.generateLevelThresholds(),
      achievementRules: config.achievementRules || [],
      ...config
    };

    this.activeChallenges = new Map();
    this.leaderboardCache = new Map();
    this.achievementTemplates = this.initializeAchievementTemplates();
  }

  /**
   * Generate level thresholds (exponential scaling)
   */
  generateLevelThresholds() {
    const thresholds = [];
    for (let level = 1; level <= 100; level++) {
      thresholds[level] = Math.floor(100 * Math.pow(1.5, level - 1));
    }
    return thresholds;
  }

  /**
   * Initialize achievement templates
   */
  initializeAchievementTemplates() {
    return [
      // Learning achievements
      {
        badgeId: 'first_lesson',
        name: 'First Steps',
        description: 'Complete your first lesson',
        icon: '🎯',
        rarity: 'common',
        category: 'learning',
        trigger: { event: 'lesson_completed', count: 1 },
        points: 10
      },
      {
        badgeId: 'lesson_master',
        name: 'Lesson Master',
        description: 'Complete 50 lessons',
        icon: '📚',
        rarity: 'epic',
        category: 'learning',
        trigger: { event: 'lesson_completed', count: 50 },
        points: 200
      },
      
      // Streak achievements
      {
        badgeId: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        rarity: 'rare',
        category: 'streak',
        trigger: { event: 'streak_milestone', days: 7 },
        points: 50
      },
      {
        badgeId: 'month_mentality',
        name: 'Month Mentality',
        description: 'Maintain a 30-day learning streak',
        icon: '⚡',
        rarity: 'epic',
        category: 'streak',
        trigger: { event: 'streak_milestone', days: 30 },
        points: 150
      },
      
      // Quiz achievements
      {
        badgeId: 'quiz_novice',
        name: 'Quiz Novice',
        description: 'Complete 10 quizzes',
        icon: '✏️',
        rarity: 'common',
        category: 'learning',
        trigger: { event: 'quiz_completed', count: 10 },
        points: 30
      },
      {
        badgeId: 'perfect_score',
        name: 'Perfect Score',
        description: 'Get 100% on a quiz',
        icon: '💯',
        rarity: 'rare',
        category: 'learning',
        trigger: { event: 'quiz_perfect_score', count: 1 },
        points: 50
      },
      
      // Level achievements
      {
        badgeId: 'level_5',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        rarity: 'common',
        category: 'level',
        trigger: { event: 'level_reached', level: 5 },
        points: 25
      },
      {
        badgeId: 'level_20',
        name: 'Expert Learner',
        description: 'Reach level 20',
        icon: '🌟',
        rarity: 'epic',
        category: 'level',
        trigger: { event: 'level_reached', level: 20 },
        points: 100
      },
      
      // Social achievements
      {
        badgeId: 'helper',
        name: 'Community Helper',
        description: 'Help 20 fellow students',
        icon: '🤝',
        rarity: 'legendary',
        category: 'social',
        trigger: { event: 'helped_peer', count: 20 },
        points: 250
      }
    ];
  }

  /**
   * Award points to user
   */
  async awardPoints(userId, amount, category, description, metadata = {}) {
    try {
      // Get current balance
      const latestTransaction = await PointTransaction.findOne({ userId })
        .sort({ createdAt: -1 });
      
      const currentBalance = latestTransaction ? latestTransaction.balance : 0;
      const newBalance = currentBalance + amount;

      // Create transaction
      const transaction = await PointTransaction.create({
        userId,
        amount,
        type: amount > 0 ? 'earned' : 'spent',
        category,
        description,
        balance: newBalance,
        metadata
      });

      // Update leaderboard
      await this.updateLeaderboardEntry(userId);

      // Check for point-based achievements
      await this.checkPointAchievements(userId, newBalance);

      logger.info(`Points awarded: ${userId} ${amount > 0 ? '+' : ''}${amount} (${description})`);
      this.emit('pointsAwarded', { userId, amount, category, newBalance });

      return transaction;
    } catch (error) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Process event and check for achievement unlocks
   */
  async processEvent(userId, event, data = {}) {
    try {
      logger.debug(`Processing gamification event: ${event} for user ${userId}`);

      // Check all achievement templates
      const unlockedAchievements = [];

      for (const template of this.achievementTemplates) {
        if (this._matchesTrigger(event, data, template.trigger)) {
          const achieved = await this.unlockAchievement(userId, template);
          if (achieved) {
            unlockedAchievements.push(achieved);
          }
        }
      }

      // Award points based on event type
      await this._awardEventPoints(userId, event, data);

      // Update relevant counters
      await this._updateUserProgress(userId, event, data);

      if (unlockedAchievements.length > 0) {
        this.emit('achievementsUnlocked', { userId, achievements: unlockedAchievements });
      }

      return { unlockedAchievements };
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  /**
   * Unlock achievement for user
   */
  async unlockAchievement(userId, template) {
    try {
      // Check if already earned
      const existing = await Achievement.findOne({ 
        userId, 
        badgeId: template.badgeId 
      });

      if (existing && existing.isEarned) {
        return null; // Already earned
      }

      if (existing) {
        // Update progress
        existing.progress.current = template.trigger.count || 1;
        existing.isEarned = true;
        existing.earnedDate = new Date();
        await existing.save();
        return existing;
      }

      // Create new achievement
      const achievement = await Achievement.create({
        userId,
        badgeId: template.badgeId,
        name: template.name,
        description: template.description,
        icon: template.icon,
        rarity: template.rarity,
        category: template.category,
        points: template.points,
        progress: {
          current: template.trigger.count || 1,
          max: template.trigger.count || 1
        },
        isEarned: true,
        earnedDate: new Date()
      });

      // Award achievement points
      await this.awardPoints(
        userId, 
        template.points, 
        'achievement', 
        `Unlocked: ${template.name}`,
        { achievementId: template.badgeId }
      );

      logger.info(`Achievement unlocked: ${userId} - ${template.name}`);
      return achievement;
    } catch (error) {
      logger.error('Error unlocking achievement:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard entry for user
   */
  async updateLeaderboardEntry(userId, userData = {}) {
    try {
      // Calculate user statistics
      const totalPoints = await this.getUserTotalPoints(userId);
      const achievementsCount = await Achievement.countDocuments({ userId, isEarned: true });
      
      // Get or create leaderboard entry
      let entry = await LeaderboardEntry.findOne({ userId, category: 'global' });

      if (!entry) {
        entry = await LeaderboardEntry.create({
          userId,
          username: userData.username || `User_${userId.slice(0, 8)}`,
          avatar: userData.avatar,
          points: totalPoints,
          level: this.calculateLevel(totalPoints),
          streak: userData.streak || 0,
          badgesEarned: achievementsCount,
          coursesCompleted: userData.coursesCompleted || 0,
          category: 'global'
        });
      } else {
        const previousRank = entry.rank;
        
        entry.points = totalPoints;
        entry.level = this.calculateLevel(totalPoints);
        entry.badgesEarned = achievementsCount;
        entry.previousRank = previousRank;
        
        await entry.save();
      }

      // Recalculate ranks
      await this.recalculateRanks('global');

      return entry;
    } catch (error) {
      logger.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard with pagination
   */
  async getLeaderboard(category = 'global', categoryId = null, page = 1, limit = 50) {
    try {
      const query = { category };
      if (categoryId) query.categoryId = categoryId;

      const entries = await LeaderboardEntry.find(query)
        .sort({ points: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // Calculate rank changes
      const enrichedEntries = entries.map((entry, index) => ({
        ...entry.toObject(),
        rank: (page - 1) * limit + index + 1,
        rankChange: entry.previousRank ? entry.rank - entry.previousRank : 0
      }));

      return enrichedEntries;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Calculate user level from total points
   */
  calculateLevel(totalPoints) {
    for (let level = 100; level >= 1; level--) {
      if (totalPoints >= this.config.levelThresholds[level]) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Get user's total points
   */
  async getUserTotalPoints(userId) {
    const result = await PointTransaction.aggregate([
      { $match: { userId } },
      { $group: { _id: '$userId', total: { $sum: '$amount' } } }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Check point-based achievements
   */
  async checkPointAchievements(userId, totalPoints) {
    const milestones = [100, 500, 1000, 5000, 10000];
    
    for (const milestone of milestones) {
      if (totalPoints >= milestone) {
        await this.unlockAchievement(userId, {
          badgeId: `points_${milestone}`,
          name: `Point Collector`,
          description: `Earn ${milestone} points`,
          icon: '💎',
          rarity: milestone >= 5000 ? 'legendary' : 'epic',
          category: 'milestone',
          points: milestone / 10,
          trigger: { event: 'points_milestone', threshold: milestone }
        });
      }
    }
  }

  /**
   * Recalculate ranks for category
   */
  async recalculateRanks(category) {
    const entries = await LeaderboardEntry.find({ category }).sort({ points: -1 });
    
    const updateOps = entries.map((entry, index) => ({
      updateOne: {
        filter: { _id: entry._id },
        update: { rank: index + 1 }
      }
    }));

    if (updateOps.length > 0) {
      await LeaderboardEntry.bulkWrite(updateOps);
    }
  }

  /**
   * Match event against trigger conditions
   */
  _matchesTrigger(event, data, trigger) {
    if (trigger.event !== event) return false;
    
    if (trigger.count && (!data.count || data.count < trigger.count)) return false;
    if (trigger.days && (!data.days || data.days < trigger.days)) return false;
    if (trigger.level && (!data.level || data.level < trigger.level)) return false;

    return true;
  }

  /**
   * Award points based on event type
   */
  async _awardEventPoints(userId, event, data) {
    const pointMappings = {
      'lesson_completed': { points: this.config.pointSystem.lessonComplete, category: 'lesson' },
      'quiz_completed': { points: this.config.pointSystem.quizComplete, category: 'quiz' },
      'quiz_perfect_score': { points: this.config.pointSystem.perfectQuizScore, category: 'quiz' },
      'challenge_completed': { points: this.config.pointSystem.challengeComplete, category: 'challenge' },
      'social_share': { points: this.config.pointSystem.socialShare, category: 'social' }
    };

    const mapping = pointMappings[event];
    if (mapping) {
      let bonusPoints = mapping.points;
      
      // Apply streak bonus
      if (data.streak && data.streak > 0) {
        bonusPoints += this.config.pointSystem.streakBonus * data.streak;
      }

      await this.awardPoints(
        userId, 
        bonusPoints, 
        mapping.category, 
        `Event: ${event}`,
        data
      );
    }
  }

  /**
   * Update user progress tracking
   */
  async _updateUserProgress(userId, event, data) {
    // Track progress toward achievements that aren't yet earned
    const partialAchievements = await Achievement.find({ 
      userId, 
      isEarned: false 
    });

    for (const achievement of partialAchievements) {
      const template = this.achievementTemplates.find(
        t => t.badgeId === achievement.badgeId
      );

      if (template && this._matchesProgress(event, data, template.trigger)) {
        achievement.progress.current = (achievement.progress.current || 0) + 1;
        
        if (achievement.progress.current >= achievement.progress.max) {
          achievement.isEarned = true;
          achievement.earnedDate = new Date();
        }
        
        await achievement.save();
      }
    }
  }

  /**
   * Check if event matches progress tracking
   */
  _matchesProgress(event, data, trigger) {
    return trigger.event === event && trigger.count && trigger.count > 1;
  }
}

module.exports = GamificationEngine;
