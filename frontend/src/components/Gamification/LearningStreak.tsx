'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Calendar, Target, Zap, Award, TrendingUp, Clock } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakHistory: {
    date: string;
    active: boolean;
    pointsEarned?: number;
    timeSpent?: number;
  }[];
  nextMilestone: number;
  milestoneReward: string;
  streakFreezeUsed: boolean;
  streakFreezeAvailable: boolean;
}

interface LearningStreakProps {
  streakData: StreakData;
  onStreakUpdate?: (newStreak: number) => void;
  compact?: boolean;
  showHistory?: boolean;
  showMilestones?: boolean;
}

const MILESTONES = [
  { days: 7, reward: 'Week Warrior Badge', color: 'from-green-400 to-green-600' },
  { days: 14, reward: 'Fortnight Fighter Badge', color: 'from-blue-400 to-blue-600' },
  { days: 30, reward: 'Monthly Master Badge', color: 'from-purple-400 to-purple-600' },
  { days: 60, reward: 'Two Month Titan Badge', color: 'from-red-400 to-red-600' },
  { days: 100, reward: 'Century Champion Badge', color: 'from-amber-400 to-amber-600' },
  { days: 365, reward: 'Yearly Legend Badge', color: 'from-indigo-400 to-indigo-600' }
];

const STREAK_MESSAGES = [
  "Great job! Keep it going! 🔥",
  "You're on fire! 🔥🔥",
  "Unstoppable! 🔥🔥🔥",
  "Legendary streak! 🔥🔥🔥🔥"
];

export function LearningStreak({
  streakData,
  onStreakUpdate,
  compact = false,
  showHistory = true,
  showMilestones = true
}: LearningStreakProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate streak status
  const streakStatus = useMemo(() => {
    const today = new Date();
    const lastActive = new Date(streakData.lastActiveDate);
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isActive: daysDiff <= 1,
      daysDiff,
      willBreakTomorrow: daysDiff === 1,
      isBroken: daysDiff > 1
    };
  }, [streakData.lastActiveDate]);

  // Get current milestone
  const currentMilestone = useMemo(() => {
    return MILESTONES.find(m => m.days === streakData.nextMilestone) || MILESTONES[0];
  }, [streakData.nextMilestone]);

  // Get progress to next milestone
  const milestoneProgress = useMemo(() => {
    const prevMilestone = MILESTONES.filter(m => m.days < streakData.nextMilestone).pop();
    const prevDays = prevMilestone ? prevMilestone.days : 0;
    const progress = ((streakData.currentStreak - prevDays) / (streakData.nextMilestone - prevDays)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, [streakData.currentStreak, streakData.nextMilestone]);

  // Get motivational message
  const getMessage = () => {
    if (streakStatus.isBroken) {
      return "Your streak was broken. Start a new one today!";
    }
    if (streakStatus.willBreakTomorrow) {
      return "Complete a lesson today to keep your streak alive!";
    }
    const messageIndex = Math.min(Math.floor(streakData.currentStreak / 7), STREAK_MESSAGES.length - 1);
    return STREAK_MESSAGES[messageIndex];
  };

  // Trigger celebration animation
  useEffect(() => {
    if (streakData.currentStreak > 0 && streakData.currentStreak % 7 === 0) {
      setShowCelebration(true);
      setIsAnimating(true);
      setTimeout(() => setShowCelebration(false), 3000);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  }, [streakData.currentStreak]);

  if (compact) {
    return (
      <motion.div
        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          streakStatus.isActive 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' 
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600'
        }`}
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          animate={isAnimating ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Flame className={`h-6 w-6 ${streakStatus.isActive ? 'text-orange-500' : 'text-gray-400'}`} />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white">
              {streakData.currentStreak}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              day streak
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getMessage()}
          </div>
        </div>
        {!streakStatus.isActive && streakData.streakFreezeAvailable && (
          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Use Freeze
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Streak Display */}
      <motion.div
        className={`relative overflow-hidden rounded-xl border-2 p-6 ${
          streakStatus.isActive 
            ? 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-700' 
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Celebration Effect */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-orange-400 rounded-full"
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 200}%`,
                    y: `${50 + (Math.random() - 0.5) * 200}%`,
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Streak Icon */}
            <motion.div
              animate={isAnimating ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              } : {}}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                streakStatus.isActive 
                  ? 'bg-gradient-to-br from-orange-400 to-red-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <Flame className="h-8 w-8 text-white" />
              </div>
              {streakData.currentStreak >= 7 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </div>
              )}
            </motion.div>

            {/* Streak Info */}
            <div>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={streakData.currentStreak}
                  className="text-4xl font-bold text-gray-900 dark:text-white"
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {streakData.currentStreak}
                </motion.span>
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  day streak
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getMessage()}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Longest: {streakData.longestStreak} days</span>
                {streakStatus.isActive && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Active today
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!streakStatus.isActive && streakData.streakFreezeAvailable && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Use Streak Freeze
              </button>
            )}
            {streakStatus.willBreakTomorrow && (
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                Continue Streak
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Milestone Progress */}
      {showMilestones && (
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Next Milestone
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {streakData.nextMilestone - streakData.currentStreak} days to go
            </span>
          </div>

          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <motion.div
                  className={`h-3 rounded-full bg-gradient-to-r ${currentMilestone.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${milestoneProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{streakData.currentStreak} days</span>
                <span>{streakData.nextMilestone} days</span>
              </div>
            </div>

            {/* Reward */}
            <div className={`p-3 rounded-lg bg-gradient-to-r ${currentMilestone.color} bg-opacity-10 border border-current border-opacity-20`}>
              <div className="flex items-center gap-2">
                <Award className={`h-5 w-5 text-current bg-gradient-to-r ${currentMilestone.color} bg-clip-text text-transparent`} />
                <span className="font-medium text-current bg-gradient-to-r bg-clip-text text-transparent">
                  {currentMilestone.reward}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Streak History */}
      {showHistory && (
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-orange-500" />
            Recent Activity
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {streakData.streakHistory.slice(-28).map((day, index) => (
              <motion.div
                key={day.date}
                className="aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs p-1"
                style={{
                  borderColor: day.active 
                    ? 'rgb(251 146 60)' 
                    : 'rgb(229 231 235)',
                  backgroundColor: day.active 
                    ? 'rgb(255 237 213)' 
                    : 'rgb(249 250 251)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ scale: 1.1 }}
              >
                <Flame className={`h-3 w-3 ${day.active ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className={`mt-1 ${day.active ? 'text-orange-700' : 'text-gray-500'}`}>
                  {new Date(day.date).getDate()}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-200 border-2 border-orange-400 rounded"></div>
              <span>Active days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span>Inactive days</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
