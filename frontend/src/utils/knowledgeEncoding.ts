/**
 * Knowledge Encoding Utility
 * Handles compression, encoding, and atomization of knowledge for nanotechnology transfer
 */

import type { EncodedKnowledge, Skill } from '../types/nanotech';

/**
 * Encode skill knowledge for nanotechnology transfer
 */
export function encodeSkill(skill: Skill): EncodedKnowledge {
  const originalSize = estimateSkillSize(skill);
  
  // Apply compression algorithm
  const { compressedSize, compressionRatio } = compressKnowledge(originalSize);
  
  // Atomize concepts
  const concepts = atomizeConcepts(skill);
  
  // Calculate transfer properties
  const fragmentSize = 1024; // 1KB fragments
  const bandwidth = 1000000; // 1 Mbps baseline
  const estimatedTransferTime = calculateTransferTime(
    compressedSize,
    bandwidth,
    100 // 100x natural speed
  );
  
  // Generate verification
  const contentHash = generateContentHash(skill);
  const checksum = generateChecksum(skill);
  
  return {
    id: `knowledge_${skill.id}_${Date.now()}`,
    skillId: skill.id,
    originalSize,
    compressedSize,
    compressionRatio,
    algorithm: selectCompressionAlgorithm(skill.category),
    concepts,
    requiredBandwidth: bandwidth,
    estimatedTransferTime,
    fragmentSize,
    checksum,
    contentHash,
    verified: false
  };
}

/**
 * Estimate original knowledge size in bytes
 */
function estimateSkillSize(skill: Skill): number {
  // Base size for skill metadata
  let size = 512; // Base metadata
  
  // Add concept size (each concept ~500 bytes)
  size += skill.knowledgeBlocks.length * 500;
  
  // Add test question size
  size += skill.testQuestions.length * 300;
  
  // Add difficulty multiplier
  size *= skill.difficulty; // Harder skills have more content
  
  return Math.round(size);
}

/**
 * Compress knowledge and return compressed size
 */
function compressKnowledge(
  originalSize: number
): { compressedSize: number; compressionRatio: number } {
  // Simulate realistic compression ratios
  // Technical/cognitive skills: 0.6-0.7 ratio
  // Motor skills: 0.5-0.65 ratio
  // Creative skills: 0.7-0.8 ratio
  
  const baseRatio = 0.65;
  const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
  const compressionRatio = Math.max(0.3, Math.min(0.9, baseRatio + variation));
  
  const compressedSize = Math.round(originalSize * compressionRatio);
  
  return { compressedSize, compressionRatio };
}

/**
 * Select compression algorithm based on skill category
 */
function selectCompressionAlgorithm(
  category: 'technical' | 'cognitive' | 'motor' | 'creative'
): 'heuristic' | 'neural' | 'semantic' {
  const algorithms: Record<typeof category, 'heuristic' | 'neural' | 'semantic'> = {
    'technical': 'semantic',    // Semantic compression for concepts
    'cognitive': 'neural',      // Neural networks for abstract concepts
    'motor': 'heuristic',       // Pattern-based for motor sequences
    'creative': 'semantic'      // Semantic for creative knowledge
  };
  
  return algorithms[category];
}

/**
 * Atomize skill concepts into granular knowledge pieces
 */
function atomizeConcepts(skill: Skill): EncodedKnowledge['concepts'] {
  const baseAtomCount = 5 + skill.difficulty * 2; // 7-15 concepts based on difficulty
  const concepts: EncodedKnowledge['concepts'] = [];
  
  for (let i = 0; i < baseAtomCount; i++) {
    const importance = Math.max(0.3, 1 - (i * 0.1)); // Decreasing importance
    
    concepts.push({
      id: `concept_${skill.id}_${i}`,
      name: generateConceptName(skill.category, i),
      importance,
      prerequisites: generatePrerequisites(concepts, i),
      relatedConcepts: generateRelatedConcepts(concepts, i)
    });
  }
  
  return concepts;
}

/**
 * Generate concept name based on category
 */
