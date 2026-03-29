/**
 * Neural Simulation Utility
 * Simulates brain activity and neural patterns for nanotechnology learning
 */

import type { NeuralPattern, NeuralPattern as NP } from '../types/nanotech';

/**
 * Generate realistic neural pattern based on current state and learning context
 */
export function generateNeuralPattern(
  userId: string,
  focusLevel: number = 75,
  learningContext: string = 'general'
): NeuralPattern {
  const now = Date.now();
  
  // Generate neuron activation (1000 neurons simulated)
  const neuronActivation = generateNeuronActivation(focusLevel, learningContext);
  
  // Generate brain wave frequencies
  const brainWaves = generateBrainWaves(focusLevel, learningContext);
  
  // Calculate derived metrics
  const dominantFrequency = getDominantFrequency(brainWaves);
  const neuroplasticity = calculateNeuroplasticity(neuronActivation);
  const learningReadiness = calculateLearningReadiness(focusLevel, brainWaves);
  
  // Generate synaptic strengths
  const synapseStrength = generateSynapticStrengths(neuronActivation);
  
  // Create pattern hash for verification
  const patternHash = generatePatternHash(
    neuronActivation,
    brainWaves,
    focusLevel
  );
  
  return {
    id: `pattern_${userId}_${now}`,
    timestamp: now,
    userId,
    neuronActivation,
    synapseStrength,
    brainWaveFrequency: brainWaves,
    focusLevel,
    memoryCapacity: Math.min(100, focusLevel + Math.random() * 20),
    learningVelocity: 1 + (focusLevel / 100) * 99, // 1-100x multiplier
    neuroplasticity,
    patternHash,
    dominantFrequency,
    learningReadiness
  };
}

/**
 * Generate neuron activation array
 * Uses realistic distribution with some clustering
 */
function generateNeuronActivation(
  focusLevel: number,
  context: string
): number[] {
  const neuronCount = 1000;
  const activation: number[] = [];
  
  // Base activation level related to focus
  const baseActivation = focusLevel / 100;
  
  // Create activation patterns based on context
  const contextActivationMap: Record<string, { center: number; spread: number }> = {
    'visual': { center: 200, spread: 150 },
    'auditory': { center: 400, spread: 150 },
    'motor': { center: 600, spread: 150 },
    'memory': { center: 300, spread: 200 },
    'problem-solving': { center: 350, spread: 200 },
    'general': { center: 500, spread: 300 }
  };
  
  const contextMap = contextActivationMap[context] || contextActivationMap['general'];
  
  for (let i = 0; i < neuronCount; i++) {
    // Distance from context-specific activation center
    const distance = Math.abs(i - contextMap.center);
    const contextInfluence = Math.max(
      0,
      1 - (distance / contextMap.spread)
    );
    
    // Add gaussian noise
    const noise = Math.random() - 0.5;
    
    // Combine base, context, and noise
    const rawActivation = baseActivation * (0.3 + 0.7 * contextInfluence) + noise * 0.1;
    activation.push(Math.max(0, Math.min(1, rawActivation)));
  }
  
  return activation;
}

/**
 * Generate brain wave frequencies (simplified)
 */
