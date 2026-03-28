/**
 * useQuantumEntanglement Hook
 * Hook for managing quantum entanglement connections between locations
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { EntanglementConnection } from '@/types/quantum';
import { entanglementService } from '@/services/quantumTeleportation/entanglement';

export interface UseQuantumEntanglementReturn {
  connections: EntanglementConnection[];
  isConnecting: boolean;
  error: Error | null;
  createEntanglement: (sourceId: string, targetId: string) => Promise<void>;
  destroyEntanglement: (connectionId: string) => Promise<void>;
  getConnectionQuality: (connectionId: string) => number;
}

export function useQuantumEntanglement(): UseQuantumEntanglementReturn {
  const [connections, setConnections] = useState<EntanglementConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Subscribe to connection events
    const unsubscribeCreated = entanglementService.onEntanglementCreated(conn => {
      setConnections(prev => [...prev.filter(c => c.id !== conn.id), conn]);
    });

    const unsubscribeDestroyed = entanglementService.onEntanglementDestroyed(connId => {
      setConnections(prev => prev.filter(c => c.id !== connId));
    });

    unsubscribeRef.current = [unsubscribeCreated, unsubscribeDestroyed];

    // Initial load
    setConnections(entanglementService.getAllConnections());

    return () => {
      for (const unsub of unsubscribeRef.current) {
        unsub();
      }
    };
  }, []);

  const createEntanglement = useCallback(
    async (sourceId: string, targetId: string) => {
      setIsConnecting(true);
      setError(null);

      try {
        await entanglementService.createEntanglement(sourceId, targetId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create entanglement'));
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const destroyEntanglement = useCallback(async (connectionId: string) => {
    setError(null);

    try {
      await entanglementService.destroyEntanglement(connectionId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to destroy entanglement'));
    }
  }, []);

  const getConnectionQuality = useCallback((connectionId: string): number => {
    const conn = entanglementService.getConnection(connectionId);
    return conn?.entanglementStrength || 0;
  }, []);

  return {
    connections,
    isConnecting,
    error,
    createEntanglement,
    destroyEntanglement,
    getConnectionQuality
  };
}
