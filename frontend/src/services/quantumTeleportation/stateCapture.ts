/**
 * State Capture Service
 * Captures learning states and experiences for quantum teleportation
 */

import type { LearningStateSnapshot } from '@/types/quantum';
import { hashLearningState, generateStateSnapshotId } from '@/utils/stateHash';

class StateCaptureService {
  private captureInterval: number = 5000; // 5 seconds default
  private currentState: Partial<LearningStateSnapshot> = {};
  private stateHistory: LearningStateSnapshot[] = [];
  private maxHistorySize: number = 100;
  private captureTimer: NodeJS.Timeout | null = null;
  private listeners: ((state: LearningStateSnapshot) => void)[] = [];

  /**
   * Initialize state capture with user and location context
   */
  initialize(userId: string, locationId: string, courseId: string, moduleId: string): void {
    this.currentState = {
      userId,
      locationId,
      courseId,
      moduleId,
      comprehensionLevel: 50,
      engagementLevel: 50,
      focusState: 'active',
      memoryState: {},
      thinkingPattern: {},
      emotionalContext: 'neutral',
      interactionMetrics: {},
      version: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Capture a snapshot of current learning state
   */
  captureSnapshot(): LearningStateSnapshot {
    const snapshot: LearningStateSnapshot = {
      id: generateStateSnapshotId(),
      timestamp: Date.now(),
      userId: this.currentState.userId || '',
      locationId: this.currentState.locationId || '',
      courseId: this.currentState.courseId || '',
      moduleId: this.currentState.moduleId || '',
      currentProgress: this.currentState.currentProgress || 0,
      comprehensionLevel: this.currentState.comprehensionLevel || 50,
      engagementLevel: this.currentState.engagementLevel || 50,
      focusState: this.currentState.focusState || 'active',
      memoryState: { ...this.currentState.memoryState },
      thinkingPattern: { ...this.currentState.thinkingPattern },
      emotionalContext: this.currentState.emotionalContext || 'neutral',
      lastAction: this.currentState.lastAction || '',
      actionTimestamp: this.currentState.actionTimestamp || Date.now(),
      interactionMetrics: { ...this.currentState.interactionMetrics },
      version: (this.currentState.version || 0) + 1,
      stateHash: '' // Will be calculated below
    };

    // Calculate state hash
    snapshot.stateHash = hashLearningState(snapshot);

    // Add to history
    this.addToHistory(snapshot);

    // Notify listeners
    this.notifyListeners(snapshot);

    return snapshot;
  }

  /**
   * Update specific aspect of learning state
   */
  updateState(updates: Partial<LearningStateSnapshot>): void {
    this.currentState = { ...this.currentState, ...updates };
  }

  /**
   * Record user action
   */
  recordAction(action: string, metrics?: Record<string, number>): void {
    this.currentState.lastAction = action;
    this.currentState.actionTimestamp = Date.now();

    if (metrics) {
      this.currentState.interactionMetrics = {
        ...(this.currentState.interactionMetrics || {}),
        ...metrics
      };
    }
  }

  /**
   * Update comprehension level
   */
  setComprehensionLevel(level: number): void {
    this.currentState.comprehensionLevel = Math.max(0, Math.min(100, level));
  }

  /**
   * Update engagement level
   */
  setEngagementLevel(level: number): void {
    this.currentState.engagementLevel = Math.max(0, Math.min(100, level));
  }

  /**
   * Update focus state
   */
  setFocusState(state: 'active' | 'distracted' | 'deep_focus'): void {
    this.currentState.focusState = state;
  }

  /**
   * Update memory state (for metaphorical cognitive state)
   */
  updateMemoryState(memories: Record<string, any>): void {
    this.currentState.memoryState = {
      ...(this.currentState.memoryState || {}),
      ...memories
    };
  }

  /**
   * Update thinking pattern
   */
  updateThinkingPattern(pattern: Record<string, any>): void {
    this.currentState.thinkingPattern = {
      ...(this.currentState.thinkingPattern || {}),
      ...pattern
    };
  }

  /**
   * Set emotional context
   */
  setEmotionalContext(context: string): void {
    this.currentState.emotionalContext = context;
  }

  /**
   * Update progress
   */
  setProgress(progress: number): void {
    this.currentState.currentProgress = Math.max(0, Math.min(100, progress));
  }

  /**
   * Start automatic snapshot capture
   */
  startAutoCaptureLoop(intervalMs: number = 5000): void {
    this.captureInterval = intervalMs;

    if (this.captureTimer) {
      clearInterval(this.captureTimer);
    }

    this.captureTimer = setInterval(() => {
      this.captureSnapshot();
    }, this.captureInterval);
  }

  /**
   * Stop automatic capture
   */
  stopAutoCaptureLoop(): void {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): Partial<LearningStateSnapshot> {
    return { ...this.currentState };
  }

  /**
   * Get state history
   */
  getHistory(limit: number = 10): LearningStateSnapshot[] {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Subscribe to state changes
   */
  onStateCapture(listener: (state: LearningStateSnapshot) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.stateHistory = [];
  }

  /**
   * Get state statistics
   */
  getStatistics() {
    if (this.stateHistory.length === 0) {
      return {
        totalSnapshots: 0,
        averageComprehension: 0,
        averageEngagement: 0,
        mostCommonFocus: 'unknown',
        totalDuration: 0
      };
    }

    const snapshots = this.stateHistory;
    const avgComprehension = snapshots.reduce((sum, s) => sum + s.comprehensionLevel, 0) / snapshots.length;
    const avgEngagement = snapshots.reduce((sum, s) => sum + s.engagementLevel, 0) / snapshots.length;

    const focusStates = snapshots.reduce((acc, s) => {
      acc[s.focusState] = (acc[s.focusState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonFocus = Object.entries(focusStates).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] || 'unknown';

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const totalDuration = lastSnapshot.timestamp - firstSnapshot.timestamp;

    return {
      totalSnapshots: snapshots.length,
      averageComprehension: Math.round(avgComprehension * 100) / 100,
      averageEngagement: Math.round(avgEngagement * 100) / 100,
      mostCommonFocus,
      totalDuration,
      focusStateDistribution: focusStates
    };
  }

  /**
   * Private: Add snapshot to history
   */
  private addToHistory(snapshot: LearningStateSnapshot): void {
    this.stateHistory.push(snapshot);

    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Private: Notify all listeners
   */
  private notifyListeners(snapshot: LearningStateSnapshot): void {
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }
}

// Export singleton instance
export const stateCaptureService = new StateCaptureService();

export default StateCaptureService;
