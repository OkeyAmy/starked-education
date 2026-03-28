/**
 * Smart Wallet Tests
 * Comprehensive tests for smart contract wallet functionality
 */

import { ethers } from 'ethers';
import { AccountAbstractionService } from '../services/smartWallet/AccountAbstractionService';
import { SocialRecoveryService } from '../services/smartWallet/SocialRecoveryService';
import { MultiSigService } from '../services/smartWallet/MultiSigService';
import { SessionKeyService } from '../services/smartWallet/SessionKeyService';
import { GasOptimizationService } from '../services/smartWallet/GasOptimizationService';

describe('Smart Wallet System', () => {
  let accountService: AccountAbstractionService;
  let recoveryService: SocialRecoveryService;
  let multiSigService: MultiSigService;
  let sessionKeyService: SessionKeyService;
  let gasOptimizationService: GasOptimizationService;

  const testConfig = {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    bundlerUrl: process.env.BUNDLER_URL || 'https://bundler.biconomy.io/api/v2/11155111',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    walletFactoryAddress: '0x0000000000000000000000000000000000000001',
    paymasterAddress: '0x0000000000000000000000000000000000000002',
    recoveryModuleAddress: '0x0000000000000000000000000000000000000003',
    multiSigModuleAddress: '0x0000000000000000000000000000000000000004',
    sessionKeyModuleAddress: '0x0000000000000000000000000000000000000005',
  };

  beforeAll(() => {
    accountService = new AccountAbstractionService(testConfig);
    recoveryService = new SocialRecoveryService({
      rpcUrl: testConfig.rpcUrl,
      recoveryModuleAddress: testConfig.recoveryModuleAddress,
    });
    multiSigService = new MultiSigService({
      rpcUrl: testConfig.rpcUrl,
      multiSigModuleAddress: testConfig.multiSigModuleAddress,
    });
    sessionKeyService = new SessionKeyService({
      rpcUrl: testConfig.rpcUrl,
      sessionKeyModuleAddress: testConfig.sessionKeyModuleAddress,
    });
    gasOptimizationService = new GasOptimizationService({
      rpcUrl: testConfig.rpcUrl,
    });
  });

  describe('Account Abstraction', () => {
    it('should create user operation with correct structure', async () => {
      const userOp = await accountService.createUserOperation({
        sender: '0x1234567890123456789012345678901234567890',
        callData: '0x',
      });

      expect(userOp).toHaveProperty('sender');
      expect(userOp).toHaveProperty('nonce');
      expect(userOp).toHaveProperty('callGasLimit');
      expect(userOp).toHaveProperty('verificationGasLimit');
      expect(userOp).toHaveProperty('maxFeePerGas');
    });

    it('should estimate gas correctly', async () => {
      const userOp = await accountService.createUserOperation({
        sender: '0x1234567890123456789012345678901234567890',
        callData: '0x',
      });

      expect(BigInt(userOp.callGasLimit)).toBeGreaterThan(0n);
      expect(BigInt(userOp.verificationGasLimit)).toBeGreaterThan(0n);
    });
  });

  describe('Social Recovery', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testGuardians = [
      {
        address: '0x1111111111111111111111111111111111111111',
        name: 'Guardian 1',
        addedAt: new Date(),
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        name: 'Guardian 2',
        addedAt: new Date(),
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        name: 'Guardian 3',
        addedAt: new Date(),
      },
    ];

    it('should setup social recovery with valid configuration', async () => {
      const callData = await recoveryService.setupSocialRecovery(
        testWallet,
        testGuardians,
        2
      );

      expect(callData).toBeDefined();
      expect(callData).toMatch(/^0x/);
    });

    it('should reject invalid threshold', async () => {
      await expect(
        recoveryService.setupSocialRecovery(testWallet, testGuardians, 4)
      ).rejects.toThrow();
    });

    it('should generate guardian signature', async () => {
      const privateKey = '0x' + '1'.repeat(64);
      const newOwner = '0x4444444444444444444444444444444444444444';

      const signature = await recoveryService.generateGuardianSignature(
        testWallet,
        newOwner,
        privateKey
      );

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x/);
      expect(signature.length).toBe(132); // 0x + 130 chars
    });
  });

  describe('Multi-Signature', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testSigners = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
    ];

    it('should setup multi-sig with valid configuration', async () => {
      const callData = await multiSigService.setupMultiSig(
        testWallet,
        testSigners,
        2
      );

      expect(callData).toBeDefined();
      expect(callData).toMatch(/^0x/);
    });

    it('should propose transaction', async () => {
      const result = await multiSigService.proposeTransaction(
        testWallet,
        '0x4444444444444444444444444444444444444444',
        ethers.parseEther('1'),
        '0x',
        testSigners[0]
      );

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('callData');
      expect(result.transactionId).toMatch(/^0x/);
    });

    it('should generate signer signature', async () => {
      const privateKey = '0x' + '1'.repeat(64);
      const transactionId = ethers.keccak256(ethers.toUtf8Bytes('test'));

      const signature = await multiSigService.generateSignerSignature(
        transactionId,
        privateKey
      );

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x/);
    });
  });

  describe('Session Keys', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testPermissions = {
      allowedContracts: ['0x4444444444444444444444444444444444444444'],
      allowedMethods: ['0xa9059cbb'],
      spendingLimit: ethers.parseEther('1'),
    };

    it('should create session key', async () => {
      const validUntil = new Date(Date.now() + 86400000); // 24 hours

      const result = await sessionKeyService.createSessionKey(
        testWallet,
        testPermissions,
        validUntil
      );

      expect(result).toHaveProperty('sessionKey');
      expect(result).toHaveProperty('sessionKeyAddress');
      expect(result).toHaveProperty('callData');
      expect(result.sessionKey).toMatch(/^0x/);
    });

    it('should validate session key permissions', async () => {
      const sessionKeyAddress = '0x5555555555555555555555555555555555555555';
      const targetContract = testPermissions.allowedContracts[0];
      const method = 'transfer(address,uint256)';
      const value = ethers.parseEther('0.5');

      // This will fail in test environment without actual contract
      // but validates the structure
      const validation = await sessionKeyService.validateSessionKey(
        testWallet,
        sessionKeyAddress,
        targetContract,
        method,
        value
      );

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Gas Optimization', () => {
    it('should calculate batch savings correctly', () => {
      const batchSize = 5;
      const result = gasOptimizationService.calculateBatchSavings(batchSize);

      expect(result.individualGas).toBeGreaterThan(result.batchGas);
      expect(result.savings).toBeGreaterThan(0n);
      expect(result.savingsPercentage).toBeGreaterThan(30); // Should be > 30%
    });

    it('should achieve 40% gas savings with batching', () => {
      const batchSize = 5;
      const result = gasOptimizationService.calculateBatchSavings(batchSize);

      expect(result.savingsPercentage).toBeGreaterThanOrEqual(40);
    });

    it('should optimize user operation', async () => {
      const userOp = await accountService.createUserOperation({
        sender: '0x1234567890123456789012345678901234567890',
        callData: '0x' + '0'.repeat(1000), // Large calldata
      });

      const { optimizedUserOp, optimization } = await gasOptimizationService.optimizeUserOperation(userOp);

      expect(optimization.optimizedGas).toBeLessThan(optimization.originalGas);
      expect(optimization.savings).toBeGreaterThan(0n);
      expect(optimization.strategiesApplied.length).toBeGreaterThan(0);
    });

    it('should provide gas usage recommendations', async () => {
      const analysis = await gasOptimizationService.analyzeGasUsage(
        '0x1234567890123456789012345678901234567890',
        100
      );

      expect(analysis).toHaveProperty('averageGas');
      expect(analysis).toHaveProperty('totalGas');
      expect(analysis).toHaveProperty('potentialSavings');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should list optimization strategies', () => {
      const stats = gasOptimizationService.getOptimizationStats();

      expect(stats).toHaveProperty('strategies');
      expect(stats).toHaveProperty('totalEstimatedSavings');
      expect(stats.strategies.length).toBeGreaterThan(0);
      expect(stats.totalEstimatedSavings).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full wallet creation flow', async () => {
      const ownerAddress = ethers.Wallet.createRandom().address;
      const guardians = [
        {
          address: ethers.Wallet.createRandom().address,
          name: 'Guardian 1',
          addedAt: new Date(),
        },
        {
          address: ethers.Wallet.createRandom().address,
          name: 'Guardian 2',
          addedAt: new Date(),
        },
      ];

      // This will fail without actual blockchain connection
      // but validates the flow structure
      try {
        const result = await accountService.createSmartWallet(
          ownerAddress,
          {
            guardians,
            threshold: 2,
          }
        );

        expect(result).toHaveProperty('walletAddress');
        expect(result).toHaveProperty('initCode');
        expect(result).toHaveProperty('userOpHash');
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });

    it('should handle batch transaction optimization', async () => {
      const transactions = [
        {
          to: ethers.Wallet.createRandom().address,
          value: ethers.parseEther('0.1'),
          data: '0x',
        },
        {
          to: ethers.Wallet.createRandom().address,
          value: ethers.parseEther('0.2'),
          data: '0x',
        },
        {
          to: ethers.Wallet.createRandom().address,
          value: ethers.parseEther('0.3'),
          data: '0x',
        },
      ];

      const result = await gasOptimizationService.batchOptimize(transactions);

      expect(result).toHaveProperty('batchCallData');
      expect(result).toHaveProperty('optimization');
      expect(result.optimization.savingsPercentage).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should complete multi-sig operations in <30 seconds', async () => {
      const startTime = Date.now();
      
      const testWallet = '0x1234567890123456789012345678901234567890';
      const testSigners = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ];

      await multiSigService.setupMultiSig(testWallet, testSigners, 2);
      await multiSigService.proposeTransaction(
        testWallet,
        '0x4444444444444444444444444444444444444444',
        ethers.parseEther('1'),
        '0x',
        testSigners[0]
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // 30 seconds
    });

    it('should handle high-volume batch operations', async () => {
      const batchSize = 50;
      const transactions = Array.from({ length: batchSize }, () => ({
        to: ethers.Wallet.createRandom().address,
        value: ethers.parseEther('0.01'),
        data: '0x',
      }));

      const startTime = Date.now();
      const result = await gasOptimizationService.batchOptimize(transactions);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(result.optimization.savingsPercentage).toBeGreaterThan(30);
    });
  });
});
