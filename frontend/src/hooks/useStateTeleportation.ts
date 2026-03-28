/**
 * useStateTeleportation Hook
 * Hook for transferring learning states between quantum-entangled locations
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { LearningStateSnapshot, TeleportationStats } from '@/types/quantum';
import { quantumTeleportationProtocol } from '@/services/quantumTeleportation/teleportationProtocol';

export interface UseStateTeleportationReturn {
  isTransferring: boolean;
  lastTransferStatus: 'pending' | 'success' | 'failed' | null;
  error: Error | null;
  teleportState: (state: LearningStateSnapshot, targetLocationId: string) => Promise<void>;
  getStats: () => TeleportationStats;
}

export function useStateTeleportation(): UseStateTeleportationReturn {
  const [isTransferring, setIsTransferring] = useState(false);
  const [lastTransferStatus, setLastTransferStatus] = useState<
    'pending' | 'success' | 'failed' | null
  >(null);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to teleportation events
    unsubscribeRef.current = quantumTeleportationProtocol.onEvent(event => {
      if (event.type === 'state_transferred') {
        setLastTransferStatus('success');
        setError(null);
        setIsTransferring(false);
      } else if (event.type === 'transfer_failed') {
        setLastTransferStatus('failed');
        setError(new Error(`Transfer failed: ${event.details.error}`));
        setIsTransferring(false);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const teleportState = useCallback(
    async (state: LearningStateSnapshot, targetLocationId: string) => {
      setIsTransferring(true);
      setLastTransferStatus('pending');
      setError(null);

      try {
        await quantumTeleportationProtocol.teleportState(state, targetLocationId);
        setLastTransferStatus('success');
      } catch (err) {
        setLastTransferStatus('failed');
        setError(err instanceof Error ? err : new Error('State teleportation failed'));
      }
    },
    []
  );

  const getStats = useCallback(() => {
    return quantumTeleportationProtocol.getStatistics();
  }, []);

  return {
    isTransferring,
    lastTransferStatus,
    error,
    teleportState,
    getStats
  };
}
