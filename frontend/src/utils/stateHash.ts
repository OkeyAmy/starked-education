/**
 * State Hash and Verification Utilities
 * Used to verify learning state integrity during teleportation
 */

import type { LearningStateSnapshot } from '@/types/quantum';
import crypto from 'crypto';

/**
 * Generate deterministic hash of a learning state snapshot
 */
export function hashLearningState(state: LearningStateSnapshot): string {
  // Create canonical JSON representation for consistent hashing
  const canonical = JSON.stringify({
    userId: state.userId,
    locationId: state.locationId,
    courseId: state.courseId,
    moduleId: state.moduleId,
    currentProgress: state.currentProgress,
    comprehensionLevel: state.comprehensionLevel,
    engagementLevel: state.engagementLevel,
    focusState: state.focusState,
    memoryState: state.memoryState,
    thinkingPattern: state.thinkingPattern,
    emotionalContext: state.emotionalContext,
    lastAction: state.lastAction,
    actionTimestamp: state.actionTimestamp,
    interactionMetrics: state.interactionMetrics,
    version: state.version
  });
  
  return crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');
}

/**
 * Verify state hasn't been corrupted during transfer
 */
export function verifyStateIntegrity(
  state: LearningStateSnapshot,
  expectedHash: string
): boolean {
  const calculatedHash = hashLearningState(state);
  return calculatedHash === expectedHash;
}

/**
 * Create a state verification token
 */
export function createStateVerificationToken(state: LearningStateSnapshot): string {
  const hash = hashLearningState(state);
  const timestamp = Date.now();
  const token = `${hash}:${timestamp}`;
  
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Calculate state similarity between two learning states (0-1)
 * Used for conflict resolution in CRDT-like reconciliation
 */
export function calculateStateSimilarity(
  state1: LearningStateSnapshot,
  state2: LearningStateSnapshot
): number {
  let matches = 0;
  let total = 0;
  
  // Compare key metrics
  const metrics = [
    'userId', 'courseId', 'moduleId', 'currentProgress',
    'comprehensionLevel', 'engagementLevel', 'focusState',
    'lastAction', 'version'
  ] as const;
  
  for (const metric of metrics) {
    total++;
    if (state1[metric] === state2[metric]) {
      matches++;
    }
  }
  
  // Compare interaction metrics similarity
  total++;
  let metricsMatch = 0;
  const keys1 = Object.keys(state1.interactionMetrics || {});
  const keys2 = Object.keys(state2.interactionMetrics || {});
  
  if (keys1.length === keys2.length) {
    for (const key of keys1) {
      if (state1.interactionMetrics?.[key] === state2.interactionMetrics?.[key]) {
        metricsMatch++;
      }
    }
    if (metricsMatch === keys1.length) matches++;
  }
  
  return matches / total;
}

/**
 * Merge two learning states intelligently (for eventual consistency)
 */
export function mergeLearningstates(
  local: LearningStateSnapshot,
  remote: LearningStateSnapshot
): LearningStateSnapshot {
  // Remote state takes precedence if more recent
  const isRemoteNewer = remote.timestamp > local.timestamp;
  
  if (isRemoteNewer) {
    return {
      ...remote,
      // Preserve local emotional context if present
      emotionalContext: remote.emotionalContext || local.emotionalContext
    };
  }
  
  return local;
}

/**
 * Generate state snapshot ID
 */
export function generateStateSnapshotId(): string {
  return crypto
    .randomBytes(16)
    .toString('hex');
}

/**
 * Create a state changelog entry
 */
export interface StateChangelogEntry {
  timestamp: number;
  stateId: string;
  previousHash: string;
  newHash: string;
  changeType: 'transfer' | 'merge' | 'correction' | 'sync';
  sourceLocationId: string;
}

/**
 * Generate state changelog entry
 */
export function createStateChangelogEntry(
  stateId: string,
  previousHash: string,
  newHash: string,
  changeType: StateChangelogEntry['changeType'],
  sourceLocationId: string
): StateChangelogEntry {
  return {
    timestamp: Date.now(),
    stateId,
    previousHash,
    newHash,
    changeType,
    sourceLocationId
  };
}
