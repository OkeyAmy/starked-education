/**
 * Multi-Signature Types
 */

export interface SignerInfo {
  address: string;
  name?: string;
  addedAt: Date;
}

export interface MultiSigConfig {
  signers: string[];
  threshold: number;
}

export interface MultiSigTransaction {
  transactionId: string;
  walletAddress: string;
  to: string;
  value: bigint;
  data: string;
  approvalCount: number;
  threshold: number;
  executed: boolean;
  proposedAt: Date;
  approvals: string[];
}

export interface TransactionProposal {
  to: string;
  value: bigint;
  data: string;
  description?: string;
}
