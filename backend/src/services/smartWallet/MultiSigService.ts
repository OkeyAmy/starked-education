/**
 * Multi-Signature Service
 * Implements multi-signature operations for smart contract wallets
 */

import { ethers } from 'ethers';
import { MultiSigTransaction, MultiSigConfig, SignerInfo } from './types/MultiSig';

export class MultiSigService {
  private provider: ethers.Provider;
  private multiSigModuleAddress: string;

  constructor(config: {
    rpcUrl: string;
    multiSigModuleAddress: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.multiSigModuleAddress = config.multiSigModuleAddress;
  }

  /**
   * Setup multi-signature configuration
   */
  async setupMultiSig(
    walletAddress: string,
    signers: string[],
    threshold: number
  ): Promise<string> {
    try {
      if (signers.length < threshold) {
        throw new Error('Number of signers must be >= threshold');
      }

      if (threshold < 1) {
        throw new Error('Threshold must be at least 1');
      }

      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function setupMultiSig(address wallet, address[] signers, uint256 threshold)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'setupMultiSig',
        [walletAddress, signers, threshold]
      );

      return callData;
    } catch (error) {
      console.error('Failed to setup multi-sig:', error);
      throw error;
    }
  }

  /**
   * Propose a new transaction
   */
  async proposeTransaction(
    walletAddress: string,
    to: string,
    value: bigint,
    data: string,
    proposer: string
  ): Promise<{
    transactionId: string;
    callData: string;
  }> {
    try {
      const transactionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256', 'bytes', 'uint256'],
          [walletAddress, to, value, data, Date.now()]
        )
      );

      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function proposeTransaction(address wallet, address to, uint256 value, bytes data) returns (bytes32)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'proposeTransaction',
        [walletAddress, to, value, data]
      );

      return {
        transactionId,
        callData,
      };
    } catch (error) {
      console.error('Failed to propose transaction:', error);
      throw error;
    }
  }

  /**
   * Approve a pending transaction
   */
  async approveTransaction(
    transactionId: string,
    signerAddress: string,
    signature: string
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function approveTransaction(bytes32 transactionId, bytes signature)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'approveTransaction',
        [transactionId, signature]
      );

      return callData;
    } catch (error) {
      console.error('Failed to approve transaction:', error);
      throw error;
    }
  }

  /**
   * Execute transaction after threshold is met
   */
  async executeTransaction(
    transactionId: string,
    walletAddress: string
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function executeTransaction(bytes32 transactionId, address wallet)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'executeTransaction',
        [transactionId, walletAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to execute transaction:', error);
      throw error;
    }
  }

  /**
   * Revoke transaction approval
   */
  async revokeApproval(
    transactionId: string,
    signerAddress: string
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function revokeApproval(bytes32 transactionId)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'revokeApproval',
        [transactionId]
      );

      return callData;
    } catch (error) {
      console.error('Failed to revoke approval:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(
    transactionId: string
  ): Promise<MultiSigTransaction | null> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function getTransaction(bytes32 transactionId) view returns (address wallet, address to, uint256 value, bytes data, uint256 approvalCount, uint256 threshold, bool executed, uint256 proposedAt)',
        ],
        this.provider
      );

      const result = await multiSigModule.getTransaction(transactionId);

      return {
        transactionId,
        walletAddress: result.wallet,
        to: result.to,
        value: result.value,
        data: result.data,
        approvalCount: Number(result.approvalCount),
        threshold: Number(result.threshold),
        executed: result.executed,
        proposedAt: new Date(Number(result.proposedAt) * 1000),
        approvals: [],
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return null;
    }
  }

  /**
   * Get pending transactions for a wallet
   */
  async getPendingTransactions(
    walletAddress: string
  ): Promise<MultiSigTransaction[]> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function getPendingTransactions(address wallet) view returns (bytes32[])',
        ],
        this.provider
      );

      const transactionIds = await multiSigModule.getPendingTransactions(walletAddress);
      
      const transactions = await Promise.all(
        transactionIds.map((id: string) => this.getTransaction(id))
      );

      return transactions.filter((tx): tx is MultiSigTransaction => tx !== null);
    } catch (error) {
      console.error('Failed to get pending transactions:', error);
      return [];
    }
  }

  /**
   * Get signers for a wallet
   */
  async getSigners(walletAddress: string): Promise<SignerInfo[]> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function getSigners(address wallet) view returns (address[])',
        ],
        this.provider
      );

      const signerAddresses = await multiSigModule.getSigners(walletAddress);

      return signerAddresses.map((address: string, index: number) => ({
        address,
        name: `Signer ${index + 1}`,
        addedAt: new Date(),
      }));
    } catch (error) {
      console.error('Failed to get signers:', error);
      return [];
    }
  }

  /**
   * Add signer to wallet
   */
  async addSigner(
    walletAddress: string,
    signerAddress: string
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function addSigner(address wallet, address signer)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'addSigner',
        [walletAddress, signerAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to add signer:', error);
      throw error;
    }
  }

  /**
   * Remove signer from wallet
   */
  async removeSigner(
    walletAddress: string,
    signerAddress: string
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function removeSigner(address wallet, address signer)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
        'removeSigner',
        [walletAddress, signerAddress]
      );

      return callData;
    } catch (error) {
      console.error('Failed to remove signer:', error);
      throw error;
    }
  }

  /**
   * Update signature threshold
   */
  async updateThreshold(
    walletAddress: string,
    newThreshold: number
  ): Promise<string> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function updateThreshold(address wallet, uint256 threshold)',
        ],
        this.provider
      );

      const callData = multiSigModule.interface.encodeFunctionData(
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
   * Check if address is a signer
   */
  async isSigner(
    walletAddress: string,
    signerAddress: string
  ): Promise<boolean> {
    try {
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function isSigner(address wallet, address signer) view returns (bool)',
        ],
        this.provider
      );

      return await multiSigModule.isSigner(walletAddress, signerAddress);
    } catch (error) {
      console.error('Failed to check signer status:', error);
      return false;
    }
  }

  /**
   * Get multi-sig configuration
   */
  async getMultiSigConfig(
    walletAddress: string
  ): Promise<MultiSigConfig | null> {
    try {
      const signers = await this.getSigners(walletAddress);
      
      const multiSigModule = new ethers.Contract(
        this.multiSigModuleAddress,
        [
          'function getThreshold(address wallet) view returns (uint256)',
        ],
        this.provider
      );

      const threshold = await multiSigModule.getThreshold(walletAddress);

      return {
        signers: signers.map(s => s.address),
        threshold: Number(threshold),
      };
    } catch (error) {
      console.error('Failed to get multi-sig config:', error);
      return null;
    }
  }

  /**
   * Generate signer signature for transaction
   */
  async generateSignerSignature(
    transactionId: string,
    signerPrivateKey: string
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(signerPrivateKey);
      
      const signature = await wallet.signMessage(ethers.getBytes(transactionId));
      
      return signature;
    } catch (error) {
      console.error('Failed to generate signer signature:', error);
      throw error;
    }
  }

  /**
   * Batch approve multiple transactions
   */
  async batchApproveTransactions(
    transactionIds: string[],
    signerPrivateKey: string
  ): Promise<string[]> {
    try {
      const signatures = await Promise.all(
        transactionIds.map(id => this.generateSignerSignature(id, signerPrivateKey))
      );

      return signatures;
    } catch (error) {
      console.error('Failed to batch approve transactions:', error);
      throw error;
    }
  }
}
