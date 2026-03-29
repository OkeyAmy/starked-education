/**
 * Account Abstraction Service (ERC-4337)
 * Implements smart contract wallet with social recovery, multi-sig, and session keys
 */

import { ethers } from 'ethers';
import { UserOperation, UserOperationStruct } from './types/UserOperation';
import { SocialRecoveryConfig, Guardian } from './types/SocialRecovery';
import { SessionKey, SessionKeyPermissions } from './types/SessionKey';

export class AccountAbstractionService {
  private provider: ethers.Provider;
  private bundlerUrl: string;
  private entryPointAddress: string;
  private walletFactoryAddress: string;
  private paymasterAddress: string;

  constructor(config: {
    rpcUrl: string;
    bundlerUrl: string;
    entryPointAddress: string;
    walletFactoryAddress: string;
    paymasterAddress: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.bundlerUrl = config.bundlerUrl;
    this.entryPointAddress = config.entryPointAddress;
    this.walletFactoryAddress = config.walletFactoryAddress;
    this.paymasterAddress = config.paymasterAddress;
  }

  /**
   * Create a new smart contract wallet
   */
  async createSmartWallet(
    ownerAddress: string,
    socialRecoveryConfig?: SocialRecoveryConfig
  ): Promise<{
    walletAddress: string;
    initCode: string;
    userOpHash: string;
  }> {
    try {
      // Generate wallet address deterministically
      const salt = ethers.randomBytes(32);
      const walletAddress = await this.predictWalletAddress(ownerAddress, salt);

      // Create initialization code
      const initCode = await this.generateInitCode(
        ownerAddress,
        salt,
        socialRecoveryConfig
      );

      // Create user operation for wallet deployment
      const userOp = await this.createUserOperation({
        sender: walletAddress,
        initCode,
        callData: '0x',
        callGasLimit: 200000,
        verificationGasLimit: 500000,
        preVerificationGas: 50000,
      });

      // Submit to bundler
      const userOpHash = await this.submitUserOperation(userOp);

      return {
        walletAddress,
        initCode,
        userOpHash,
      };
    } catch (error) {
      console.error('Failed to create smart wallet:', error);
      throw new Error(`Smart wallet creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict wallet address before deployment
   */
  private async predictWalletAddress(
    owner: string,
    salt: Uint8Array
  ): Promise<string> {
    const factoryContract = new ethers.Contract(
      this.walletFactoryAddress,
      ['function getAddress(address owner, uint256 salt) view returns (address)'],
      this.provider
    );

    return await factoryContract.getAddress(owner, ethers.hexlify(salt));
  }

  /**
   * Generate initialization code for wallet deployment
   */
  private async generateInitCode(
    owner: string,
    salt: Uint8Array,
    socialRecoveryConfig?: SocialRecoveryConfig
  ): Promise<string> {
    const factoryInterface = new ethers.Interface([
      'function createAccount(address owner, uint256 salt, address[] guardians, uint256 threshold) returns (address)',
    ]);

    const guardians = socialRecoveryConfig?.guardians.map(g => g.address) || [];
    const threshold = socialRecoveryConfig?.threshold || 0;

    const callData = factoryInterface.encodeFunctionData('createAccount', [
      owner,
      ethers.hexlify(salt),
      guardians,
      threshold,
    ]);

    return ethers.concat([this.walletFactoryAddress, callData]);
  }

  /**
   * Create a user operation
   */
  async createUserOperation(
    params: Partial<UserOperationStruct>
  ): Promise<UserOperation> {
    const nonce = await this.getNonce(params.sender!);
    const gasPrice = await this.getGasPrice();

    const userOp: UserOperation = {
      sender: params.sender!,
      nonce: nonce.toString(),
      initCode: params.initCode || '0x',
      callData: params.callData || '0x',
      callGasLimit: params.callGasLimit?.toString() || '200000',
      verificationGasLimit: params.verificationGasLimit?.toString() || '500000',
      preVerificationGas: params.preVerificationGas?.toString() || '50000',
      maxFeePerGas: gasPrice.maxFeePerGas.toString(),
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas.toString(),
      paymasterAndData: params.paymasterAndData || '0x',
      signature: params.signature || '0x',
    };

    return userOp;
  }

  /**
   * Get nonce for wallet
   */
  private async getNonce(walletAddress: string): Promise<bigint> {
    const entryPoint = new ethers.Contract(
      this.entryPointAddress,
      ['function getNonce(address sender, uint192 key) view returns (uint256)'],
      this.provider
    );

    return await entryPoint.getNonce(walletAddress, 0);
  }

  /**
   * Get current gas prices
   */
  private async getGasPrice(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    const feeData = await this.provider.getFeeData();
    
    return {
      maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei'),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei'),
    };
  }

  /**
   * Submit user operation to bundler
   */
  async submitUserOperation(userOp: UserOperation): Promise<string> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, this.entryPointAddress],
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.result;
    } catch (error) {
      console.error('Failed to submit user operation:', error);
      throw error;
    }
  }

  /**
   * Get user operation receipt
   */
  async getUserOperationReceipt(userOpHash: string): Promise<any> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash],
        }),
      });

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Failed to get user operation receipt:', error);
      throw error;
    }
  }

  /**
   * Execute transaction through smart wallet
   */
  async executeTransaction(
    walletAddress: string,
    to: string,
    value: bigint,
    data: string,
    signature: string
  ): Promise<string> {
    const walletInterface = new ethers.Interface([
      'function execute(address to, uint256 value, bytes data)',
    ]);

    const callData = walletInterface.encodeFunctionData('execute', [
      to,
      value,
      data,
    ]);

    const userOp = await this.createUserOperation({
      sender: walletAddress,
      callData,
      signature,
    });

    return await this.submitUserOperation(userOp);
  }

  /**
   * Execute batch transactions
   */
  async executeBatchTransactions(
    walletAddress: string,
    transactions: Array<{ to: string; value: bigint; data: string }>,
    signature: string
  ): Promise<string> {
    const walletInterface = new ethers.Interface([
      'function executeBatch(address[] to, uint256[] value, bytes[] data)',
    ]);

    const callData = walletInterface.encodeFunctionData('executeBatch', [
      transactions.map(tx => tx.to),
      transactions.map(tx => tx.value),
      transactions.map(tx => tx.data),
    ]);

    const userOp = await this.createUserOperation({
      sender: walletAddress,
      callData,
      signature,
    });

    return await this.submitUserOperation(userOp);
  }

  /**
   * Estimate gas for user operation
   */
  async estimateUserOperationGas(
    userOp: Partial<UserOperation>
  ): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
  }> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateUserOperationGas',
          params: [userOp, this.entryPointAddress],
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        callGasLimit: BigInt(result.result.callGasLimit),
        verificationGasLimit: BigInt(result.result.verificationGasLimit),
        preVerificationGas: BigInt(result.result.preVerificationGas),
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  /**
   * Get paymaster data for sponsored transactions
   */
  async getPaymasterData(
    userOp: UserOperation
  ): Promise<string> {
    try {
      const paymasterInterface = new ethers.Interface([
        'function getPaymasterData(bytes32 userOpHash) view returns (bytes)',
      ]);

      const userOpHash = this.getUserOperationHash(userOp);
      
      const paymaster = new ethers.Contract(
        this.paymasterAddress,
        paymasterInterface,
        this.provider
      );

      return await paymaster.getPaymasterData(userOpHash);
    } catch (error) {
      console.error('Failed to get paymaster data:', error);
      return '0x';
    }
  }

  /**
   * Calculate user operation hash
   */
  private getUserOperationHash(userOp: UserOperation): string {
    const packed = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'address', 'uint256', 'bytes32', 'bytes32',
        'uint256', 'uint256', 'uint256', 'uint256',
        'uint256', 'bytes32'
      ],
      [
        userOp.sender,
        userOp.nonce,
        ethers.keccak256(userOp.initCode),
        ethers.keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        ethers.keccak256(userOp.paymasterAndData),
      ]
    );

    return ethers.keccak256(packed);
  }
}
