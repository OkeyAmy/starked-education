/**
 * Quantum Teleportation Type Definitions
 * Defines all types used in the quantum teleportation system
 */

/**
 * Learning State Snapshot - Captures current learning activity
 */
export interface LearningStateSnapshot {
  id: string;
  timestamp: number;
  userId: string;
  locationId: string;
  
  // Learning context
  courseId: string;
  moduleId: string;
  currentProgress: number;
  
  // Student state
  comprehensionLevel: number; // 0-100
  engagementLevel: number;    // 0-100
  focusState: 'active' | 'distracted' | 'deep_focus';
  
  // Cognitive state (metaphorical)
  memoryState: Record<string, any>;
  thinkingPattern: Record<string, any>;
  emotionalContext: string;
  
  // Activity data
  lastAction: string;
  actionTimestamp: number;
  interactionMetrics: Record<string, number>;
  
  // Verification
  stateHash: string;
  version: number;
}

/**
 * Entanglement Connection - Represents quantum link between locations
 */
export interface EntanglementConnection {
  id: string;
  sourceLocationId: string;
  targetLocationId: string;
  
  // Connection state
  status: 'entangled' | 'entangling' | 'disentangled' | 'error';
  entanglementStrength: number; // 0-1 (connection quality)
  
  // Metadata
  createdAt: number;
  lastSyncAt: number;
  messagesSent: number;
  messagesReceived: number;
  
  // Error tracking
  errorCount: number;
  lastError?: string;
  errorRate: number; // messages with errors / total messages
}

/**
 * Quantum Teleportation Message
 */
export interface QuantumTeleportationMessage {
  id: string;
  type: 'state_transfer' | 'ack' | 'error_correction' | 'verify' | 'sync';
  sourceLocationId: string;
  targetLocationId: string;
  
  // Payload
  state?: LearningStateSnapshot;
  errorData?: ErrorCorrectionData;
  verificationHash?: string;
  
  // Metadata
  sequence: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  
  // Status
  status: 'pending' | 'sent' | 'received' | 'verified' | 'failed';
}

/**
 * Error Correction Data - Hamming code based error detection
 */
export interface ErrorCorrectionData {
  messageId: string;
  parityBits: number[];
  dataLength: number;
  errorPosition?: number; // Position of error if detected
  correctionApplied?: boolean;
  checksumVerification: string;
}

/**
 * Location Registry Entry
 */
export interface LocationRegistry {
  id: string;
  name: string;
  type: 'classroom' | 'remote' | 'mixed';
  
  // Network info
  ipAddress?: string;
  region: string;
  
  // Connected users
  activeUsers: string[];
  totalCapacity: number;
  
  // Status
  isOnline: boolean;
  lastHeartbeat: number;
  
  // Quantum stats
  entangledWith: string[]; // Location IDs
  totalStatesTransferred: number;
}

/**
 * Quantum Network Topology
 */
export interface QuantumNetworkTopology {
  locations: LocationRegistry[];
  connections: EntanglementConnection[];
  networkHealth: number; // 0-100 (average connection quality)
  totalPeers: number;
}

/**
 * Teleportation Statistics
 */
export interface TeleportationStats {
  totalStateTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  averageTransferTime: number; // ms
  errorRate: number; // percentage
  averageEntanglementStrength: number;
  lastTransferTime: number;
  lastError?: string;
}

/**
 * Quantum Teleportation Configuration
 */
export interface QuantumTeleportationConfig {
  // Connection settings
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  
  // Performance
  maxConcurrentTransfers: number;
  stateSnapshotInterval: number; // ms
  
  // Error correction
  enableErrorCorrection: boolean;
  errorCorrectionLevel: 'basic' | 'hamming' | 'advanced';
  
  // Network
  maxConnectionsPerLocation: number;
  heartbeatInterval: number; // ms
  connectionTimeout: number; // ms
  
  // Validation
  enableStateVerification: boolean;
  stateVerificationTimeout: number;
}

/**
 * Teleportation Event
 */
export interface TeleportationEvent {
  type: 'entanglement_created' | 'entanglement_lost' | 'state_transferred' | 
        'transfer_failed' | 'error_corrected' | 'verification_passed' | 
        'verification_failed' | 'location_joined' | 'location_left';
  timestamp: number;
  sourceLocationId: string;
  targetLocationId?: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Hook return types
 */
export interface UseQuantumEntanglementReturn {
  connections: EntanglementConnection[];
  isConnecting: boolean;
  error: Error | null;
  createEntanglement: (sourceId: string, targetId: string) => Promise<void>;
  destroyEntanglement: (connectionId: string) => Promise<void>;
  getConnectionQuality: (connectionId: string) => number;
}

export interface UseStateTeleportationReturn {
  isTransferring: boolean;
  lastTransferStatus: 'pending' | 'success' | 'failed' | null;
  error: Error | null;
  teleportState: (state: LearningStateSnapshot, targetLocationId: string) => Promise<void>;
  getStats: () => TeleportationStats;
}

export interface UseQuantumNetworkingReturn {
  topology: QuantumNetworkTopology;
  isLoading: boolean;
  error: Error | null;
  registerLocation: (location: LocationRegistry) => Promise<void>;
  unregisterLocation: (locationId: string) => Promise<void>;
  getPeerList: () => LocationRegistry[];
  getNetworkHealth: () => number;
}
