/**
 * StateTransfer Component
 * Displays learning state capture and transfer controls
 */

'use client';

import React, { useState, useEffect } from 'react';
import { stateCaptureService } from '@/services/quantumTeleportation/stateCapture';
import type { LearningStateSnapshot } from '@/types/quantum';

export function StateTransfer() {
  const [currentState, setCurrentState] = useState<Partial<LearningStateSnapshot> | null>(null);
  const [comprehension, setComprehension] = useState(50);
  const [engagement, setEngagement] = useState(50);
  const [focusState, setFocusState] = useState<'active' | 'distracted' | 'deep_focus'>('active');
  const [stats, setStats] = useState(stateCaptureService.getStatistics());

  useEffect(() => {
    // Update current state periodically
    const interval = setInterval(() => {
      setCurrentState(stateCaptureService.getCurrentState());
      setStats(stateCaptureService.getStatistics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleComprehensionChange = (value: number) => {
    setComprehension(value);
    stateCaptureService.setComprehensionLevel(value);
  };

  const handleEngagementChange = (value: number) => {
    setEngagement(value);
    stateCaptureService.setEngagementLevel(value);
  };

  const handleFocusChange = (newFocus: 'active' | 'distracted' | 'deep_focus') => {
    setFocusState(newFocus);
    stateCaptureService.setFocusState(newFocus);
  };

  const handleCapture = () => {
    stateCaptureService.captureSnapshot();
  };

  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-xl border border-purple-500">
      <h3 className="text-xl font-bold text-purple-300">Learning State Control</h3>

      {/* Comprehension Level */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-300">Comprehension Level</label>
          <span className="text-lg font-mono font-bold text-cyan-400">{comprehension}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={comprehension}
          onChange={e => handleComprehensionChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex gap-2">
          {[0, 25, 50, 75, 100].map(val => (
            <button
              key={val}
              onClick={() => handleComprehensionChange(val)}
              className="flex-1 px-2 py-1 text-xs rounded bg-purple-800 hover:bg-purple-700 text-purple-300 transition"
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Engagement Level */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-300">Engagement Level</label>
          <span className="text-lg font-mono font-bold text-cyan-400">{engagement}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={engagement}
          onChange={e => handleEngagementChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Focus State */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-300">Focus State</label>
        <div className="grid grid-cols-3 gap-2">
          {(['active', 'distracted', 'deep_focus'] as const).map(state => (
            <button
              key={state}
              onClick={() => handleFocusChange(state)}
              className={`px-3 py-2 rounded font-semibold transition text-sm ${
                focusState === state
                  ? 'bg-cyan-600 text-white border border-cyan-400'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              {state === 'deep_focus' ? '🧠 Deep Focus' : state === 'distracted' ? '😴 Distracted' : '✓ Active'}
            </button>
          ))}
        </div>
      </div>

      {/* Capture Button */}
      <button
        onClick={handleCapture}
        className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
      >
        <span>📸</span>
        Capture State Snapshot
      </button>

      {/* Statistics */}
      {stats.totalSnapshots > 0 && (
        <div className="bg-black bg-opacity-50 rounded p-4 text-sm space-y-2">
          <h4 className="text-cyan-400 font-semibold">Capture Statistics</h4>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div>Snapshots: <span className="text-cyan-400">{stats.totalSnapshots}</span></div>
            <div>Duration: <span className="text-cyan-400">{(stats.totalDuration / 1000).toFixed(1)}s</span></div>
            <div>Avg Comprehension: <span className="text-cyan-400">{stats.averageComprehension.toFixed(0)}%</span></div>
            <div>Avg Engagement: <span className="text-cyan-400">{stats.averageEngagement.toFixed(0)}%</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
