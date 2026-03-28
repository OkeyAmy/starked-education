/**
 * Entanglement Service
 * Manages quantum entanglement (peer connections) between locations
 */

import type { EntanglementConnection } from '@/types/quantum';

class EntanglementService {
  private connections: Map<string, EntanglementConnection> = new Map();
  private connectionListeners: Array<(connection: EntanglementConnection) => void> = [];
  private disconnectionListeners: Array<(connectionId: string) => void> = [];
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  /**
   * Create a new entanglement between two locations
   */
  async createEntanglement(
    sourceId: string,
    targetId: string
  ): Promise<EntanglementConnection> {
    const connectionId = `${sourceId}-to-${targetId}-${Date.now()}`;

    const connection: EntanglementConnection = {
      id: connectionId,
      sourceLocationId: sourceId,
      targetLocationId: targetId,
      status: 'entangling',
      entanglementStrength: 0.5,
      createdAt: Date.now(),
      lastSyncAt: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      errorCount: 0,
      errorRate: 0
    };

    // Simulate entanglement establishment (in real impl, would use WebSocket)
    await this.simulateEntanglementHandshake(connection);

    this.connections.set(connectionId, connection);
    this.notifyConnectionListeners(connection);

    return connection;
  }

  /**
   * Destroy entanglement connection
   */
  async destroyEntanglement(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);

    if (connection) {
      connection.status = 'disentangled';
      this.connections.delete(connectionId);
      this.notifyDisconnectionListeners(connectionId);
    }
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): EntanglementConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): EntanglementConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections for a specific location
   */
  getConnectionsForLocation(locationId: string): EntanglementConnection[] {
    return Array.from(this.connections.values()).filter(
      c => c.sourceLocationId === locationId || c.targetLocationId === locationId
    );
  }

  /**
   * Send message through entanglement
   */
  async sendMessage(
    connectionId: string,
    data: any,
    options: { retries?: number, timeout?: number } = {}
  ): Promise<void> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== 'entangled') {
      throw new Error(`Connection ${connectionId} is not available`);
    }

    const retries = options.retries || 3;
    const timeout = options.timeout || 5000;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Simulate message send (in real impl, would use WebSocket)
        await this.simulateMessageSend(connection, data, timeout);

        // Update connection stats
        connection.messagesSent++;
        connection.lastSyncAt = Date.now();

        return;
      } catch (err) {
        connection.errorCount++;

        if (attempt === retries - 1) {
          connection.status = 'error';
          connection.lastError = `Message failed after ${retries} retries: ${err}`;
          throw new Error(`Failed to send message after ${retries} retries: ${err}`);
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Receive message through entanglement
   */
  async receiveMessage(connectionId: string, timeout: number = 5000): Promise<any> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== 'entangled') {
      throw new Error(`Connection ${connectionId} is not available`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Message receive timeout after ${timeout}ms`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timeoutId);
        connection.messagesReceived++;
        connection.lastSyncAt = Date.now();
        resolve(data);
      };

      this.messageHandlers.set(connectionId, handler);
    });
  }

  /**
   * Register message handler for connection
   */
  onMessage(connectionId: string, handler: (data: any) => void): () => void {
    this.messageHandlers.set(connectionId, handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(connectionId);
    };
  }

  /**
   * Update entanglement strength (connection quality)
   */
  updateEntanglementStrength(connectionId: string, strength: number): void {
    const connection = this.connections.get(connectionId);

    if (connection) {
      connection.entanglementStrength = Math.max(0, Math.min(1, strength));

      // Automatically disentangle if strength drops too low
      if (strength < 0.1) {
        connection.status = 'error';
      }
    }
  }

  /**
   * Calculate average entanglement strength
   */
  getAverageEntanglementStrength(): number {
    if (this.connections.size === 0) return 0;

    const sum = Array.from(this.connections.values()).reduce(
      (total, c) => total + c.entanglementStrength,
      0
    );

    return sum / this.connections.size;
  }

  /**
   * Subscribe to connection creation
   */
  onEntanglementCreated(listener: (connection: EntanglementConnection) => void): () => void {
    this.connectionListeners.push(listener);

    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to disconnection
   */
  onEntanglementDestroyed(listener: (connectionId: string) => void): () => void {
    this.disconnectionListeners.push(listener);

    return () => {
      this.disconnectionListeners = this.disconnectionListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(connectionId: string) {
    const connection = this.connections.get(connectionId);

    if (!connection) return null;

    return {
      id: connection.id,
      status: connection.status,
      entanglementStrength: connection.entanglementStrength,
      messagesSent: connection.messagesSent,
      messagesReceived: connection.messagesReceived,
      errorCount: connection.errorCount,
      errorRate: connection.messagesSent > 0
        ? (connection.errorCount / connection.messagesSent) * 100
        : 0,
      uptime: Date.now() - connection.createdAt,
      lastSync: Date.now() - connection.lastSyncAt
    };
  }

  /**
   * Clear all connections
   */
  clearConnections(): void {
    for (const [connectionId] of this.connections) {
      this.notifyDisconnectionListeners(connectionId);
    }
    this.connections.clear();
  }

  /**
   * Private: Simulate entanglement handshake
   */
  private async simulateEntanglementHandshake(connection: EntanglementConnection): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        connection.status = 'entangled';
        connection.entanglementStrength = 0.95;
        resolve();
      }, 100 + Math.random() * 200);
    });
  }

  /**
   * Private: Simulate message send
   */
  private async simulateMessageSend(
    connection: EntanglementConnection,
    data: any,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const delay = Math.random() * 100;

      if (Math.random() < 0.05) {
        // 5% error rate simulation
        reject(new Error('Network error during message send'));
      } else {
        setTimeout(resolve, delay);
      }
    });
  }

  /**
   * Private: Notify connection listeners
   */
  private notifyConnectionListeners(connection: EntanglementConnection): void {
    for (const listener of this.connectionListeners) {
      try {
        listener(connection);
      } catch (err) {
        console.error('Error in connection listener:', err);
      }
    }
  }

  /**
   * Private: Notify disconnection listeners
   */
  private notifyDisconnectionListeners(connectionId: string): void {
    for (const listener of this.disconnectionListeners) {
      try {
        listener(connectionId);
      } catch (err) {
        console.error('Error in disconnection listener:', err);
      }
    }
  }
}

// Export singleton instance
export const entanglementService = new EntanglementService();

export default EntanglementService;
