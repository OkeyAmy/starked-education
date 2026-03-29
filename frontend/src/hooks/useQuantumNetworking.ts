/**
 * useQuantumNetworking Hook
 * Hook for managing multi-location quantum networks
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { LocationRegistry, QuantumNetworkTopology } from '@/types/quantum';
import { networkManager } from '@/services/quantumTeleportation/networkManager';

export interface UseQuantumNetworkingReturn {
  topology: QuantumNetworkTopology;
  isLoading: boolean;
  error: Error | null;
  registerLocation: (location: LocationRegistry) => Promise<void>;
  unregisterLocation: (locationId: string) => Promise<void>;
  getPeerList: () => LocationRegistry[];
  getNetworkHealth: () => number;
}

export function useQuantumNetworking(): UseQuantumNetworkingReturn {
  const [topology, setTopology] = useState<QuantumNetworkTopology>({
    locations: [],
    connections: [],
    networkHealth: 0,
    totalPeers: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to location updates
    unsubscribeRef.current = networkManager.onLocationUpdate(locations => {
      setTopology(networkManager.getNetworkTopology());
    });

    // Initial load
    setTopology(networkManager.getNetworkTopology());

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const registerLocation = useCallback(async (location: LocationRegistry) => {
    setIsLoading(true);
    setError(null);

    try {
      await networkManager.registerLocation(location);
      setTopology(networkManager.getNetworkTopology());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to register location'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unregisterLocation = useCallback(async (locationId: string) => {
    setError(null);

    try {
      await networkManager.unregisterLocation(locationId);
      setTopology(networkManager.getNetworkTopology());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unregister location'));
    }
  }, []);

  const getPeerList = useCallback(() => {
    return networkManager.getOnlineLocations();
  }, []);

  const getNetworkHealth = useCallback(() => {
    return networkManager.getNetworkTopology().networkHealth;
  }, []);

  return {
    topology,
    isLoading,
    error,
    registerLocation,
    unregisterLocation,
    getPeerList,
    getNetworkHealth
  };
}