function generateBrainWaves(
  focusLevel: number,
  context: string
): NP['brainWaveFrequency'] {
  // Normalize focus to 0-1 range
  const focus = Math.min(1, Math.max(0, focusLevel / 100));
  
  // Base frequencies (simplified Hz representation)
  let delta = 2 + Math.random() * 2;      // 0.5-4 Hz (sleep)
  let theta = 5 + Math.random() * 3;      // 4-8 Hz (meditation)
  let alpha = 10 + Math.random() * 4;     // 8-12 Hz (relaxed)
  let beta = 20 + Math.random() * 10;     // 12-30 Hz (focused)
  let gamma = 40 + Math.random() * 20;    // 30+ Hz (insight)
  
  // Adjust based on focus level
  const focusMultiplier = 0.5 + focus * 1.5;
  beta *= focusMultiplier;
  gamma *= focusMultiplier * 0.8;
  
  // Adjust based on context
  switch (context) {
    case 'visual':
      alpha *= 1.2;
      break;
    case 'auditory':
      theta *= 1.2;
      break;
    case 'problem-solving':
      gamma *= 1.5;
      beta *= 1.3;
      break;
    case 'memory':
      theta *= 1.1;
      alpha *= 1.1;
      break;
  }
  
  // Add small random variation
  const variation = () => 1 + (Math.random() - 0.5) * 0.1;
  
  return {
    delta: Math.max(0, delta * variation()),
    theta: Math.max(0, theta * variation()),
    alpha: Math.max(0, alpha * variation()),
    beta: Math.max(0, beta * variation()),
    gamma: Math.max(0, gamma * variation())
  };
}

/**
 * Determine dominant brain wave frequency
 */
function getDominantFrequency(
  brainWaves: NP['brainWaveFrequency']
): string {
  const frequencies = [
    { name: 'delta', value: brainWaves.delta },
    { name: 'theta', value: brainWaves.theta },
    { name: 'alpha', value: brainWaves.alpha },
    { name: 'beta', value: brainWaves.beta },
    { name: 'gamma', value: brainWaves.gamma }
  ];
  
  return frequencies.reduce((prev, curr) =>
    curr.value > prev.value ? curr : prev
  ).name;
}

/**
 * Calculate neuroplasticity score
 * Based on neuron activation diversity
 */
function calculateNeuroplasticity(activation: number[]): number {
  // Calculate Shannon entropy as measure of neural diversity
  const mean = activation.reduce((a, b) => a + b) / activation.length;
  const variance = activation.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / activation.length;
  
  // Higher variance = more flexible = higher neuroplasticity
  const plasticity = Math.min(100, variance * 500);
  
  // Add base plasticity (all brains have some)
  return Math.max(30, plasticity);
}

/**
 * Calculate learning readiness
 * Based on focus level and optimal brain wave patterns
 */
function calculateLearningReadiness(
  focusLevel: number,
  brainWaves: NP['brainWaveFrequency']
): number {
  // Focus component
  const focusComponent = focusLevel;
  
  // Brain wave component - optimal is balanced but with strong beta/gamma
  const betaGammaScore = (brainWaves.beta + brainWaves.gamma) / 60 * 100; // Scale to ~0-100
  const deltaComponent = Math.max(0, 20 - brainWaves.delta); // Lower delta (sleep) is better
  
  // Combine components
  const readiness = (focusComponent * 0.4 + betaGammaScore * 0.4 + deltaComponent * 0.2);
  
  return Math.min(100, Math.max(0, readiness));
}

/**
 * Generate synaptic strength matrix (connections between neurons)
 */
function generateSynapticStrengths(activation: number[]): Record<string, number> {
  const strengths: Record<string, number> = {};
  
  // Create connections between nearby neurons (biological realism)
  const connectionRadius = 10;
  const samples = 100; // Sample instead of all pairs for performance
  
  for (let i = 0; i < samples; i++) {
    const neuronA = Math.floor(Math.random() * activation.length);
    const neuronB = Math.floor(
      Math.random() * (connectionRadius * 2 + 1) - connectionRadius + neuronA
    );
    
    if (neuronB >= 0 && neuronB < activation.length && neuronA !== neuronB) {
      const key = `${neuronA}-${neuronB}`;
      // Synaptic strength is influenced by both neurons' activation levels
      strengths[key] = (activation[neuronA] + activation[neuronB]) / 2;
    }
  }
  
  return strengths;
}

/**
 * Generate hash for pattern verification
 */
