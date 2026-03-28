/**
 * State Tomography Service
 * Reconstructs learning states and performs conflict resolution
 */

import type { LearningStateSnapshot } from '@/types/quantum';
import {
  hashLearningState,
  verifyStateIntegrity,
  calculateStateSimilarity,
  mergeLearningstates,
  createStateChangelogEntry,
  type StateChangelogEntry
} from '@/utils/stateHash';

class StateTomographyService {
  private stateVersions: Map<string, LearningStateSnapshot[]> = new Map();
  private stateChangelog: StateChangelogEntry[] = [];
  private maxVersionsPerState: number = 50;
  private onStateUpdateListeners: Array<(state: LearningStateSnapshot) => void> = [];

  /**
   * Store a state snapshot version
   */
  storeStateVersion(state: LearningStateSnapshot): void {
    const key = `${state.userId}-${state.courseId}-${state.moduleId}`;
    const versions = this.stateVersions.get(key) || [];

    versions.push(state);

    // Keep only last N versions
    if (versions.length > this.maxVersionsPerState) {
      versions.shift();
    }

    this.stateVersions.set(key, versions);
  }

  /**
   * Get state versions for a user/course/module combination
   */
  getStateVersions(userId: string, courseId: string, moduleId: string): LearningStateSnapshot[] {
    const key = `${userId}-${courseId}-${moduleId}`;
    return this.stateVersions.get(key) || [];
  }

