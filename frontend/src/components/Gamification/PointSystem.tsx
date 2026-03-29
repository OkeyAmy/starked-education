'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, TrendingUp, Award, Zap, Target, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  timestamp: string;
  type: 'earned' | 'spent' | 'bonus';
  category: 'lesson' | 'quiz' | 'achievement' | 'streak' | 'bonus' | 'reward';
}

interface PointReward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: 'avatar' | 'badge' | 'course' | 'feature' | 'customization';
  available: boolean;
  claimed?: boolean;
}

interface PointSystemProps {
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  level: number;
  pointsToNextLevel: number;
  recentTransactions: PointTransaction[];
  availableRewards: PointReward[];
  onPointsEarned?: (amount: number, reason: string) => void;
  onRewardClaimed?: (rewardId: string) => void;
  compact?: boolean;
  showHistory?: boolean;
  showRewards?: boolean;
}

const POINT_ANIMATIONS = {
  small: { scale: [1, 1.2, 1], duration: 0.3 },
  medium: { scale: [1, 1.5, 1], duration: 0.5 },
  large: { scale: [1, 2, 1], duration: 0.7 }
};

const CATEGORY_COLORS = {
  lesson: 'from-blue-400 to-blue-600',
  quiz: 'from-green-400 to-green-600',
  achievement: 'from-purple-400 to-purple-600',
  streak: 'from-orange-400 to-orange-600',
  bonus: 'from-yellow-400 to-yellow-600',
  reward: 'from-red-400 to-red-600'
};

const CATEGORY_ICONS = {
  lesson: Target,
  quiz: Award,
  achievement: Star,
  streak: Zap,
  bonus: Gift,
  reward: Plus
};

export function PointSystem({
  currentPoints,
  totalEarned,
  totalSpent,
  level,
  pointsToNextLevel,
  recentTransactions,
  availableRewards,
  onPointsEarned,
  onRewardClaimed,
  compact = false,
  showHistory = true,
  showRewards = true
}: PointSystemProps) {
  const [showFloatingPoints, setShowFloatingPoints] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<{ amount: number; x: number; y: number } | null>(null);
  const [selectedReward, setSelectedReward] = useState<PointReward | null>(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);

  // Calculate level progress
  const levelProgress = useMemo(() => {
    const currentLevelPoints = totalEarned - (totalSpent + currentPoints);
    const totalLevelPoints = pointsToNextLevel + currentLevelPoints;
    return totalLevelPoints > 0 ? (currentLevelPoints / totalLevelPoints) * 100 : 0;
  }, [totalEarned, totalSpent, currentPoints, pointsToNextLevel]);

  // Trigger point animation
  const triggerPointAnimation = (amount: number, event?: React.MouseEvent) => {
    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setFloatingPoints({
        amount,
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
    
    setShowFloatingPoints(true);
    setTimeout(() => {
      setShowFloatingPoints(false);
      setFloatingPoints(null);
    }, 2000);
  };

  // Simulate earning points
  const simulatePointsEarned = (amount: number, reason: string) => {
    if (onPointsEarned) {
      onPointsEarned(amount, reason);
    }
    
    const animationSize = amount >= 100 ? 'large' : amount >= 50 ? 'medium' : 'small';
    triggerPointAnimation(amount);
    
    toast.success(`+${amount} points - ${reason}`, {
      icon: '🎉',
      style: {
        background: `linear-gradient(to right, ${CATEGORY_COLORS.bonus.split(' ')[0].replace('from-', '')}, ${CATEGORY_COLORS.bonus.split(' ')[1].replace('to-', '')})`,
        color: 'white'
      }
    });
  };

  // Claim reward
  const claimReward = async (reward: PointReward) => {
    if (currentPoints < reward.cost) {
      toast.error('Not enough points to claim this reward!');
      return;
    }

    setIsClaimingReward(true);
    setSelectedReward(reward);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onRewardClaimed) {
        onRewardClaimed(reward.id);
      }
      
      toast.success(`Successfully claimed ${reward.name}!`, {
        icon: '🎁'
      });
      
      setSelectedReward(null);
    } catch (error) {
      toast.error('Failed to claim reward. Please try again.');
    } finally {
      setIsClaimingReward(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-gray-900 dark:text-white">{currentPoints.toLocaleString()}</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Level {level}
        </div>
        <button
          onClick={() => simulatePointsEarned(10, 'Daily bonus')}
          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          Daily Bonus
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Floating Points Animation */}
      <AnimatePresence>
        {showFloatingPoints && floatingPoints && (
          <motion.div
            className="fixed pointer-events-none z-50 text-2xl font-bold text-yellow-500"
            style={{
              left: floatingPoints.x,
              top: floatingPoints.y,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [0, -50, -100]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
          >
            +{floatingPoints.amount}
            <Star className="inline h-4 w-4 ml-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Points Overview */}
      <motion.div
        className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-300 dark:border-yellow-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Star className="h-8 w-8 text-yellow-500" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentPoints.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Level {level}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {pointsToNextLevel} points to next level
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-3">
            <motion.div
              className="h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Level {level}</span>
            <span>{Math.round(levelProgress)}%</span>
            <span>Level {level + 1}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              +{totalEarned.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Earned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
              -{totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Spent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {Math.round((totalEarned / Math.max(totalEarned + totalSpent, 1)) * 100)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Save Rate</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => simulatePointsEarned(10, 'Daily bonus')}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            <Gift className="h-4 w-4 inline mr-2" />
            Daily Bonus
          </button>
          <button
            onClick={() => simulatePointsEarned(25, 'Quiz completion')}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Award className="h-4 w-4 inline mr-2" />
            Quiz Points
          </button>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      {showHistory && (
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-500" />
            Recent Activity
          </h3>

          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((transaction, index) => {
              const IconComponent = CATEGORY_ICONS[transaction.category];
              const isEarned = transaction.type === 'earned';
              
              return (
                <motion.div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${CATEGORY_COLORS[transaction.category]} flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {transaction.reason}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${isEarned ? 'text-green-600' : 'text-red-600'}`}>
                    {isEarned ? '+' : '-'}{transaction.amount}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Rewards Store */}
      {showRewards && (
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-500" />
            Rewards Store
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRewards.map((reward) => (
              <motion.div
                key={reward.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  reward.claimed
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
                    : reward.available
                    ? 'bg-white dark:bg-slate-800 border-yellow-300 dark:border-yellow-700 hover:shadow-lg'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-40'
                }`}
                whileHover={reward.available && !reward.claimed ? { scale: 1.02 } : {}}
              >
                {reward.claimed && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                    Claimed
                  </div>
                )}

                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="text-3xl">{reward.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {reward.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {reward.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Star className="h-4 w-4" />
                    <span className="font-bold">{reward.cost}</span>
                  </div>
                  <button
                    onClick={() => claimReward(reward)}
                    disabled={!reward.available || reward.claimed || currentPoints < reward.cost}
                    className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${
                      reward.claimed
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : !reward.available
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : currentPoints < reward.cost
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {reward.claimed
                      ? 'Claimed'
                      : !reward.available
                      ? 'Unavailable'
                      : currentPoints < reward.cost
                      ? 'Insufficient Points'
                      : 'Claim Reward'
                    }
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Claiming Reward Modal */}
      <AnimatePresence>
        {selectedReward && isClaimingReward && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-center space-y-4">
                <div className="text-4xl">{selectedReward.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Claiming Reward...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Processing your claim for {selectedReward.name}
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