function generatePatternHash(
  activation: number[],
  brainWaves: NP['brainWaveFrequency'],
  focusLevel: number
): string {
  // Simple hash: combine key metrics
  const activationSum = activation.reduce((a, b) => a + b, 0);
  const waveSum = brainWaves.delta + brainWaves.theta + brainWaves.alpha + 
                   brainWaves.beta + brainWaves.gamma;
  
  const combined = activationSum + waveSum + focusLevel;
  
  // Convert to hex string
  return combined.toString(16).slice(0, 16).padEnd(16, '0');
}

/**
 * Simulate neural pattern evolution during learning
 * Shows how brain adapts as learning progresses
 */
export function evolveNeuralPattern(
  currentPattern: NeuralPattern,
  learningTime: number, // ms of learning
  skillDifficulty: number, // 1-5
  successRate: number // 0-1
): NeuralPattern {
  const speedFactor = (learningTime / 1000) * (successRate * 0.1); // Adaptation speed
  
  // Gradually increase focus with learning
  const newFocusLevel = Math.min(
    100,
    currentPattern.focusLevel + speedFactor * (skillDifficulty / 5) * 5
  );
  
  // Gradually increase neuroplasticity with successful learning
  const newNeuroplasticity = Math.min(
    100,
    currentPattern.neuroplasticity + speedFactor * successRate * 3
  );
  
  // Shift neural activation to become more specialized over time
  const newActivation = currentPattern.neuronActivation.map((val, idx) => {
    // Strengthen patterns associated with current focus
    if (successRate > 0.5) {
      // Strengthen active neurons
      return Math.min(1, val + speedFactor * val * 0.2);
    } else {
      // Distribute activation more broadly during struggles
      return Math.max(0, val - speedFactor * 0.05);
    }
  });
  
  return {
    ...currentPattern,
    id: `pattern_evolved_${currentPattern.id}`,
    timestamp: Date.now(),
    focusLevel: newFocusLevel,
    neuroplasticity: newNeuroplasticity,
    neuronActivation: newActivation,
    learningVelocity: currentPattern.learningVelocity * (1 + speedFactor * 0.1),
    memoryCapacity: Math.min(100, currentPattern.memoryCapacity + speedFactor * 2),
    patternHash: generatePatternHash(newActivation, currentPattern.brainWaveFrequency, newFocusLevel),
    learningReadiness: calculateLearningReadiness(newFocusLevel, currentPattern.brainWaveFrequency)
  };
}

/**
 * Calculate similarity between two neural patterns
 * Returns 0-1 (1 = identical)
 */
export function calculatePatternSimilarity(
  pattern1: NeuralPattern,
  pattern2: NeuralPattern
): number {
  // Compare key metrics
  const focusDiff = Math.abs(pattern1.focusLevel - pattern2.focusLevel) / 100;
  const neuroplasticityDiff = Math.abs(pattern1.neuroplasticity - pattern2.neuroplasticity) / 100;
  
  // Compare activation arrays (sample based on performance)
  let activationDiff = 0;
  const samples = Math.min(100, pattern1.neuronActivation.length);
  for (let i = 0; i < samples; i++) {
    const idx = Math.floor((pattern1.neuronActivation.length / samples) * i);
    activationDiff += Math.abs(
      pattern1.neuronActivation[idx] - pattern2.neuronActivation[idx]
    );
  }
  activationDiff /= samples;
  
  // Weighted average
  const similarity = 1 - (
    focusDiff * 0.3 +
    neuroplasticityDiff * 0.3 +
    activationDiff * 0.4
  );
  
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Detect learning state from neural pattern
 */
export function detectLearningState(
  pattern: NeuralPattern
): 'resting' | 'focused' | 'struggling' | 'breakthrough' {
  const { focusLevel, learningVelocity, brainWaveFrequency } = pattern;
  
  const gammaActivity = brainWaveFrequency.gamma;
  
  if (focusLevel < 30) {
    return 'resting';
  } else if (focusLevel > 80 && gammaActivity > 50) {
    return 'breakthrough';
  } else if (focusLevel > 70 && learningVelocity > 20) {
    return 'focused';
  } else {
    return 'struggling';
  }
}
