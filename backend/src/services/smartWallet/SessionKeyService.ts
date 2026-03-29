/**
 * Session Key Service
 * Implements session key management for dApp interactions
 */

import { ethers } from 'ethers';
import { SessionKey, SessionKeyPermissions, SessionKeyConfig } from './types/SessionKey';

export class SessionKeyService {
  private provider: ethers.Provider;
  private sessionKeyModuleAddress: string;

  constructor(config: {
    rpcUrl: string;
    sessionKeyModuleAddress: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.sessionKeyModuleAddress = config.sessionKeyModuleAddress;
  }

  /**
   * Create a new session key
   */
  async createSessionKey(
    walletAddress: string,
    permissions: SessionKeyPermissions,
    validUntil: Date
  ): Promise<{
    sessionKey: string;
    sessionKeyAddress: string;
    callData: string;
  }> {
    try {
      // Generate new session key
      const sessionKeyWallet = ethers.Wallet.createRandom();
      const sessionKeyAddress = sessionKeyWallet.address;

      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function createSessionKey(address wallet, address sessionKey, address[] allowedContracts, bytes4[] allowedMethods, uint256 spendingLimit, uint256 validUntil)',
        ],
        this.provider
      );

      const callData = sessionKeyModule.interface.encodeFunctionData(
        'createSessionKey',
        [
          walletAddress,
          sessionKeyAddress,
          permissions.allowedContracts,
          permissions.allowedMethods,
          permissions.spendingLimit,
          Math.floor(validUntil.getTime() / 1000),
        ]
      );

      return {
        sessionKey: sessionKeyWallet.privateKey,
        sessionKeyAddress,
        callData,
      };
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw error;
    }
  }

  /**
   * Revoke a session key
   */
  async revokeSessionKey(
    walletAddress: string,
    sessionKeyAddress: string
  ): Promise<string> {
    try {
      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function revokeSessionKey(address wallet, address sessionKey)',
        ],
        this.provider
      );

      const callData = sessionKeyModule.interface.encodeFunctionData(
        'revokeSessionKey',
        [walletAddress, sessionKeyAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to revoke session key:', error);
      throw error;
    }
  }

  /**
   * Execute transaction with session key
   */
  async executeWithSessionKey(
    walletAddress: string,
    sessionKeyPrivateKey: string,
    to: string,
    value: bigint,
    data: string
  ): Promise<string> {
    try {
      const sessionKeyWallet = new ethers.Wallet(sessionKeyPrivateKey);
      
      // Create message hash
      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'bytes'],
        [walletAddress, to, value, data]
      );

      // Sign with session key
      const signature = await sessionKeyWallet.signMessage(ethers.getBytes(messageHash));

      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function executeWithSessionKey(address wallet, address to, uint256 value, bytes data, bytes signature)',
        ],
        this.provider
      );

      const callData = sessionKeyModule.interface.encodeFunctionData(
        'executeWithSessionKey',
        [walletAddress, to, value, data, signature]
      );

      return callData;
    } catch (error) {
      console.error('Failed to execute with session key:', error);
      throw error;
    }
  }

  /**
   * Get session key details
   */
  async getSessionKey(
    walletAddress: string,
    sessionKeyAddress: string
  ): Promise<SessionKey | null> {
    try {
      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function getSessionKey(address wallet, address sessionKey) view returns (address[] allowedContracts, bytes4[] allowedMethods, uint256 spendingLimit, uint256 spentAmount, uint256 validUntil, bool revoked)',
        ],
        this.provider
      );

      const result = await sessionKeyModule.getSessionKey(walletAddress, sessionKeyAddress);

      return {
        address: sessionKeyAddress,
        walletAddress,
        permissions: {
          allowedContracts: result.allowedContracts,
          allowedMethods: result.allowedMethods,
          spendingLimit: result.spendingLimit,
        },
        spentAmount: result.spentAmount,
        validUntil: new Date(Number(result.validUntil) * 1000),
        revoked: result.revoked,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to get session key:', error);
      return null;
    }
  }

  /**
   * Get all active session keys for a wallet
   */
  async getActiveSessionKeys(
    walletAddress: string
  ): Promise<SessionKey[]> {
    try {
      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function getActiveSessionKeys(address wallet) view returns (address[])',
        ],
        this.provider
      );

      const sessionKeyAddresses = await sessionKeyModule.getActiveSessionKeys(walletAddress);
      
      const sessionKeys = await Promise.all(
        sessionKeyAddresses.map((address: string) => 
          this.getSessionKey(walletAddress, address)
        )
      );

      return sessionKeys.filter((key): key is SessionKey => key !== null);
    } catch (error) {
      console.error('Failed to get active session keys:', error);
      return [];
    }
  }

  /**
   * Validate session key permissions
   */
  async validateSessionKey(
    walletAddress: string,
    sessionKeyAddress: string,
    targetContract: string,
    method: string,
    value: bigint
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const sessionKey = await this.getSessionKey(walletAddress, sessionKeyAddress);

      if (!sessionKey) {
        errors.push('Session key not found');
        return { isValid: false, errors };
      }

      if (sessionKey.revoked) {
        errors.push('Session key has been revoked');
      }

      if (sessionKey.validUntil < new Date()) {
        errors.push('Session key has expired');
      }

      if (sessionKey.permissions.allowedContracts.length > 0 &&
          !sessionKey.permissions.allowedContracts.includes(targetContract)) {
        errors.push('Target contract not allowed');
      }

      const methodSelector = ethers.id(method).slice(0, 10);
      if (sessionKey.permissions.allowedMethods.length > 0 &&
          !sessionKey.permissions.allowedMethods.includes(methodSelector)) {
        errors.push('Method not allowed');
      }

      const remainingLimit = sessionKey.permissions.spendingLimit - sessionKey.spentAmount;
      if (value > remainingLimit) {
        errors.push(`Spending limit exceeded. Remaining: ${ethers.formatEther(remainingLimit)} ETH`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Update session key permissions
   */
  async updateSessionKeyPermissions(
    walletAddress: string,
    sessionKeyAddress: string,
    newPermissions: Partial<SessionKeyPermissions>
  ): Promise<string> {
    try {
      const currentKey = await this.getSessionKey(walletAddress, sessionKeyAddress);
      
      if (!currentKey) {
        throw new Error('Session key not found');
      }

      const updatedPermissions = {
        ...currentKey.permissions,
        ...newPermissions,
      };

      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function updateSessionKey(address wallet, address sessionKey, address[] allowedContracts, bytes4[] allowedMethods, uint256 spendingLimit)',
        ],
        this.provider
      );

      const callData = sessionKeyModule.interface.encodeFunctionData(
        'updateSessionKey',
        [
          walletAddress,
          sessionKeyAddress,
          updatedPermissions.allowedContracts,
          updatedPermissions.allowedMethods,
          updatedPermissions.spendingLimit,
        ]
      );

      return callData;
    } catch (error) {
      console.error('Failed to update session key permissions:', error);
      throw error;
    }
  }

  /**
   * Extend session key validity
   */
  async extendSessionKey(
    walletAddress: string,
    sessionKeyAddress: string,
    newValidUntil: Date
  ): Promise<string> {
    try {
      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function extendSessionKey(address wallet, address sessionKey, uint256 validUntil)',
        ],
        this.provider
      );

      const callData = sessionKeyModule.interface.encodeFunctionData(
        'extendSessionKey',
        [walletAddress, sessionKeyAddress, Math.floor(newValidUntil.getTime() / 1000)]
      );

      return callData;
    } catch (error) {
      console.error('Failed to extend session key:', error);
      throw error;
    }
  }

  /**
   * Batch create session keys
   */
  async batchCreateSessionKeys(
    walletAddress: string,
    configs: SessionKeyConfig[]
  ): Promise<Array<{
    sessionKey: string;
    sessionKeyAddress: string;
    callData: string;
  }>> {
    try {
      const results = await Promise.all(
        configs.map(config =>
          this.createSessionKey(walletAddress, config.permissions, config.validUntil)
        )
      );

      return results;
    } catch (error) {
      console.error('Failed to batch create session keys:', error);
      throw error;
    }
  }

  /**
   * Batch revoke session keys
   */
  async batchRevokeSessionKeys(
    walletAddress: string,
    sessionKeyAddresses: string[]
  ): Promise<string[]> {
    try {
      const callDataArray = await Promise.all(
        sessionKeyAddresses.map(address =>
          this.revokeSessionKey(walletAddress, address)
        )
      );

      return callDataArray;
    } catch (error) {
      console.error('Failed to batch revoke session keys:', error);
      throw error;
    }
  }

  /**
   * Get session key usage statistics
   */
  async getSessionKeyStats(
    walletAddress: string,
    sessionKeyAddress: string
  ): Promise<{
    totalTransactions: number;
    totalSpent: bigint;
    remainingLimit: bigint;
    utilizationRate: number;
  } | null> {
    try {
      const sessionKey = await this.getSessionKey(walletAddress, sessionKeyAddress);
      
      if (!sessionKey) {
        return null;
      }

      const sessionKeyModule = new ethers.Contract(
        this.sessionKeyModuleAddress,
        [
          'function getSessionKeyTransactionCount(address wallet, address sessionKey) view returns (uint256)',
        ],
        this.provider
      );

      const totalTransactions = await sessionKeyModule.getSessionKeyTransactionCount(
        walletAddress,
        sessionKeyAddress
      );

      const remainingLimit = sessionKey.permissions.spendingLimit - sessionKey.spentAmount;
      const utilizationRate = sessionKey.permissions.spendingLimit > 0n
        ? Number(sessionKey.spentAmount * 100n / sessionKey.permissions.spendingLimit)
        : 0;

      return {
        totalTransactions: Number(totalTransactions),
        totalSpent: sessionKey.spentAmount,
        remainingLimit,
        utilizationRate,
      };
    } catch (error) {
      console.error('Failed to get session key stats:', error);
      return null;
    }
  }
}
