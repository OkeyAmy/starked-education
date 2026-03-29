/**
 * EntanglementViewer Component
 * Visualizes quantum entanglement connections between locations
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useQuantumEntanglement } from '@/hooks/useQuantumEntanglement';
import type { EntanglementConnection } from '@/types/quantum';

export function EntanglementViewer() {
  const { connections, getConnectionQuality } = useQuantumEntanglement();
  const [selectedConnection, setSelectedConnection] = useState<EntanglementConnection | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entangled':
        return 'from-green-500 to-green-700';
      case 'entangling':
        return 'from-yellow-500 to-yellow-700';
      case 'error':
        return 'from-red-500 to-red-700';
      case 'disentangled':
        return 'from-gray-500 to-gray-700';
      default:
        return 'from-blue-500 to-blue-700';
    }
  };

  const getStrengthBar = (strength: number) => {
    const percentage = strength * 100;
    let color = 'bg-red-500';

    if (percentage > 80) color = 'bg-green-500';
    else if (percentage > 60) color = 'bg-yellow-500';
    else if (percentage > 40) color = 'bg-orange-500';

    return color;
  };

  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-black via-blue-950 to-black rounded-xl border border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2">
          <span className="text-2xl">🔗</span>
          Quantum Entanglement Network
        </h3>
        <span className="text-sm font-mono bg-blue-900 px-3 py-1 rounded text-blue-300">
          {connections.length} entanglements
        </span>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No entanglements active</p>
          <p className="text-xs text-gray-600 mt-2">Create connections to other locations to begin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn, idx) => (
            <div
              key={conn.id}
              onClick={() => setSelectedConnection(selectedConnection?.id === conn.id ? null : conn)}
              className="bg-black rounded-lg border border-blue-600 hover:border-blue-400 p-4 cursor-pointer transition-all"
            >
              {/* Connection Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-full bg-gradient-to-br ${getStatusColor(conn.status)}`}>
                    <span className="text-white text-lg">⚛️</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      <span className="text-cyan-400">{conn.sourceLocationId.slice(0, 8)}</span>
                      {' '}
                      <span className="text-gray-500">↔</span>
                      {' '}
                      <span className="text-purple-400">{conn.targetLocationId.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs text-gray-500">{conn.id.slice(0, 12)}...</div>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-gray-900 border font-mono text-xs">
                  <span className={`${conn.status === 'entangled' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {conn.status}
                  </span>
                </div>
              </div>

              {/* Connection Quality */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Entanglement Strength</span>
                  <span className="text-cyan-400 font-bold">{(conn.entanglementStrength * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getStrengthBar(conn.entanglementStrength)} transition-all duration-300`}
                    style={{ width: `${conn.entanglementStrength * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Sent</span>
                  <br />
                  <span className="text-blue-400 font-bold">{conn.messagesSent}</span>
                </div>
                <div>
                  <span className="text-gray-500">Received</span>
                  <br />
                  <span className="text-green-400 font-bold">{conn.messagesReceived}</span>
                </div>
                <div>
                  <span className="text-gray-500">Errors</span>
                  <br />
                  <span className={`font-bold ${conn.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {conn.errorCount}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Rate</span>
                  <br />
                  <span className="text-yellow-400 font-bold">{(conn.errorRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedConnection?.id === conn.id && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Created</span>
                      <br />
                      <span className="text-white font-mono">
                        {new Date(conn.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Sync</span>
                      <br />
                      <span className="text-white font-mono">
                        {new Date(conn.lastSyncAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Uptime</span>
                      <br />
                      <span className="text-cyan-400 font-mono">
                        {((Date.now() - conn.createdAt) / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Throughput</span>
                      <br />
                      <span className="text-blue-400 font-mono">
                        {(
                          (conn.messagesSent + conn.messagesReceived) /
                          ((Date.now() - conn.createdAt) / 1000)
                        ).toFixed(1)}
                        {' '}msg/s
                      </span>
                    </div>
                  </div>

                  {conn.lastError && (
                    <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded p-3">
                      <p className="text-red-400 text-xs">
                        <strong>Last Error:</strong> {conn.lastError}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