function generateConceptName(
  category: 'technical' | 'cognitive' | 'motor' | 'creative',
  index: number
): string {
  const nameMaps: Record<typeof category, string[]> = {
    'technical': [
      'Fundamentals',
      'Core Patterns',
      'Advanced Techniques',
      'Integration Methods',
      'Optimization',
      'Edge Cases',
      'Best Practices'
    ],
    'cognitive': [
      'Foundational Understanding',
      'Pattern Recognition',
      'Deep Analysis',
      'Critical Thinking',
      'Application',
      'Synthesis',
      'Meta-cognition'
    ],
    'motor': [
      'Basic Movement',
      'Muscle Memory',
      'Coordination',
      'Precision',
      'Speed Development',
      'Complex Sequences',
      'Adaptive Control'
    ],
    'creative': [
      'Ideation Basics',
      'Creative Tools',
      'Compositional Rules',
      'Expression Techniques',
      'Innovation Methods',
      'Refinement',
      'Mastery Expression'
    ]
  };
  
  const names = nameMaps[category];
  return names[Math.min(index, names.length - 1)];
}

/**
 * Generate prerequisite concepts
 */
function generatePrerequisites(
  existingConcepts: EncodedKnowledge['concepts'],
  currentIndex: number
): string[] {
  if (currentIndex === 0) return [];
  
  // 0-2 prerequisites from earlier concepts
  const prereqCount = Math.min(2, currentIndex);
  const prerequisites: string[] = [];
  
  for (let i = 0; i < prereqCount; i++) {
    const prereqIndex = Math.floor(Math.random() * currentIndex);
    prerequisites.push(existingConcepts[prereqIndex]?.id || '');
  }
  
  return prerequisites.filter(Boolean);
}

/**
 * Generate related concepts
 */
function generateRelatedConcepts(
  existingConcepts: EncodedKnowledge['concepts'],
  currentIndex: number
): string[] {
  if (existingConcepts.length === 0) return [];
  
  // 0-3 related concepts
  const relatedCount = Math.min(3, Math.floor(Math.random() * 4));
  const related: string[] = [];
  
  for (let i = 0; i < relatedCount; i++) {
    let relatedIndex = Math.floor(Math.random() * existingConcepts.length);
    
    // Don't relate to self
    while (relatedIndex === currentIndex && existingConcepts.length > 1) {
      relatedIndex = Math.floor(Math.random() * existingConcepts.length);
    }
    
    related.push(existingConcepts[relatedIndex]?.id || '');
  }
  
  return related.filter(Boolean);
}

/**
 * Calculate estimated transfer time at given bandwidth
 */
function calculateTransferTime(
  sizeBytes: number,
  bandwidthBps: number,
  speedMultiplier: number
): number {
  const timeSeconds = (sizeBytes * 8) / bandwidthBps;
  const timeMs = timeSeconds * 1000;
  
  // Reduce by speed multiplier
  return Math.round(timeMs / speedMultiplier);
}

/**
 * Generate content hash for verification
 */
function generateContentHash(skill: Skill): string {
  // Simple hash based on skill properties
  const combined =
    skill.id +
    skill.name +
    skill.category +
    skill.difficulty +
    skill.knowledgeBlocks.length +
    skill.testQuestions.length;
  
  // Convert to hash (simplified)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

/**
 * Generate checksum for integrity verification
 */
function generateChecksum(skill: Skill): string {
  const data =
    skill.name +
    skill.category +
    skill.difficulty +
    skill.knowledgeBlocks.map(kb => kb.id).join('|') +
    skill.testQuestions.map(q => q.question).join('|');
  
  // Simple checksum
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum += data.charCodeAt(i);
  }
  
  return checksum.toString(16).padStart(8, '0');
}

/**
 * Verify encoded knowledge integrity
 */
