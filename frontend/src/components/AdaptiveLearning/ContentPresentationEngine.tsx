'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Video, Headphones, Users, Brain, Zap, Eye, FileText, Monitor, Play } from 'lucide-react';
import { LearningStyle } from './LearningStyleDetector';

export type ContentType = 'text' | 'video' | 'audio' | 'interactive' | 'visual' | 'social' | 'hands-on';
export type PresentationMode = 'sequential' | 'exploratory' | 'guided' | 'adaptive';

interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  metadata: {
    difficulty: number;
    estimatedTime: number;
    prerequisites: string[];
    tags: string[];
    accessibility: {
      hasCaptions: boolean;
      hasTranscript: boolean;
      hasAudioDescription: boolean;
      readingLevel: number;
    };
  };
  adaptations: {
    [key in LearningStyle]?: {
      transformedContent?: string;
      supplementaryMaterials?: string[];
      alternativeFormats?: ContentType[];
      interactionHints?: string[];
    };
  };
}

interface PersonalizedContent {
  items: ContentItem[];
  presentationMode: PresentationMode;
  adaptations: {
    preferredFormats: ContentType[];
    difficultyAdjustment: number;
    pacingSpeed: number;
    assistanceLevel: number;
  };
  performance: {
    completionRate: number;
    comprehensionScore: number;
    timeSpent: number;
    interactions: number;
  };
}

interface ContentPresentationEngineProps {
  userId: string;
  learningStyle: LearningStyle;
  content: ContentItem[];
  onContentInteraction?: (itemId: string, interaction: string, performance: number) => void;
  onAdaptationNeeded?: (adaptation: string) => void;
  enableRealTimeAdaptation?: boolean;
  accessibilityMode?: boolean;
}

const CONTENT_TYPE_ICONS = {
  text: FileText,
  video: Video,
  audio: Headphones,
  interactive: Monitor,
  visual: Eye,
  social: Users,
  'hands-on': Brain
};

const LEARNING_STYLE_PREFERENCES: Record<LearningStyle, {
  preferredTypes: ContentType[];
  presentationMode: PresentationMode;
  adaptations: {
    textSize: number;
    mediaEnrichment: number;
    interactivityLevel: number;
    socialElements: number;
  };
}> = {
  visual: {
    preferredTypes: ['visual', 'video', 'interactive'],
    presentationMode: 'exploratory',
    adaptations: {
      textSize: 1.0,
      mediaEnrichment: 0.9,
      interactivityLevel: 0.7,
      socialElements: 0.3
    }
  },
  auditory: {
    preferredTypes: ['audio', 'video', 'text'],
    presentationMode: 'sequential',
    adaptations: {
      textSize: 1.1,
      mediaEnrichment: 0.8,
      interactivityLevel: 0.4,
      socialElements: 0.6
    }
  },
  reading: {
    preferredTypes: ['text', 'interactive'],
    presentationMode: 'sequential',
    adaptations: {
      textSize: 1.2,
      mediaEnrichment: 0.3,
      interactivityLevel: 0.5,
      socialElements: 0.2
    }
  },
  kinesthetic: {
    preferredTypes: ['interactive', 'hands-on', 'video'],
    presentationMode: 'guided',
    adaptations: {
      textSize: 1.0,
      mediaEnrichment: 0.7,
      interactivityLevel: 0.9,
      socialElements: 0.5
    }
  },
  social: {
    preferredTypes: ['social', 'interactive', 'video'],
    presentationMode: 'exploratory',
    adaptations: {
      textSize: 1.0,
      mediaEnrichment: 0.6,
      interactivityLevel: 0.7,
      socialElements: 0.9
    }
  },
  solitary: {
    preferredTypes: ['text', 'video', 'interactive'],
    presentationMode: 'sequential',
    adaptations: {
      textSize: 1.1,
      mediaEnrichment: 0.5,
      interactivityLevel: 0.6,
      socialElements: 0.1
    }
  },
  logical: {
    preferredTypes: ['interactive', 'text', 'visual'],
    presentationMode: 'guided',
    adaptations: {
      textSize: 1.0,
      mediaEnrichment: 0.6,
      interactivityLevel: 0.8,
      socialElements: 0.3
    }
  },
  creative: {
    preferredTypes: ['visual', 'interactive', 'hands-on'],
    presentationMode: 'exploratory',
    adaptations: {
      textSize: 1.0,
      mediaEnrichment: 0.8,
      interactivityLevel: 0.8,
      socialElements: 0.4
    }
  }
};

