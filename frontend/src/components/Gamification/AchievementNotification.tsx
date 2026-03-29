'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '../../types/profile';
import { Trophy, Sparkles, Zap, Star, X, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
  onShare?: () => void;
}

const RARITY_ANIMATIONS = {
  common: {
    bgColor: 'from-gray-500 to-gray-700',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-100',
    icon: Star,
    particles: 8,
    duration: 0.6
  },
  rare: {
    bgColor: 'from-blue-500 to-blue-700',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-100',
    icon: Zap,
    particles: 12,
    duration: 0.8
  },
  epic: {
    bgColor: 'from-purple-500 to-purple-700',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-100',
    icon: Sparkles,
    particles: 16,
    duration: 1.0
  },
  legendary: {
    bgColor: 'from-amber-500 to-amber-700',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-100',
    icon: Trophy,
    particles: 20,
    duration: 1.2
  }
};

const PARTICLE_COLORS = {
  common: ['#9CA3AF', '#6B7280', '#4B5563'],
  rare: ['#3B82F6', '#2563EB', '#1D4ED8'],
  epic: ['#A855F7', '#9333EA', '#7C3AED'],
  legendary: ['#F59E0B', '#D97706', '#B45309']
};

function Particle({ color, delay, duration }: { color: string; delay: number; duration: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ 
        scale: 0,
        x: 0,
        y: 0,
        opacity: 1
      }}
      animate={{
        scale: [0, 1, 0],
        x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
        y: [0, -Math.random() * 100 - 50, -Math.random() * 200 - 100],
        opacity: [1, 1, 0]
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
    />
  );
}

export function AchievementNotification({ 
  achievement, 
  isVisible, 
  onClose, 
  onShare 
}: AchievementNotificationProps) {
  const [showParticles, setShowParticles] = useState(false);
  const config = RARITY_ANIMATIONS[achievement.rarity];
  const IconComponent = config.icon;
  const particles = Array.from({ length: config.particles }, (_, i) => i);

  useEffect(() => {
    if (isVisible) {
      setShowParticles(true);
      // Play achievement sound (if available)
      const audio = new Audio('/sounds/achievement.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Silently fail if audio not available
      });
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      const shareText = `🎉 Just unlocked the "${achievement.name}" achievement on StarkEd Education!`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Achievement Unlocked!',
          text: shareText,
          url: window.location.href
        }).catch(() => {
          // Fallback to clipboard
          navigator.clipboard.writeText(shareText);
          toast.success('Achievement link copied to clipboard!');
        });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success('Achievement link copied to clipboard!');
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Particles */}
          {showParticles && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {particles.map((i) => (
                <Particle
                  key={i}
                  color={PARTICLE_COLORS[achievement.rarity][i % 3]}
                  delay={i * 0.05}
                  duration={config.duration}
                />
              ))}
            </div>
          )}

          {/* Notification Card */}
          <motion.div
            className="relative bg-gradient-to-br rounded-2xl p-8 max-w-md mx-4 shadow-2xl border-2 pointer-events-auto"
            style={{
              backgroundImage: `linear-gradient(135deg, ${config.bgColor.split(' ')[0].replace('from-', '')}, ${config.bgColor.split(' ')[1].replace('to-', '')})`
            }}
            initial={{ 
              scale: 0.5,
              opacity: 0,
              rotate: -10
            }}
            animate={{ 
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            exit={{ 
              scale: 0.5,
              opacity: 0,
              rotate: 10
            }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Content */}
            <div className="text-center space-y-4">
              {/* Achievement Icon */}
              <motion.div
                className="relative inline-block"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-4xl">{achievement.icon}</div>
                </div>
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r ${config.bgColor} flex items-center justify-center border-2 ${config.borderColor}`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <div className="space-y-2">
                <motion.h2
                  className="text-2xl font-bold text-white"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Achievement Unlocked!
                </motion.h2>
                <motion.h3
                  className="text-xl font-semibold text-white"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {achievement.name}
                </motion.h3>
              </div>

              {/* Description */}
              <motion.p
                className="text-white/90 text-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {achievement.description}
              </motion.p>

              {/* Rarity Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <IconComponent className="h-4 w-4 text-white" />
                <span className="text-white font-medium capitalize">
                  {achievement.rarity}
                </span>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                className="flex gap-3 justify-center pt-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white font-medium"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white font-medium"
                >
                  Awesome!
                </button>
              </motion.div>
            </div>

            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-50"
              style={{
                background: `radial-gradient(circle at center, ${config.bgColor.split(' ')[0].replace('from-', '')}40, transparent 70%)`
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
