/**
 * Quantum Teleportation Protocol Service
 * Orchestrates the entire quantum state teleportation process
 */

import type {
  LearningStateSnapshot,
  EntanglementConnection,
  QuantumTeleportationMessage,
  TeleportationStats,
  QuantumTeleportationConfig,
  TeleportationEvent,
  LocationRegistry
} from '@/types/quantum';

import { stateCaptureService } from './stateCapture';
import { entanglementService } from './entanglement';
import { stateTomographyService } from './stateTomography';
import { errorCorrectionService } from './errorCorrection';
import { networkManager } from './networkManager';

class QuantumTeleportationProtocol {
  private config: QuantumTeleportationConfig;
  private stats: TeleportationStats;
  private eventListeners: Array<(event: TeleportationEvent) => void> = [];
  private messageQueue: QuantumTeleportationMessage[] = [];
  private activeTransfers: Map<string, { state: LearningStateSnapshot, timestamp: number }> =
    new Map();

  constructor() {
    // Default configuration
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      maxConcurrentTransfers: 10,
      stateSnapshotInterval: 5000,
      enableErrorCorrection: true,
      errorCorrectionLevel: 'hamming',
      maxConnectionsPerLocation: 20,
      heartbeatInterval: 5000,
      connectionTimeout: 30000,
      enableStateVerification: true,
      stateVerificationTimeout: 5000
    };