export function ContentPresentationEngine({
  userId,
  learningStyle,
  content,
  onContentInteraction,
  onAdaptationNeeded,
  enableRealTimeAdaptation = true,
  accessibilityMode = false
}: ContentPresentationEngineProps) {
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent>({
    items: [],
    presentationMode: 'sequential',
    adaptations: {
      preferredFormats: [],
      difficultyAdjustment: 0,
      pacingSpeed: 1.0,
      assistanceLevel: 0.5
    },
    performance: {
      completionRate: 0,
      comprehensionScore: 0,
      timeSpent: 0,
      interactions: 0
    }
  });

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isAdapting, setIsAdapting] = useState(false);
  const [showAssistance, setShowAssistance] = useState(false);
  const [interactionHistory, setInteractionHistory] = useState<Array<{
    itemId: string;
    timestamp: string;
    interaction: string;
    performance: number;
  }>>([]);

  // Initialize personalized content based on learning style
  useEffect(() => {
    const preferences = LEARNING_STYLE_PREFERENCES[learningStyle];
    const adaptedContent = adaptContentForLearningStyle(content, learningStyle);
    
    setPersonalizedContent(prev => ({
      ...prev,
      items: adaptedContent,
      presentationMode: preferences.presentationMode,
      adaptations: {
        preferredFormats: preferences.preferredTypes,
        difficultyAdjustment: 0,
        pacingSpeed: 1.0,
        assistanceLevel: 0.5
      }
    }));
  }, [content, learningStyle]);

  // Adapt content for specific learning style
  const adaptContentForLearningStyle = useCallback((
    items: ContentItem[], 
    style: LearningStyle
  ): ContentItem[] => {
    const preferences = LEARNING_STYLE_PREFERENCES[style];
    
    return items.map(item => {
      const styleAdaptation = item.adaptations[style];
      
      // Transform content based on learning style
      let transformedContent = item.content;
      let supplementaryMaterials: string[] = [];
      let alternativeFormats: ContentType[] = [];

      switch (style) {
        case 'visual':
          if (item.type === 'text') {
            transformedContent = addVisualElements(item.content);
            alternativeFormats.push('visual');
          }
          if (item.type === 'audio') {
            alternativeFormats.push('video');
          }
          break;
          
        case 'auditory':
          if (item.type === 'text') {
            supplementaryMaterials.push('audio-narration');
            alternativeFormats.push('audio');
          }
          if (item.type === 'visual') {
            supplementaryMaterials.push('audio-description');
          }
          break;
          
        case 'reading':
          if (item.type === 'video') {
            supplementaryMaterials.push('transcript', 'summary');
            alternativeFormats.push('text');
          }
          if (item.type === 'audio') {
            supplementaryMaterials.push('transcript');
            alternativeFormats.push('text');
          }
          break;
          
        case 'kinesthetic':
          if (item.type === 'text' || item.type === 'video') {
            supplementaryMaterials.push('interactive-exercise', 'hands-on-activity');
            alternativeFormats.push('interactive');
          }
          break;
          
        case 'social':
          supplementaryMaterials.push('discussion-prompt', 'peer-review');
          alternativeFormats.push('social');
          break;
          
        case 'solitary':
          // Remove collaborative elements
          transformedContent = removeSocialElements(item.content);
          break;
          
        case 'logical':
          if (item.type === 'visual' || item.type === 'text') {
            transformedContent = addLogicalStructure(item.content);
            supplementaryMaterials.push('problem-set', 'analysis-exercise');
          }
          break;
          
        case 'creative':
          supplementaryMaterials.push('brainstorming-prompt', 'creative-exercise');
          alternativeFormats.push('interactive');
          break;
      }

      return {
        ...item,
        adaptations: {
          ...item.adaptations,
          [style]: {
            transformedContent,
            supplementaryMaterials,
            alternativeFormats,
            interactionHints: generateInteractionHints(style, item.type)
          }
        }
      };
    });
  }, []);

  // Content transformation helpers
  const addVisualElements = (content: string): string => {
    // Add visual elements to text content
    return content + '\n\n[Visual aids: diagrams, charts, infographics would be displayed here]';
  };

  const removeSocialElements = (content: string): string => {
    // Remove collaborative elements
    return content.replace(/\[.*discussion.*\]/gi, '').replace(/\[.*group.*\]/gi, '');
  };

  const addLogicalStructure = (content: string): string => {
    // Add logical structure to content
    return `[Logical Framework]\n\n` + content + `\n\n[Analysis Questions]`;
  };

  const generateInteractionHints = (style: LearningStyle, contentType: ContentType): string[] => {
    const hints: string[] = [];
    
    switch (style) {
      case 'visual':
        hints.push('Look for patterns and visual cues', 'Create mental images');
        break;
      case 'auditory':
        hints.push('Listen for key concepts', 'Repeat important points aloud');
        break;
      case 'reading':
        hints.push('Take notes while reading', 'Highlight important information');
        break;
      case 'kinesthetic':
        hints.push('Try the examples yourself', 'Practice with hands-on activities');
        break;
      case 'social':
        hints.push('Discuss with peers', 'Share your insights');
        break;
      case 'solitary':
        hints.push('Reflect on the content', 'Work at your own pace');
        break;
      case 'logical':
        hints.push('Identify cause and effect', 'Look for logical patterns');
        break;
      case 'creative':
        hints.push('Think of alternative approaches', 'Connect to your own ideas');
        break;
    }
    
    return hints;
  };

  // Handle content interaction
  const handleInteraction = useCallback((itemId: string, interaction: string, performance: number = 0.5) => {
    const interactionRecord = {
      itemId,
      timestamp: new Date().toISOString(),
      interaction,
      performance
    };
    
    setInteractionHistory(prev => [...prev.slice(-50), interactionRecord]);
    onContentInteraction?.(itemId, interaction, performance);
    
    // Update performance metrics
    setPersonalizedContent(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        interactions: prev.performance.interactions + 1,
        comprehensionScore: (prev.performance.comprehensionScore + performance) / 2
      }
    }));

    // Trigger adaptation if needed
    if (enableRealTimeAdaptation && performance < 0.3) {
      triggerAdaptation('low-performance');
    }
  }, [onContentInteraction, enableRealTimeAdaptation]);

  // Trigger adaptation based on performance
  const triggerAdaptation = useCallback((reason: string) => {
    setIsAdapting(true);
    onAdaptationNeeded?.(reason);
    
    setTimeout(() => {
      setIsAdapting(false);
      setShowAssistance(true);
    }, 1000);
  }, [onAdaptationNeeded]);

  // Get current content item
  const currentItem = personalizedContent.items[currentItemIndex];

  // Render content based on type and adaptations
  const renderContent = (item: ContentItem) => {
    const styleAdaptation = item.adaptations[learningStyle];
    const contentToRender = styleAdaptation?.transformedContent || item.content;
    const IconComponent = CONTENT_TYPE_ICONS[item.type];

    return (
      <motion.div
        key={item.id}
        className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-gray-200 dark:border-slate-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Content Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="capitalize">{item.type}</span>
                <span>•</span>
                <span>{item.metadata.estimatedTime} min</span>
                <span>•</span>
                <span>Level {item.metadata.difficulty}</span>
              </div>
            </div>
          </div>
          
          {/* Accessibility indicators */}
          <div className="flex items-center gap-2">
            {accessibilityMode && item.metadata.accessibility.hasCaptions && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                CC
              </span>
            )}
            {accessibilityMode && item.metadata.accessibility.hasTranscript && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                Transcript
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="prose dark:prose-invert max-w-none mb-6">
          <div 
            className={`text-gray-700 dark:text-gray-300 leading-relaxed ${
              accessibilityMode ? 'text-lg' : ''
            }`}
            style={{ 
              fontSize: accessibilityMode ? '1.1em' : '1em',
              lineHeight: accessibilityMode ? '1.8' : '1.6'
            }}
          >
            {contentToRender}
          </div>
        </div>

        {/* Supplementary Materials */}
        {styleAdaptation?.supplementaryMaterials && styleAdaptation.supplementaryMaterials.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Additional Resources for {learningStyle} Learners
            </h4>
            <div className="flex flex-wrap gap-2">
              {styleAdaptation.supplementaryMaterials.map((material, index) => (
                <button
                  key={index}
                  onClick={() => handleInteraction(item.id, `access-${material}`, 0.7)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  {material}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Formats */}
        {styleAdaptation?.alternativeFormats && styleAdaptation.alternativeFormats.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Try in another format:
            </h4>
            <div className="flex gap-2">
              {styleAdaptation.alternativeFormats.map((format, index) => {
                const FormatIcon = CONTENT_TYPE_ICONS[format];
                return (
                  <button
                    key={index}
                    onClick={() => handleInteraction(item.id, `format-${format}`, 0.6)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FormatIcon className="h-4 w-4" />
                    <span className="text-sm capitalize">{format}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interaction Hints */}
        {styleAdaptation?.interactionHints && styleAdaptation.interactionHints.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              💡 Learning Tips
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {styleAdaptation.interactionHints.map((hint, index) => (
                <li key={index}>• {hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive Elements */}
        <div className="flex gap-3">
          <button
            onClick={() => handleInteraction(item.id, 'complete', 0.8)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Mark Complete
          </button>
          <button
            onClick={() => handleInteraction(item.id, 'bookmark', 0.6)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Bookmark
          </button>
          <button
            onClick={() => triggerAdaptation('need-help')}
            className="px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            Need Help
          </button>
        </div>
      </motion.div>
    );
  };

  if (!currentItem) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No content available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Adaptation Status */}
      {isAdapting && (
        <motion.div
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
            <span className="text-blue-800 dark:text-blue-200">
              Adapting content for your learning style...
            </span>
          </div>
        </motion.div>
      )}

      {/* Assistance Panel */}
      <AnimatePresence>
        {showAssistance && (
          <motion.div
            className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 dark:text-orange-200">
                  Additional assistance available
                </span>
              </div>
              <button
                onClick={() => setShowAssistance(false)}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {renderContent(currentItem)}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (currentItemIndex > 0) {
              setCurrentItemIndex(currentItemIndex - 1);
              handleInteraction(currentItem.id, 'navigate-back', 0.5);
            }
          }}
          disabled={currentItemIndex === 0}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentItemIndex + 1} of {personalizedContent.items.length}
        </div>
        
        <button
          onClick={() => {
            if (currentItemIndex < personalizedContent.items.length - 1) {
              setCurrentItemIndex(currentItemIndex + 1);
              handleInteraction(currentItem.id, 'navigate-forward', 0.5);
            }
          }}
          disabled={currentItemIndex === personalizedContent.items.length - 1}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {/* Performance Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Your Performance
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Completion: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(personalizedContent.performance.completionRate * 100)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Comprehension: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(personalizedContent.performance.comprehensionScore * 100)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Time: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {personalizedContent.performance.timeSpent}min
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Interactions: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {personalizedContent.performance.interactions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
