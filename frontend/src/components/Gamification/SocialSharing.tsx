'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Twitter, Facebook, Linkedin, MessageCircle, Link, Check, Trophy, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ShareableContent {
  type: 'achievement' | 'milestone' | 'streak' | 'level' | 'certificate';
  title: string;
  description: string;
  points?: number;
  badge?: string;
  streak?: number;
  level?: number;
  imageUrl?: string;
  url?: string;
}

interface SocialSharingProps {
  content: ShareableContent;
  onClose?: () => void;
  isOpen?: boolean;
  compact?: boolean;
}

const SHARE_TEMPLATES = {
  achievement: (content: ShareableContent) => ({
    twitter: `🎉 Just unlocked the "${content.title}" achievement on StarkEd Education! ${content.description} #StarkEd #Learning #Achievement`,
    facebook: `I'm excited to share that I've earned the "${content.title}" achievement on StarkEd Education! ${content.description} Join me on this learning journey!`,
    linkedin: `🏆 Professional Development: I've achieved "${content.title}" through StarkEd Education's innovative learning platform. ${content.description} Continuous learning is key to growth! #ProfessionalDevelopment #EdTech`,
    text: `Check out my latest achievement: "${content.title}" on StarkEd Education! ${content.description}`
  }),
  milestone: (content: ShareableContent) => ({
    twitter: `🎯 Milestone reached! ${content.title} on StarkEd Education! ${content.description} #LearningJourney #Milestone`,
    facebook: `I've reached an important milestone: ${content.title}! ${content.description} Thanks to StarkEd Education for making learning engaging and rewarding.`,
    linkedin: `Career Milestone: ${content.title} through dedicated learning on StarkEd Education. ${content.description} Setting and achieving goals is fundamental to professional growth. #CareerGrowth #LifelongLearning`,
    text: `Milestone achieved: ${content.title} - ${content.description}`
  }),
  streak: (content: ShareableContent) => ({
    twitter: `🔥 ${content.streak}-day learning streak on StarkEd Education! Consistency is key to success! #StarkEd #LearningStreak #Discipline`,
    facebook: `I've maintained a ${content.streak}-day learning streak on StarkEd Education! It's amazing what consistent daily learning can achieve. Every day counts!`,
    linkedin: `Consistency & Discipline: ${content.streak}-day learning streak on StarkEd Education. Daily learning habits are building blocks for long-term success and expertise. #ProfessionalDevelopment #Habits`,
    text: `${content.streak}-day learning streak achieved! Consistency pays off.`
  }),
  level: (content: ShareableContent) => ({
    twitter: `⬆️ Leveled up to ${content.level} on StarkEd Education! Keep growing, keep learning! #LevelUp #StarkEd`,
    facebook: `So excited to reach level ${content.level} on StarkEd Education! Each level up represents new knowledge and skills gained. The learning journey continues!`,
    linkedin: `Skill Development: Reached level ${content.level} on StarkEd Education. Continuous upskilling and knowledge acquisition are essential in today's rapidly evolving professional landscape. #SkillDevelopment #EdTech`,
    text: `Reached level ${content.level} on my learning journey!`
  }),
  certificate: (content: ShareableContent) => ({
    twitter: `📜 Earned my certificate: ${content.title} from StarkEd Education! New skills unlocked! #Certificate #StarkEd`,
    facebook: `Proud to announce that I've earned my certificate in ${content.title} from StarkEd Education! This represents hours of dedicated learning and skill development.`,
    linkedin: `Professional Certification: Successfully completed ${content.title} through StarkEd Education. This certification validates my expertise and commitment to continuous professional development. #Certification #ProfessionalGrowth`,
    text: `Certificate earned: ${content.title} - New skills and knowledge acquired!`
  })
};

const SOCIAL_PLATFORMS = [
  {
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-blue-400 hover:bg-blue-500',
    textColor: 'text-blue-600',
    shareUrl: 'https://twitter.com/intent/tweet?text={text}&url={url}'
  },
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-blue-700',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}&quote={text}'
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700 hover:bg-blue-800',
    textColor: 'text-blue-800',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/?url={url}&summary={text}'
  },
  {
    name: 'Copy Link',
    icon: Link,
    color: 'bg-gray-600 hover:bg-gray-700',
    textColor: 'text-gray-700',
    shareUrl: 'copy'
  }
];

export function SocialSharing({
  content,
  onClose,
  isOpen = true,
  compact = false
}: SocialSharingProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const templates = SHARE_TEMPLATES[content.type](content);
  const shareUrl = content.url || window.location.href;

  const handleShare = async (platform: typeof SOCIAL_PLATFORMS[0]) => {
    setIsSharing(true);

    try {
      const text = templates[platform.name.toLowerCase() as keyof typeof templates] || templates.text;
      const encodedText = encodeURIComponent(text);
      const encodedUrl = encodeURIComponent(shareUrl);

      let finalUrl = platform.shareUrl
        .replace('{text}', encodedText)
        .replace('{url}', encodedUrl);

      if (platform.name === 'Copy Link') {
        await navigator.clipboard.writeText(`${shareUrl}\n\n${text}`);
        setCopiedPlatform(platform.name);
        toast.success('Link copied to clipboard!');

        setTimeout(() => setCopiedPlatform(null), 2000);
      } else {
        window.open(finalUrl, '_blank', 'width=600,height=400');
        toast.success(`Sharing to ${platform.name}...`);
      }
    } catch (error) {
      toast.error('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleShare(SOCIAL_PLATFORMS[3])} // Copy Link
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-sm">Share</span>
        </motion.button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Share Your Achievement
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Inspire others by sharing your progress
                  </p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-gray-500">×</span>
                </button>
              )}
            </div>

            {/* Content Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  {content.type === 'achievement' && <Trophy className="h-5 w-5 text-yellow-500" />}
                  {content.type === 'streak' && <span className="text-lg">🔥</span>}
                  {content.type === 'level' && <span className="text-lg">⬆️</span>}
                  {content.type === 'certificate' && <span className="text-lg">📜</span>}
                  {content.type === 'milestone' && <Star className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {content.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {content.description}
                  </p>
                  {(content.points || content.streak || content.level) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {content.points && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {content.points} points
                        </span>
                      )}
                      {content.streak && (
                        <span className="flex items-center gap-1">
                          🔥 {content.streak} day streak
                        </span>
                      )}
                      {content.level && (
                        <span className="flex items-center gap-1">
                          ⬆️ Level {content.level}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Share on
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const IconComponent = platform.icon;
                  const isCopied = copiedPlatform === platform.name;

                  return (
                    <motion.button
                      key={platform.name}
                      onClick={() => handleShare(platform)}
                      disabled={isSharing}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-all ${isCopied
                          ? 'bg-green-600'
                          : platform.color
                        } ${isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                      whileHover={{ scale: isSharing ? 1 : 1.02 }}
                      whileTap={{ scale: isSharing ? 1 : 0.98 }}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <IconComponent className="h-4 w-4" />
                          <span>{platform.name}</span>
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Share Message Preview */}
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Preview message:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {templates.text}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sharing helps motivate others in their learning journey
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
