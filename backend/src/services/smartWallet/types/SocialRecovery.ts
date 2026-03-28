/**
 * Social Recovery Types
 */

export interface Guardian {
  address: string;
  name?: string;
  email?: string;
  addedAt: Date;
}

export interface SocialRecoveryConfig {
  guardians: Guardian[];
  threshold: number;
  recoveryPeriod?: number; // Time in seconds before recovery can be executed
}

export interface RecoveryRequest {
  recoveryId: string;
  walletAddress: string;
  newOwner: string;
  approvalCount: number;
  threshold: number;
  initiatedAt: Date;
  executed: boolean;
  cancelled: boolean;
  guardianApprovals: string[];
}

export interface RecoveryStatus {
  isRecoveryActive: boolean;
  currentRequest?: RecoveryRequest;
  canExecute: boolean;
  timeRemaining?: number;
}
