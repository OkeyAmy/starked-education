// AGI Tutor System Types

export interface LearningStyle {
  visual: boolean;
  auditory: boolean;
  kinesthetic: boolean;
  readingWriting: boolean;
  dominant: string;
  preferences: any;
}

export interface KnowledgeLevel {
  beginner: boolean;
  intermediate: boolean;
  advanced: boolean;
  expert: boolean;
  overall: string;
  strengths: string[];
  gaps: string[];
}

export interface StudentProfile {
  studentId: string;
  learningStyle: LearningStyle;
  knowledgeLevel: KnowledgeLevel;
  learningPatterns: any;
  cognitivePreferences: any;
  learningPace: any;
  emotionalState: any;
  adaptations: AdaptationStrategy[];
  learningGoals: string[];
  strengths: string[];
  weaknesses: string[];
  motivationLevel: number;
  engagementLevel: number;
  createdAt: number;
  lastUpdated: number;
}

export interface AdaptationStrategy {
  type: string;
  description: string;
  triggers: string[];
  actions: string[];
}

export interface PersonalizedContent {
  studentId: string;
  topic: string;
  content: any;
  adaptations: AdaptationStrategy[];
  learningObjectives: string[];
  assessmentStrategy: any;
  estimatedDuration: number;
  engagementFactors: any;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: {
    subject?: string;
    topic?: string;
    nodeCount: number;
    edgeCount: number;
    lastUpdated: number;
  };
}

export interface KnowledgeNode {
  id: string;
  label: string;
  concepts: string[];
  difficulty: number;
  prerequisites: string[];
  applications: string[];
  metadata: any;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number;
  metadata: any;
}

export interface SubjectKnowledge {
  subject: string;
  topic?: string;
  knowledgeGraph: KnowledgeGraph;
  relatedConcepts: string[];
  prerequisites: string[];
  applications: any[];
  crossDomainConnections: CrossDomainConnection[];
  difficulty: number;
  estimatedLearningTime: number;
  learningObjectives: string[];
}

export interface CrossDomainConnection {
  sourceDomain: string;
  targetDomain: string;
  sourceConcept: string;
  targetConcept: string;
  relationship: string;
  strength: number;
  relevance: number;
  educationalValue: number;
  description: string;
  examples: string[];
}

export interface KnowledgeVisualization {
  type: string;
  subject: string;
  topic: string;
  hierarchy: any;
  conceptMap: any;
  learningPaths: any;
  connections: any;
  interactiveElements: any;
  metadata: {
    depth: number;
    totalConcepts: number;
    totalConnections: number;
    generatedAt: number;
  };
}

export interface EmotionalProfile {
  currentEmotion: string;
  emotionalState: {
    happiness: number;
    engagement: number;
    confusion: number;
    frustration: number;
    confidence: number;
    motivation: number;
  };
  supportStrategies: string[];
  triggers: string[];
  interventions: string[];
  patterns: any;
  emotionalIntelligence: EmotionalIntelligence;
  lastUpdated: number;
}

export interface LearningSession {
  sessionId: string;
  subject: string;
  topic: string;
  learningPath: any;
  teachingStrategies: any;
  content: any;
  adaptations: AdaptationStrategy[];
  emotionalSupport: string[];
  crossDomainInsights: CrossDomainConnection[];
  startTime: number;
  estimatedDuration: number;
}

export interface ResponseAnalysis {
  sessionId: string;
  studentId: string;
  responseAnalysis: any;
  feedback: any;
  nextAction: any;
  timestamp: number;
  confidenceLevel: number;
  responseTime: number;
}

export interface ClassAnalysis {
  classId: string;
  subject: string;
  currentTopic: string;
  dynamics: any;
  knowledgeGaps: any;
  learningPatterns: any;
  recommendations: any;
}

export interface Assessment {
  assessmentId: string;
  type: string;
  subject: string;
  topics: string[];
  difficulty: number;
  questions: any[];
  evaluationRubric: any;
  timeLimit: number;
  adaptations: AdaptationStrategy[];
}

export interface TeachingGuidance {
  strategies: any[];
  interventions: any[];
  engagementStrategies: any[];
  recommendations: any;
  timestamp: number;
}

export interface LearningProgress {
  studentId: string;
  sessionId: string;
  progress: any;
  knowledgeProgress: any;
  skillDevelopment: any;
  emotionalGrowth: any;
  metacognitiveDevelopment: any;
  timestamp: number;
}

export interface LearningPredictions {
  shortTerm: any[];
  longTerm: any[];
  mastery: any;
  confidence: number;
  recommendations: string[];
}

export interface LearningRecommendations {
  learningPaths: any[];
  resources: any[];
  projects: any[];
  personalizedFor: string;
  generatedAt: number;
}

export interface EmotionalSupport {
  strategies: string[];
  interventions: string[];
  resources: any[];
  followUpActions: string[];
}

// AGI Reasoning Types
export interface ReasoningEngine {
  crossDomainReasoning: any;
  causalInference: any;
  analogicalReasoning: any;
  abstractReasoning: any;
  metacognition: any;
}

export interface ReasoningResult {
  connections: any[];
  insights: any[];
  learningPath: any;
  confidence: number;
  evidence: any[];
}

// Universal Knowledge Types
export interface UniversalKnowledge {
  domains: string[];
  concepts: any[];
  relationships: any[];
  principles: any[];
  applications: any[];
}

// Cross-Domain Integration Types
export interface IntegrationPattern {
  patternType: string;
  domains: string[];
  concepts: string[];
  relationships: string[];
  examples: any[];
  educationalValue: number;
}

// Emotional Intelligence Types
export interface EmotionalIntelligence {
  empathy: number;
  selfAwareness: number;
  socialSkills: number;
  motivation: number;
  regulation: number;
}

export interface EmotionalAnalysis {
  currentEmotion: string;
  emotionalState: any;
  triggers: string[];
  copingStrategies: string[];
  supportNeeded: string[];
}
