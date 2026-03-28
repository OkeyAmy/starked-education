/**
 * Knowledge Encoder Service
 * Manages skill knowledge encoding, compression, fragmentation, and transmission
 */

import type { EncodedKnowledge, Skill } from '../types/nanotech';
import {
  encodeSkill,
  verifyEncodedKnowledge,
  fragmentKnowledge,
  reconstructKnowledge,
  calculateCompressionRatio
} from '../utils/knowledgeEncoding';

/**
 * Singleton instance
 */
let instance: KnowledgeEncoderService | null = null;

/**
 * Knowledge Encoder Service
 */
class KnowledgeEncoderService {
  private encodedSkills: Map<string, EncodedKnowledge> = new Map();
  private fragmentIndex: Map<string, ReturnType<typeof fragmentKnowledge>> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.registerListeners();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'encodingStarted',
      'encodingComplete',
      'fragmentationComplete',
      'verificationComplete',
      'transmissionStarted',
      'transmissionComplete',
      'reconstructionComplete'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to encoder events
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Emit events
   */
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Encode skill for transmission
   */
  async encodeSkillForTransfer(skill: Skill): Promise<EncodedKnowledge> {
    this.emit('encodingStarted', {
      skillId: skill.id,
      skillName: skill.name,
      timestamp: Date.now()
    });

    // Encode the skill
    const encoded = encodeSkill(skill);

    // Store for later use
    this.encodedSkills.set(skill.id, encoded);

    this.emit('encodingComplete', {
      skillId: skill.id,
      originalSize: encoded.originalSize,
      compressedSize: encoded.compressedSize,
      compressionRatio: encoded.compressionRatio,
      algorithm: encoded.algorithm,
      conceptCount: encoded.concepts.length
    });

    return encoded;
  }

  /**
   * Fragment encoded knowledge
   */
  async fragmentEncodedKnowledge(
    skillId: string
  ): Promise<ReturnType<typeof fragmentKnowledge>> {
    const encoded = this.encodedSkills.get(skillId);
    if (!encoded) {
      throw new Error(`Encoded knowledge not found for skill ${skillId}`);
    }

    const fragments = fragmentKnowledge(encoded);
    this.fragmentIndex.set(skillId, fragments);

    this.emit('fragmentationComplete', {
      skillId,
      fragmentCount: fragments.length,
      totalSize: encoded.compressedSize,
      fragmentSize: encoded.fragmentSize
    });

    return fragments;
  }

  /**
   * Get knowledge fragments
   */
  getKnowledgeFragments(
    skillId: string
  ): ReturnType<typeof fragmentKnowledge> | null {
    return this.fragmentIndex.get(skillId) || null;
  }

  /**
   * Transmit knowledge fragments (simulated)
   */
  async transmitFragments(
    skillId: string,
    fragmentIds: string[],
    bandwidth: number = 1000000, // bits per second
    speedMultiplier: number = 100
  ): Promise<{
    transmitted: number;
    failed: number;
    estimatedTime: number;
    successRate: number;
  }> {
    const fragments = this.fragmentIndex.get(skillId);
    if (!fragments) {
      throw new Error(`Fragments not found for skill ${skillId}`);
    }

    this.emit('transmissionStarted', {
      skillId,
      fragmentCount: fragmentIds.length,
      estimatedTime: this.calculateTransferTime(fragments, bandwidth, speedMultiplier)
    });

    // Simulate transmission with realistic success rate
    let transmitted = 0;
    let failed = 0;

    for (const fragmentId of fragmentIds) {
      const fragment = fragments.find(f => f.fragmentId === fragmentId);
      if (!fragment) continue;

      // 95% success rate per fragment
      if (Math.random() > 0.05) {
        transmitted++;
      } else {
        failed++;
      }
    }

    const successRate = transmitted / fragmentIds.length;

    this.emit('transmissionComplete', {
      skillId,
      transmitted,
      failed,
      successRate,
      timestamp: Date.now()
    });

    return {
      transmitted,
      failed,
      estimatedTime: this.calculateTransferTime(fragments, bandwidth, speedMultiplier),
      successRate
    };
  }

  /**
   * Calculate transfer time
   */
  private calculateTransferTime(
    fragments: ReturnType<typeof fragmentKnowledge>,
    bandwidth: number,
    speedMultiplier: number
  ): number {
    const totalBits = fragments.reduce((sum, f) => sum + JSON.stringify(f.data).length * 8, 0);
    const timeSeconds = totalBits / bandwidth;
    const timeMs = timeSeconds * 1000;

    return Math.round(timeMs / speedMultiplier);
  }

