/**
 * Network Manager Service
 * Manages multi-location quantum networking and peer discovery
 */

import type { LocationRegistry, QuantumNetworkTopology, EntanglementConnection } from '@/types/quantum';

class NetworkManager {
  private locations: Map<string, LocationRegistry> = new Map();
  private connections: Map<string, EntanglementConnection> = new Map();
  private locationUpdateListeners: Array<(locations: LocationRegistry[]) => void> = [];
  private heartbeatInterval: number = 5000; // 5 seconds
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a location in the quantum network
   */
  async registerLocation(location: LocationRegistry): Promise<void> {
    location.lastHeartbeat = Date.now();
    location.isOnline = true;
    this.locations.set(location.id, location);

    // Start heartbeat monitoring
    this.startHeartbeat(location.id);

    // Notify listeners
    this.notifyLocationUpdate();
  }

  /**
   * Unregister a location
   */
  async unregisterLocation(locationId: string): Promise<void> {
    const location = this.locations.get(locationId);

    if (location) {
      location.isOnline = false;
      this.stopHeartbeat(locationId);

      // Remove connections to this location
      for (const [connId, conn] of this.connections) {
        if (conn.sourceLocationId === locationId || conn.targetLocationId === locationId) {
          this.connections.delete(connId);
        }
      }

      // Keep location in registry but mark as offline
      this.notifyLocationUpdate();
    }
  }

  /**
   * Get location by ID
   */
  getLocation(locationId: string): LocationRegistry | undefined {
    return this.locations.get(locationId);
  }

  /**
   * Get all online locations
   */
  getOnlineLocations(): LocationRegistry[] {
    return Array.from(this.locations.values()).filter(l => l.isOnline);
  }

  /**
   * Get all locations
   */
  getAllLocations(): LocationRegistry[] {
    return Array.from(this.locations.values());
  }

  /**
   * Register connection between locations
   */
  registerConnection(conn: EntanglementConnection): void {
    this.connections.set(conn.id, conn);

    // Update location entanglement lists
    const source = this.locations.get(conn.sourceLocationId);
    const target = this.locations.get(conn.targetLocationId);

    if (source && !source.entangledWith.includes(conn.targetLocationId)) {
      source.entangledWith.push(conn.targetLocationId);
    }

    if (target && !target.entangledWith.includes(conn.sourceLocationId)) {
      target.entangledWith.push(conn.sourceLocationId);
    }

    this.notifyLocationUpdate();
  }

  /**
   * Unregister connection
   */
  unregisterConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);

    if (conn) {
      this.connections.delete(connectionId);

      // Update location entanglement lists
      const source = this.locations.get(conn.sourceLocationId);
      const target = this.locations.get(conn.targetLocationId);

      if (source) {
        source.entangledWith = source.entangledWith.filter(id => id !== conn.targetLocationId);
      }

      if (target) {
        target.entangledWith = target.entangledWith.filter(id => id !== conn.sourceLocationId);
      }

      this.notifyLocationUpdate();
    }
  }

  /**
   * Get network topology
   */
  getNetworkTopology(): QuantumNetworkTopology {
    const onlineLocations = this.getOnlineLocations();
    const avgStrength =
      Array.from(this.connections.values()).reduce(
        (sum, c) => sum + c.entanglementStrength,
        0
      ) / Math.max(1, this.connections.size);

    return {
      locations: onlineLocations,
      connections: Array.from(this.connections.values()),
      networkHealth: Math.round(avgStrength * 100),
      totalPeers: onlineLocations.length
    };
  }

  /**
   * Update location heartbeat
   */
  updateLocationHeartbeat(locationId: string): void {
    const location = this.locations.get(locationId);

    if (location) {
      location.lastHeartbeat = Date.now();
      location.isOnline = true;
    }
  }

  /**
   * Add user to location
   */
  addUserToLocation(locationId: string, userId: string): void {
    const location = this.locations.get(locationId);

    if (location && !location.activeUsers.includes(userId)) {
      location.activeUsers.push(userId);
    }
  }

  /**
   * Remove user from location
   */
  removeUserFromLocation(locationId: string, userId: string): void {
    const location = this.locations.get(locationId);

    if (location) {
      location.activeUsers = location.activeUsers.filter(id => id !== userId);
    }
  }

  /**
   * Get users in a location
   */
  getUsersInLocation(locationId: string): string[] {
    const location = this.locations.get(locationId);
    return location?.activeUsers || [];
  }

  /**
   * Record state transfer
   */
  recordStateTransfer(sourceLocationId: string, targetLocationId: string): void {
    const location = this.locations.get(sourceLocationId);

    if (location) {
      location.totalStatesTransferred++;
    }
  }

  /**
   * Find nearest location
   */
  findNearestLocation(region: string): LocationRegistry | undefined {
    return Array.from(this.locations.values()).find(
      l => l.isOnline && l.region === region
    );
  }

  /**
   * Discover peers in the network
   */
  discoverPeers(limit: number = 10): LocationRegistry[] {
    return this.getOnlineLocations().slice(0, limit);
  }

  /**
   * Calculate network diameter (maximum distance between any two nodes)
   */
  calculateNetworkDiameter(): number {
    const connections = Array.from(this.connections.values());
    return Math.max(1, connections.length);
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics() {
    const allLocations = this.getAllLocations();
    const onlineLocations = this.getOnlineLocations();
    const totalUsers = allLocations.reduce((sum, l) => sum + l.activeUsers.length, 0);
    const totalTransfers = allLocations.reduce((sum, l) => sum + l.totalStatesTransferred, 0);

    return {
      totalLocations: allLocations.length,
      onlineLocations: onlineLocations.length,
      offlineLocations: allLocations.length - onlineLocations.length,
      totalConnections: this.connections.size,
      totalUsers,
      totalStateTransfers: totalTransfers,
      networkHealth: this.getNetworkTopology().networkHealth,
      avgCapacity:
        allLocations.length > 0
          ? Math.round(
            allLocations.reduce((sum, l) => sum + l.totalCapacity, 0) /
            allLocations.length
          )
          : 0
    };
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(listener: (locations: LocationRegistry[]) => void): () => void {
    this.locationUpdateListeners.push(listener);

    return () => {
      this.locationUpdateListeners = this.locationUpdateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    for (const [locationId] of this.locations) {
      this.stopHeartbeat(locationId);
    }
    this.locations.clear();
    this.connections.clear();
  }

  /**
   * Private: Start heartbeat for location
   */
  private startHeartbeat(locationId: string): void {
    if (this.heartbeatTimers.has(locationId)) {
      return;
    }

    const timer = setInterval(() => {
      const location = this.locations.get(locationId);

      if (location) {
        const timeSinceHeartbeat = Date.now() - location.lastHeartbeat;

        // Mark as offline if no heartbeat for 30 seconds
        if (timeSinceHeartbeat > 30000) {
          location.isOnline = false;
          this.notifyLocationUpdate();
        }
      }
    }, this.heartbeatInterval);

    this.heartbeatTimers.set(locationId, timer);
  }

  /**
   * Private: Stop heartbeat for location
   */
  private stopHeartbeat(locationId: string): void {
    const timer = this.heartbeatTimers.get(locationId);

    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(locationId);
    }
  }

  /**
   * Private: Notify listeners of location update
   */
  private notifyLocationUpdate(): void {
    const locations = this.getOnlineLocations();

    for (const listener of this.locationUpdateListeners) {
      try {
        listener(locations);
      } catch (err) {
        console.error('Error in location update listener:', err);
      }
    }
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();

export default NetworkManager;