    // Initialize statistics
    this.stats = {
      totalStateTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      averageTransferTime: 0,
      errorRate: 0,
      averageEntanglementStrength: 0,
      lastTransferTime: 0
    };
  }

  /**
   * Initialize the quantum teleportation system
   */
  async initialize(
    userId: string,
    locationId: string,
    courseId: string,
    moduleId: string,
    config?: Partial<QuantumTeleportationConfig>
  ): Promise<void> {
    // Update configuration if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize state capture
    stateCaptureService.initialize(userId, locationId, courseId, moduleId);

    // Register current location
    const currentLocation: LocationRegistry = {
      id: locationId,
      name: `Location-${locationId.slice(0, 8)}`,
      type: 'mixed',
      region: 'local',
      activeUsers: [userId],
      totalCapacity: this.config.maxConnectionsPerLocation,
      isOnline: true,
      lastHeartbeat: Date.now(),
      entangledWith: [],
      totalStatesTransferred: 0
    };

    await networkManager.registerLocation(currentLocation);

    // Start automatic state capture
    stateCaptureService.startAutoCaptureLoop(this.config.stateSnapshotInterval);

    this.emitEvent({
      type: 'location_joined',
      timestamp: Date.now(),
      sourceLocationId: locationId,
      details: { user: userId },
      severity: 'info'
    });
  }

  /**
   * Teleport learning state to another location
   */
  async teleportState(
    state: LearningStateSnapshot,
    targetLocationId: string
  ): Promise<void> {
    const transferId = `transfer-${Date.now()}-${Math.random()}`;
    const startTime = Date.now();

    try {
      // Check active transfers
      if (this.activeTransfers.size >= this.config.maxConcurrentTransfers) {
        throw new Error('Maximum concurrent transfers reached');
      }

      this.activeTransfers.set(transferId, { state, timestamp: startTime });

      // Find or create entanglement connection
      const connections = entanglementService
        .getAllConnections()
        .filter(
          c =>
            (c.sourceLocationId === state.locationId &&
              c.targetLocationId === targetLocationId) ||
            (c.sourceLocationId === targetLocationId &&
              c.targetLocationId === state.locationId)
        );

      let connection: EntanglementConnection;

      if (connections.length === 0) {
        connection = await entanglementService.createEntanglement(
          state.locationId,
          targetLocationId
        );

        this.emitEvent({
          type: 'entanglement_created',
          timestamp: Date.now(),
          sourceLocationId: state.locationId,
          targetLocationId,
          details: { connectionId: connection.id },
          severity: 'info'
        });
      } else {
        connection = connections[0];
      }

      // Store state version
      stateTomographyService.storeStateVersion(state);

      // Create teleportation message
      const message: QuantumTeleportationMessage = {
        id: transferId,
        type: 'state_transfer',
        sourceLocationId: state.locationId,
        targetLocationId,
        state,
        sequence: this.stats.totalStateTransfers + 1,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        status: 'pending'
      };

      // Add error correction if enabled
      if (this.config.enableErrorCorrection) {
        const errorData = errorCorrectionService.createErrorCorrectionData(
          message.id,
          JSON.stringify(state)
        );
        message.errorData = errorData;
      }

      // Perform teleportation with retry logic
      await this.performTeleportation(message, connection);

      // Record state transfer
      networkManager.recordStateTransfer(state.locationId, targetLocationId);

      // Update statistics
      this.stats.totalStateTransfers++;
      this.stats.successfulTransfers++;
      this.stats.lastTransferTime = Date.now() - startTime;
      this.updateAverageTransferTime();

      this.emitEvent({
        type: 'state_transferred',
        timestamp: Date.now(),
        sourceLocationId: state.locationId,
        targetLocationId,
        details: {
          transferTime: this.stats.lastTransferTime,
          stateId: state.id
        },
        severity: 'info'
      });
    } catch (err) {
      this.stats.failedTransfers++;
      this.updateErrorRate();

      this.emitEvent({
        type: 'transfer_failed',
        timestamp: Date.now(),
        sourceLocationId: state.locationId,
        targetLocationId,
        details: { error: `${err}` },
        severity: 'error'
      });

      throw err;
    } finally {
      this.activeTransfers.delete(transferId);
    }
  }

  /**
   * Establish quantum entanglement between locations
   */
  async establishEntanglement(
    sourceLocationId: string,
    targetLocationId: string
  ): Promise<EntanglementConnection> {
    const connection = await entanglementService.createEntanglement(
      sourceLocationId,
      targetLocationId
    );

    networkManager.registerConnection(connection);

    this.emitEvent({
      type: 'entanglement_created',
      timestamp: Date.now(),
      sourceLocationId,
      targetLocationId,
      details: { connectionId: connection.id, strength: connection.entanglementStrength },
      severity: 'info'
    });

    return connection;
  }

  /**
   * Break quantum entanglement
   */
  async breakEntanglement(connectionId: string): Promise<void> {
    const connection = entanglementService.getConnection(connectionId);

    if (connection) {
      await entanglementService.destroyEntanglement(connectionId);
      networkManager.unregisterConnection(connectionId);

      this.emitEvent({
        type: 'entanglement_lost',
        timestamp: Date.now(),
        sourceLocationId: connection.sourceLocationId,
        targetLocationId: connection.targetLocationId,
        details: { connectionId },
        severity: 'warning'
      });
    }
  }

  /**
   * Get teleportation statistics
   */
  getStatistics(): TeleportationStats {
    return { ...this.stats };
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    const topology = networkManager.getNetworkTopology();
    return {
      topology,
      statistics: this.stats,
      activeTransfers: this.activeTransfers.size,
      messageQueue: this.messageQueue.length
    };
  }

  /**
   * Subscribe to teleportation events
   */
  onEvent(listener: (event: TeleportationEvent) => void): () => void {
    this.eventListeners.push(listener);

    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<QuantumTeleportationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): QuantumTeleportationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    stateCaptureService.stopAutoCaptureLoop();
    entanglementService.clearConnections();
    networkManager.clearAll();
    this.eventListeners = [];
    this.messageQueue = [];
    this.activeTransfers.clear();
  }

  /**
   * Private: Perform actual teleportation with retry logic
   */
  private async performTeleportation(
    message: QuantumTeleportationMessage,
    connection: EntanglementConnection
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= message.maxRetries; attempt++) {
      try {
        message.status = 'sent';

        // Send through entanglement connection
        await entanglementService.sendMessage(connection.id, message, {
          timeout: this.config.connectionTimeout
        });

        // Verify state if enabled
        if (this.config.enableStateVerification && message.state) {
          const verified = await this.verifyStateTransfer(message.state);

          if (!verified) {
            throw new Error('State verification failed');
          }

          message.status = 'verified';

          this.emitEvent({
            type: 'verification_passed',
            timestamp: Date.now(),
            sourceLocationId: message.sourceLocationId,
            targetLocationId: message.targetLocationId,
            details: { transferId: message.id },
            severity: 'info'
          });
        }

        message.status = 'received';
        return; // Success
      } catch (err) {
        lastError = err as Error;
        message.retryCount = attempt + 1;

        if (attempt < message.maxRetries) {
          // Exponential backoff
          const delay =
            this.config.retryDelayMs *
            Math.pow(this.config.retryBackoffMultiplier, attempt);

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    message.status = 'failed';
    throw lastError || new Error('Teleportation failed');
  }

  /**
   * Private: Verify state transfer integrity
   */
  private async verifyStateTransfer(state: LearningStateSnapshot): Promise<boolean> {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.config.stateVerificationTimeout);

      try {
        // Verify against stored state
        const verified = stateTomographyService.verifyStateIntegrity(
          state,
          state.stateHash
        );

        clearTimeout(timeout);
        resolve(verified);
      } catch (err) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Private: Update average transfer time
   */
  private updateAverageTransferTime(): void {
    this.stats.averageTransferTime =
      (this.stats.averageTransferTime * (this.stats.successfulTransfers - 1) +
        this.stats.lastTransferTime) /
      this.stats.successfulTransfers;
  }

  /**
   * Private: Update error rate
   */
  private updateErrorRate(): void {
    const total = this.stats.successfulTransfers + this.stats.failedTransfers;
    this.stats.errorRate = (this.stats.failedTransfers / total) * 100;
  }

  /**
   * Private: Emit event
   */
  private emitEvent(event: TeleportationEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }
  }
}

// Export singleton instance
export const quantumTeleportationProtocol = new QuantumTeleportationProtocol();

export default QuantumTeleportationProtocol;
