/**
 * Session Key Types
 */

export interface SessionKeyPermissions {
  allowedContracts: string[];
  allowedMethods: string[];
  spendingLimit: bigint;
}

export interface SessionKey {
  address: string;
  walletAddress: string;
  permissions: SessionKeyPermissions;
  spentAmount: bigint;
  validUntil: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface SessionKeyConfig {
  permissions: SessionKeyPermissions;
  validUntil: Date;
  description?: string;
}

export interface SessionKeyUsage {
  sessionKeyAddress: string;
  transactionHash: string;
  method: string;
  contract: string;
  value: bigint;
  timestamp: Date;
}