export function verifyEncodedKnowledge(
  encoded: EncodedKnowledge,
  original: Skill
): boolean {
  // Verify checksum
  const expectedChecksum = generateChecksum(original);
  if (encoded.checksum !== expectedChecksum) {
    console.warn('Checksum mismatch during verification');
    return false;
  }
  
  // Verify content hash
  const expectedHash = generateContentHash(original);
  if (encoded.contentHash !== expectedHash) {
    console.warn('Content hash mismatch during verification');
    return false;
  }
  
  // Verify compression ratio is realistic
  if (encoded.compressionRatio < 0.3 || encoded.compressionRatio > 0.9) {
    console.warn('Compression ratio outside acceptable range');
    return false;
  }
  
  // Verify concepts exist
  if (!encoded.concepts || encoded.concepts.length === 0) {
    console.warn('No concepts found in encoded knowledge');
    return false;
  }
  
  return true;
}

/**
 * Fragment encoded knowledge for transfer
 */
export function fragmentKnowledge(
  encoded: EncodedKnowledge
): { fragmentId: string; data: string; sequence: number; totalFragments: number }[] {
  const fragments = [];
  const totalFragments = Math.ceil(encoded.compressedSize / encoded.fragmentSize);
  
  // Create fragment metadata
  const fragmentData = {
    id: encoded.id,
    checksum: encoded.checksum,
    contentHash: encoded.contentHash,
    totalSize: encoded.compressedSize,
    fragmentSize: encoded.fragmentSize,
    totalFragments
  };
  
  for (let i = 0; i < totalFragments; i++) {
    const startPos = i * encoded.fragmentSize;
    const endPos = Math.min(startPos + encoded.fragmentSize, encoded.compressedSize);
    const fragmentSize = endPos - startPos;
    
    fragments.push({
      fragmentId: `${encoded.id}_${i}`,
      data: JSON.stringify({
        ...fragmentData,
        sequence: i,
        data: `[compressed_data_${i}_${fragmentSize}_bytes]`
      }),
      sequence: i,
      totalFragments
    });
  }
  
  return fragments;
}

/**
 * Reconstruct knowledge from fragments
 */
export function reconstructKnowledge(
  fragments: ReturnType<typeof fragmentKnowledge>
): EncodedKnowledge | null {
  if (!fragments || fragments.length === 0) {
    return null;
  }
  
  // Sort fragments by sequence
  const sorted = [...fragments].sort((a, b) => a.sequence - b.sequence);
  
  // Verify all fragments present
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sequence !== i) {
      console.error('Missing fragment in sequence');
      return null;
    }
  }
  
  // Reconstruct (simplified - actual would decompress)
  try {
    const firstFragment = JSON.parse(sorted[0].data);
    
    return {
      id: firstFragment.id,
      skillId: firstFragment.id.replace('knowledge_', '').split('_')[0],
      originalSize: firstFragment.totalSize * 1.4, // Approximate original
      compressedSize: firstFragment.totalSize,
      compressionRatio: 0.7,
      algorithm: 'heuristic',
      concepts: [],
      requiredBandwidth: 1000000,
      estimatedTransferTime: 0,
      fragmentSize: firstFragment.fragmentSize,
      checksum: firstFragment.checksum,
      contentHash: firstFragment.contentHash,
      verified: false
    };
  } catch {
    console.error('Failed to reconstruct knowledge');
    return null;
  }
}

/**
 * Calculate compression effectiveness
 */
export function calculateCompressionRatio(original: Skill): number {
  const originalSize = estimateSkillSize(original);
  const { compressionRatio } = compressKnowledge(originalSize);
  
  return compressionRatio;
}

/**
 * Estimate skill mastery time with nanotechnology
 */
export function estimateMasteryTime(
  skill: Skill,
  baseLearningVelocity: number = 1,
  nanobotSwarmSize: number = 1000
): number {
  // Base time: skill difficulty-based
  let baseTime = 3600000 * skill.difficulty; // 1 hour per difficulty level
  
  // Adjust for learning velocity
  baseTime /= baseLearningVelocity;
  
  // Reduce by swarm optimization factor
  const swarmFactor = Math.min(100, Math.max(1, nanobotSwarmSize / 100));
  baseTime /= Math.log(swarmFactor + 1);
  
  return Math.round(baseTime);
}