  /**
   * Get latest state version
   */
  getLatestState(userId: string, courseId: string, moduleId: string): LearningStateSnapshot | null {
    const versions = this.getStateVersions(userId, courseId, moduleId);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  /**
   * Reconstruct state from versions (state tomography)
   */
  reconstructState(userId: string, courseId: string, moduleId: string): LearningStateSnapshot | null {
    const versions = this.getStateVersions(userId, courseId, moduleId);

    if (versions.length === 0) return null;

    // Use the latest version as base
    const reconstructed: LearningStateSnapshot = { ...versions[versions.length - 1] };

    // Merge metrics from recent versions
    const recentVersions = versions.slice(-10);
    let totalComprehension = 0;
    let totalEngagement = 0;

    for (const version of recentVersions) {
      totalComprehension += version.comprehensionLevel;
      totalEngagement += version.engagementLevel;
    }

    reconstructed.comprehensionLevel = Math.round(totalComprehension / recentVersions.length);
    reconstructed.engagementLevel = Math.round(totalEngagement / recentVersions.length);

    // Verify integrity
    const expectedHash = hashLearningState(reconstructed);
    reconstructed.stateHash = expectedHash;

    return reconstructed;
  }

  /**
   * Verify state integrity
   */
  verifyStateIntegrity(state: LearningStateSnapshot, expectedHash: string): boolean {
    return verifyStateIntegrity(state, expectedHash);
  }

  /**
   * Perform conflict resolution when states differ
   */
  resolveConflict(
    state1: LearningStateSnapshot,
    state2: LearningStateSnapshot
  ): { resolved: LearningStateSnapshot, conflict: boolean, strategy: string } {
    // Check if states are identical
    if (hashLearningState(state1) === hashLearningState(state2)) {
      return {
        resolved: state1,
        conflict: false,
        strategy: 'identical'
      };
    }

    // Calculate similarity
    const similarity = calculateStateSimilarity(state1, state2);

    // If very similar, merge intelligently
    if (similarity > 0.8) {
      const merged = mergeLearningstates(state1, state2);
      return {
        resolved: merged,
        conflict: true,
        strategy: 'merge_high_similarity'
      };
    }

    // If remote is much newer, prefer remote
    if (state2.timestamp > state1.timestamp + 5000) {
      return {
        resolved: state2,
        conflict: true,
        strategy: 'prefer_newer'
      };
    }

    // If similar progress, prefer higher engagement
    if (Math.abs(state1.currentProgress - state2.currentProgress) < 5) {
      const resolved = state2.engagementLevel > state1.engagementLevel ? state2 : state1;
      return {
        resolved,
        conflict: true,
        strategy: 'prefer_higher_engagement'
      };
    }

    // Default: prefer the one with more recent action
    const resolved =
      state2.actionTimestamp > state1.actionTimestamp ? state2 : state1;

    return {
      resolved,
      conflict: true,
      strategy: 'prefer_recent_action'
    };
  }

  /**
   * Record state change in changelog
   */
  recordStateChange(
    stateId: string,
    previousHash: string,
    newHash: string,
    changeType: StateChangelogEntry['changeType'],
    sourceLocationId: string
  ): void {
    const entry = createStateChangelogEntry(
      stateId,
      previousHash,
      newHash,
      changeType,
      sourceLocationId
    );

    this.stateChangelog.push(entry);

    // Keep only last 1000 changes
    if (this.stateChangelog.length > 1000) {
      this.stateChangelog.shift();
    }
  }

  /**
   * Get state changelog
   */
  getChangelog(limit: number = 100): StateChangelogEntry[] {
    return this.stateChangelog.slice(-limit);
  }

  /**
   * Calculate state consistency across versions
   */
  calculateConsistency(userId: string, courseId: string, moduleId: string): number {
    const versions = this.getStateVersions(userId, courseId, moduleId);

    if (versions.length < 2) return 100; // 100% consistent if only one version

    let totalSimilarity = 0;
    for (let i = 1; i < versions.length; i++) {
      totalSimilarity += calculateStateSimilarity(versions[i - 1], versions[i]);
    }

    const avgSimilarity = totalSimilarity / (versions.length - 1);
    return Math.round(avgSimilarity * 100);
  }

  /**
   * Detect anomalies in state progression
   */
  detectAnomalies(
    userId: string,
    courseId: string,
    moduleId: string
  ): Array<{ version: number, anomaly: string, severity: 'low' | 'medium' | 'high' }> {
    const versions = this.getStateVersions(userId, courseId, moduleId);
    const anomalies: Array<{
      version: number;
      anomaly: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1];
      const current = versions[i];

      // Detect sudden comprehension drop
      if (current.comprehensionLevel < prev.comprehensionLevel - 20) {
        anomalies.push({
          version: i,
          anomaly: 'Sudden comprehension drop',
          severity: 'medium'
        });
      }

      // Detect engagement crash
      if (
        current.engagementLevel < 20 &&
        prev.engagementLevel > 80
      ) {
        anomalies.push({
          version: i,
          anomaly: 'Engagement crash detected',
          severity: 'high'
        });
      }

      // Detect inconsistent progress reversal
      if (current.currentProgress < prev.currentProgress - 5) {
        anomalies.push({
          version: i,
          anomaly: 'Unexpected progress reversal',
          severity: 'medium'
        });
      }

      // Detect focus state transitions to distracted for extended period
      if (
        current.focusState === 'distracted' &&
        prev.focusState === 'deep_focus' &&
        current.actionTimestamp - prev.actionTimestamp > 300000
      ) {
        // 5 minutes
        anomalies.push({
          version: i,
          anomaly: 'Extended distraction period',
          severity: 'low'
        });
      }
    }

    return anomalies;
  }

  /**
   * Subscribe to state updates
   */
  onStateUpdate(listener: (state: LearningStateSnapshot) => void): () => void {
    this.onStateUpdateListeners.push(listener);

    return () => {
      this.onStateUpdateListeners = this.onStateUpdateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify state update listeners
   */
  notifyStateUpdate(state: LearningStateSnapshot): void {
    for (const listener of this.onStateUpdateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in state update listener:', err);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const stats = {
      totalStatesStored: 0,
      totalVersions: 0,
      totalChangelogEntries: this.stateChangelog.length
    };

    for (const [, versions] of this.stateVersions) {
      stats.totalStatesStored++;
      stats.totalVersions += versions.length;
    }

    return stats;
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.stateVersions.clear();
    this.stateChangelog = [];
  }
}

// Export singleton instance
export const stateTomographyService = new StateTomographyService();

export default StateTomographyService;
