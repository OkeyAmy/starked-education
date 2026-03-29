/**
 * useNeuralInterface Hook
 * Custom React hook for managing neural monitoring and pattern analysis
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getNeuralInterfaceService,
  type NeuralInterfaceService
} from '../services/nanotech/neuralInterface';
import type { NeuralPattern, UseNeuralInterfaceReturn } from '../types/nanotech';

export function useNeuralInterface(userId: string): UseNeuralInterfaceReturn {
  const [neuralPattern, setNeuralPattern] = useState<NeuralPattern | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const serviceRef = useRef<NeuralInterfaceService | null>(null);
  const unsubscribeRef = useRef<(() => void)[] | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = getNeuralInterfaceService(userId);
    return () => {
      // Cleanup is handled in stopMonitoring
    };
  }, [userId]);

  // Setup event listeners
  useEffect(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;
    const subscriptions: (() => void)[] = [];

    // Subscribe to pattern updates
    const unsubscribePattern = service.on('neuralPatternUpdate', (pattern: NeuralPattern) => {
      setNeuralPattern(pattern);
      setError(null);
    });
    subscriptions.push(unsubscribePattern);

    // Subscribe to learning state changes
    const unsubscribeState = service.on(
      'learningStateChange',
      (data: { previousState: string; currentState: string; pattern: NeuralPattern }) => {
        console.log(`Learning state changed: ${data.previousState} → ${data.currentState}`);
      }
    );
    subscriptions.push(unsubscribeState);

    // Subscribe to anomalies
    const unsubscribeAnomaly = service.on(
      'anomalyDetected',
      (data: { anomalies: string[]; pattern: NeuralPattern }) => {
        console.warn('Neural anomalies detected:', data.anomalies);
      }
    );
    subscriptions.push(unsubscribeAnomaly);

    unsubscribeRef.current = subscriptions;

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Start neural monitoring
   */
  const startMonitoring = useCallback(async (context: string = 'general') => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    try {
      setError(null);
      setIsMonitoring(true);

      await serviceRef.current.startMonitoring(context);

      const pattern = serviceRef.current.getCurrentPattern();
      if (pattern) {
        setNeuralPattern(pattern);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsMonitoring(false);
      throw error;
    }
  }, []);

  /**
   * Stop neural monitoring
   */
  const stopMonitoring = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    try {
      setError(null);
      await serviceRef.current.stopMonitoring();
      setIsMonitoring(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  /**
   * Get current neural state
   */
  const getNeuralState = useCallback(() => {
    if (!serviceRef.current) {
      return {};
    }

    return serviceRef.current.getNeuralState();
  }, []);

  return {
    neuralPattern,
    isMonitoring,
    error,
    startMonitoring,
    stopMonitoring,
    getNeuralState
  };
}
