/**
 * Social Recovery Service
 * Implements social recovery mechanism for smart contract wallets
 */

import { ethers } from 'ethers';
import { Guardian, RecoveryRequest, SocialRecoveryConfig } from './types/SocialRecovery';

export class SocialRecoveryService {
  private provider: ethers.Provider;
  private recoveryModuleAddress: string;

  constructor(config: {
    rpcUrl: string;
    recoveryModuleAddress: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.recoveryModuleAddress = config.recoveryModuleAddress;
  }

  /**
   * Setup social recovery for a wallet
   */
  async setupSocialRecovery(
    walletAddress: string,
    guardians: Guardian[],
    threshold: number
  ): Promise<string> {
    try {
      if (guardians.length < threshold) {
        throw new Error('Number of guardians must be >= threshold');
      }

      if (threshold < 1) {
        throw new Error('Threshold must be at least 1');
      }

      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function setupRecovery(address wallet, address[] guardians, uint256 threshold)',
        ],
        this.provider
      );

      const guardianAddresses = guardians.map(g => g.address);
      
      // This would typically be called through the wallet's execute function
      const callData = recoveryModule.interface.encodeFunctionData(
        'setupRecovery',
        [walletAddress, guardianAddresses, threshold]
      );

      return callData;
    } catch (error) {
      console.error('Failed to setup social recovery:', error);
      throw error;
    }
  }

  /**
   * Initiate recovery process
   */
  async initiateRecovery(
    walletAddress: string,
    newOwner: string,
    guardianAddress: string,
    guardianSignature: string
  ): Promise<{
    recoveryId: string;
    callData: string;
  }> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function initiateRecovery(address wallet, address newOwner, bytes signature) returns (bytes32)',
        ],
        this.provider
      );

      const recoveryId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256'],
          [walletAddress, newOwner, Date.now()]
        )
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'initiateRecovery',
        [walletAddress, newOwner, guardianSignature]
      );

      return {
        recoveryId,
        callData,
      };
    } catch (error) {
      console.error('Failed to initiate recovery:', error);
      throw error;
    }
  }

  /**
   * Support recovery request (guardian approval)
   */
  async supportRecovery(
    recoveryId: string,
    guardianAddress: string,
    guardianSignature: string
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function supportRecovery(bytes32 recoveryId, bytes signature)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'supportRecovery',
        [recoveryId, guardianSignature]
      );

      return callData;
    } catch (error) {
      console.error('Failed to support recovery:', error);
      throw error;
    }
  }

  /**
   * Execute recovery after threshold is met
   */
  async executeRecovery(
    recoveryId: string,
    walletAddress: string
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function executeRecovery(bytes32 recoveryId, address wallet)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'executeRecovery',
        [recoveryId, walletAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to execute recovery:', error);
      throw error;
    }
  }

  /**
   * Cancel recovery request
   */
  async cancelRecovery(
    recoveryId: string,
    walletAddress: string
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function cancelRecovery(bytes32 recoveryId, address wallet)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'cancelRecovery',
        [recoveryId, walletAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to cancel recovery:', error);
      throw error;
    }
  }

  /**
   * Get recovery request details
   */
  async getRecoveryRequest(
    recoveryId: string
  ): Promise<RecoveryRequest | null> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function getRecoveryRequest(bytes32 recoveryId) view returns (address wallet, address newOwner, uint256 approvalCount, uint256 threshold, uint256 initiatedAt, bool executed, bool cancelled)',
        ],
        this.provider
      );

      const result = await recoveryModule.getRecoveryRequest(recoveryId);

      return {
        recoveryId,
        walletAddress: result.wallet,
        newOwner: result.newOwner,
        approvalCount: Number(result.approvalCount),
        threshold: Number(result.threshold),
        initiatedAt: new Date(Number(result.initiatedAt) * 1000),
        executed: result.executed,
        cancelled: result.cancelled,
        guardianApprovals: [],
      };
    } catch (error) {
      console.error('Failed to get recovery request:', error);
      return null;
    }
  }

  /**
   * Get guardians for a wallet
   */
  async getGuardians(walletAddress: string): Promise<Guardian[]> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function getGuardians(address wallet) view returns (address[])',
          'function getThreshold(address wallet) view returns (uint256)',
        ],
        this.provider
      );

      const guardianAddresses = await recoveryModule.getGuardians(walletAddress);
      const threshold = await recoveryModule.getThreshold(walletAddress);

      return guardianAddresses.map((address: string, index: number) => ({
        address,
        name: `Guardian ${index + 1}`,
        addedAt: new Date(),
      }));
    } catch (error) {
      console.error('Failed to get guardians:', error);
      return [];
    }
  }

  /**
   * Add guardian to wallet
   */
  async addGuardian(
    walletAddress: string,
    guardianAddress: string
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function addGuardian(address wallet, address guardian)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'addGuardian',
        [walletAddress, guardianAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to add guardian:', error);
      throw error;
    }
  }

  /**
   * Remove guardian from wallet
   */
  async removeGuardian(
    walletAddress: string,
    guardianAddress: string
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function removeGuardian(address wallet, address guardian)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'removeGuardian',
        [walletAddress, guardianAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to remove guardian:', error);
      throw error;
    }
  }

  /**
   * Update recovery threshold
   */
  async updateThreshold(
    walletAddress: string,
    newThreshold: number
  ): Promise<string> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function updateThreshold(address wallet, uint256 threshold)',
        ],
        this.provider
      );

      const callData = recoveryModule.interface.encodeFunctionData(
        'updateThreshold',
        [walletAddress, newThreshold]
      );

      return callData;
    } catch (error) {
      console.error('Failed to update threshold:', error);
      throw error;
    }
  }

  /**
   * Check if address is a guardian
   */
  async isGuardian(
    walletAddress: string,
    guardianAddress: string
  ): Promise<boolean> {
    try {
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function isGuardian(address wallet, address guardian) view returns (bool)',
        ],
        this.provider
      );

      return await recoveryModule.isGuardian(walletAddress, guardianAddress);
    } catch (error) {
      console.error('Failed to check guardian status:', error);
      return false;
    }
  }

  /**
   * Get recovery configuration
   */
  async getRecoveryConfig(
    walletAddress: string
  ): Promise<SocialRecoveryConfig | null> {
    try {
      const guardians = await this.getGuardians(walletAddress);
      
      const recoveryModule = new ethers.Contract(
        this.recoveryModuleAddress,
        [
          'function getThreshold(address wallet) view returns (uint256)',
          'function getRecoveryPeriod(address wallet) view returns (uint256)',
        ],
        this.provider
      );

      const threshold = await recoveryModule.getThreshold(walletAddress);
      const recoveryPeriod = await recoveryModule.getRecoveryPeriod(walletAddress);

      return {
        guardians,
        threshold: Number(threshold),
        recoveryPeriod: Number(recoveryPeriod),
      };
    } catch (error) {
      console.error('Failed to get recovery config:', error);
      return null;
    }
  }

  /**
   * Generate guardian signature for recovery
   */
  async generateGuardianSignature(
    walletAddress: string,
    newOwner: string,
    guardianPrivateKey: string
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(guardianPrivateKey);
      
      const message = ethers.solidityPackedKeccak256(
        ['address', 'address'],
        [walletAddress, newOwner]
      );

      const signature = await wallet.signMessage(ethers.getBytes(message));
      
      return signature;
    } catch (error) {
      console.error('Failed to generate guardian signature:', error);
      throw error;
    }
  }
}
