export interface NeuralData {
  timestamp: number;
  eegData: EEGData;
  emgData: EMGData;
  heartRate: number;
  attention: number;
  meditation: number;
  cognitiveLoad: number;
  signalQuality?: number;
}

export interface EEGData {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface EMGData {
  frontal: number;
  temporal: number;
  occipital: number;
}

export interface LearningSession {
  id: string;
  userId: string;
  courseId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'paused';
  content: LearningContent;
}

export interface LearningContent {
  id: string;
  title: string;
  type: 'text' | 'video' | 'interactive';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
}

export interface LearningMetrics {
  efficiency: number;
  comprehension: number;
  retention: number;
  cognitiveLoad: number;
  attention: number;
  meditation: number;
  focusScore: number;
  fatigueLevel: number;
}

export interface LearningResult {
  efficiency: number;
  comprehension: number;
  retention: number;
  sessionDuration: number;
  cognitiveLoad: number;
}

export interface NeurostimulationSettings {
  intensity: number;
  frequency: number;
  duration: number;
  targetRegions: string[];
  protocol: 'tDCS' | 'tACS' | 'tRNS';
  safetyLimits: SafetyLimits;
}

export interface SafetyLimits {
  maxIntensity: number;
  maxDuration: number;
  minRestPeriod: number;
  dailyLimit: number;
}

export interface SafetyStatus {
  status: 'safe' | 'warning' | 'critical';
  alerts: SafetyAlert[];
  recommendations: string[];
}

export interface SafetyAlert {
  type: 'intensity' | 'duration' | 'cognitive_load' | 'signal_quality';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

export interface NeuralProfile {
  userId: string;
  baselineMetrics: LearningMetrics;
  optimalStimulation: NeurostimulationSettings;
  learningStyle: string;
  cognitivePatterns: CognitivePattern[];
  preferences: UserPreferences;
}

export interface CognitivePattern {
  pattern: string;
  frequency: number;
  impact: number;
  description: string;
}

export interface UserPreferences {
  preferredIntensity: number;
  preferredDuration: number;
  comfortLevel: 'low' | 'medium' | 'high';
  adaptiveMode: boolean;
}

export interface SensorData {
  deviceId: string;
  signalQuality: number;
  batteryLevel: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastUpdate: number;
}

export interface StimulationProtocol {
  id: string;
  name: string;
  description: string;
  settings: NeurostimulationSettings;
  targetOutcome: string;
  efficacy: number;
  researchPapers: string[];
}
