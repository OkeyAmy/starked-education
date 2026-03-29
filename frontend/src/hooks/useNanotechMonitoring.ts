/**
 * useNanotechMonitoring Hook
 * Custom React hook for monitoring swarm health, safety, and system status
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getSafetyMonitorService,
  type SafetyMonitorService
} from '../services/nanotech/safetyMonitor';
import {
  getNanobotControllerService,
  type NanobotControllerService
} from '../services/nanotech/nanobotController';
import type { SafetyStatus, UseNanotechMonitoringReturn } from '../types/nanotech';

export function useNanotechMonitoring(): UseNanotechMonitoringReturn {
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [swarmHealth, setSwarmHealth] = useState(100);
  const [containmentStatus, setContainmentStatus] = useState(100);

  const safetyRef = useRef<SafetyMonitorService | null>(null);
  const controllerRef = useRef<NanobotControllerService | null>(null);
  const unsubscribeRef = useRef<(() => void)[] | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    safetyRef.current = getSafetyMonitorService();
    controllerRef.current = getNanobotControllerService();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!safetyRef.current || !controllerRef.current) return;

    const subscriptions: (() => void)[] = [];
    const safety = safetyRef.current;
    const controller = controllerRef.current;

    // Listen to health checks
    const unsubHealth = safety.on(
      'healthCheckComplete',
      (data: { swarmId: string; status: SafetyStatus; statusChanged: boolean }) => {
        setSafetyStatus(data.status);
        setContainmentStatus(data.status.nanobotContainment);

        // Calculate health score (0-100)
        const health = Math.min(100, data.status.overallSafetyScore);
        setSwarmHealth(health);

        if (data.statusChanged) {
          console.log(`Safety status changed to: ${data.status.status}`);
        }
      }
    );
    subscriptions.push(unsubHealth);

    // Listen to warnings
    const unsubWarning = safety.on(
      'warningIssued',
      (data: { swarmId: string; warnings: string[] }) => {
        console.warn('Safety warnings:', data.warnings);
      }
    );
    subscriptions.push(unsubWarning);

    // Listen to critical alerts
    const unsubCritical = safety.on(
      'criticalAlert',
      (data: { swarmId: string; trigger: string }) => {
        console.error('CRITICAL ALERT:', data.trigger);
      }
    );
    subscriptions.push(unsubCritical);

    // Listen to emergency shutdown
    const unsubShutdown = safety.on(
      'emergencyShutdown',
      (data: { swarmId: string; action: string }) => {
        console.warn('Emergency shutdown initiated:', data.action);
        setIsMonitoring(false);
      }
    );
    subscriptions.push(unsubShutdown);

    // Listen to all clear
    const unsubAllClear = safety.on(
      'allClear',
      (data: { swarmId: string; safetyScore: number }) => {
        console.log(`All clear - Safety score: ${data.safetyScore}`);
      }
    );
    subscriptions.push(unsubAllClear);

    unsubscribeRef.current = subscriptions;

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Start monitoring safety and health
   */
  const startMonitoring = useCallback(async (swarmId?: string) => {
    if (!safetyRef.current || !controllerRef.current) {
      throw new Error('Services not initialized');
    }

    try {
      setError(null);
      setIsMonitoring(true);

      // If a specific swarm provided, monitor it
      if (swarmId) {
        const swarm = controllerRef.current.getSwarmStatus(swarmId);
        if (swarm) {
          const status = await safetyRef.current.startMonitoring(swarmId, swarm);
          setSafetyStatus(status);
          setContainmentStatus(status.nanobotContainment);
          setSwarmHealth(status.overallSafetyScore);
        }
      }

      // Continue monitoring
      monitoringIntervalRef.current = setInterval(() => {
        if (safetyRef.current && swarmId) {
          const status = safetyRef.current.getSafetyStatus(swarmId);
          if (status) {
            setSafetyStatus(status);
            setContainmentStatus(status.nanobotContainment);
            setSwarmHealth(status.overallSafetyScore);
          }
        }
      }, 2000); // Check every 2 seconds
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsMonitoring(false);
      throw error;
    }
  }, []);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(async () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    setIsMonitoring(false);
  }, []);

  /**
   * Activate emergency shutdown
   */
  const emergencyShutdown = useCallback(async () => {
    if (!safetyRef.current || !safetyStatus) {
      throw new Error('Services not initialized or no active monitoring');
    }

    try {
      setError(null);
      await safetyRef.current.emergencyShutdown(safetyStatus.swarmId);
      setIsMonitoring(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [safetyStatus]);

  return {
    safetyStatus,
    isMonitoring,
    error,
    swarmHealth,
    containmentStatus,
    startMonitoring,
    stopMonitoring,
    emergencyShutdown
  };
}