  /**
   * Verify encoded knowledge integrity
   */
  async verifyKnowledgeIntegrity(skillId: string, skill: Skill): Promise<boolean> {
    const encoded = this.encodedSkills.get(skillId);
    if (!encoded) {
      throw new Error(`Encoded knowledge not found for skill ${skillId}`);
    }

    const isValid = verifyEncodedKnowledge(encoded, skill);

    this.emit('verificationComplete', {
      skillId,
      verified: isValid,
      checksum: encoded.checksum,
      contentHash: encoded.contentHash,
      timestamp: Date.now()
    });

    if (isValid) {
      // Mark as verified
      encoded.verified = true;
    }

    return isValid;
  }

  /**
   * Reconstruct knowledge from fragments
   */
  async reconstructKnowledgeFromFragments(
    skillId: string,
    receivedFragments: ReturnType<typeof fragmentKnowledge>
  ): Promise<EncodedKnowledge | null> {
    const reconstructed = reconstructKnowledge(receivedFragments);

    if (reconstructed) {
      this.encodedSkills.set(skillId, reconstructed);

      this.emit('reconstructionComplete', {
        skillId,
        success: true,
        compressedSize: reconstructed.compressedSize,
        fragmentCount: receivedFragments.length,
        timestamp: Date.now()
      });
    } else {
      this.emit('reconstructionComplete', {
        skillId,
        success: false,
        timestamp: Date.now()
      });
    }

    return reconstructed;
  }

  /**
   * Get encoded knowledge
   */
  getEncodedKnowledge(skillId: string): EncodedKnowledge | null {
    return this.encodedSkills.get(skillId) || null;
  }

  /**
   * Get encoding statistics
   */
  getEncodingStats(skillId: string): {
    skillId: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    fragmentCount: number;
    algorithm: string;
    verified: boolean;
  } | null {
    const encoded = this.encodedSkills.get(skillId);
    if (!encoded) {
      return null;
    }

    const fragments = this.fragmentIndex.get(skillId);

    return {
      skillId,
      originalSize: encoded.originalSize,
      compressedSize: encoded.compressedSize,
      compressionRatio: encoded.compressionRatio,
      fragmentCount: fragments?.length || 0,
      algorithm: encoded.algorithm,
      verified: encoded.verified
    };
  }

  /**
   * Get concept structure for skill
   */
  getConceptStructure(skillId: string): EncodedKnowledge['concepts'] | null {
    const encoded = this.encodedSkills.get(skillId);
    if (!encoded) {
      return null;
    }

    return encoded.concepts;
  }

  /**
   * Analyze concept dependencies
   */
  analyzeConceptDependencies(skillId: string): {
    conceptMap: Map<string, string[]>;
    linearPath: string[];
    criticalConcepts: string[];
  } | null {
    const encoded = this.encodedSkills.get(skillId);
    if (!encoded) {
      return null;
    }

    // Build concept dependency map
    const conceptMap = new Map<string, string[]>();
    const criticalConcepts: string[] = [];

    encoded.concepts.forEach(concept => {
      conceptMap.set(concept.id, concept.prerequisites);

      // Critical if high importance and has many prerequisites
      if (concept.importance > 0.7 && concept.prerequisites.length > 1) {
        criticalConcepts.push(concept.id);
      }
    });

    // Build linear learning path (topological sort simplified)
    const linearPath: string[] = [];
    const visited = new Set<string>();

    const topologicalSort = (conceptId: string) => {
      if (visited.has(conceptId)) return;
      visited.add(conceptId);

      const concept = encoded.concepts.find(c => c.id === conceptId);
      if (concept) {
        concept.prerequisites.forEach(prereq => topologicalSort(prereq));
        linearPath.push(conceptId);
      }
    };

    encoded.concepts.forEach(concept => topologicalSort(concept.id));

    return {
      conceptMap,
      linearPath,
      criticalConcepts
    };
  }

  /**
   * Clear cached encodings
   */
  clearCache(): void {
    this.encodedSkills.clear();
    this.fragmentIndex.clear();
  }

  /**
   * Reset service
   */
  reset(): void {
    this.clearCache();
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getKnowledgeEncoderService(): KnowledgeEncoderService {
  if (!instance) {
    instance = new KnowledgeEncoderService();
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetKnowledgeEncoderService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { KnowledgeEncoderService };
