const Web3 = require('web3');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Cross-Chain Bridge Service
 * Intelligent routing and gas optimization for multi-chain operations
 */
class CrossChainBridge extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      supportedChains: config.supportedChains || [
        { id: 'ethereum', name: 'Ethereum', rpcUrl: config.ethereumRpc, chainId: 1 },
        { id: 'polygon', name: 'Polygon', rpcUrl: config.polygonRpc, chainId: 137 },
        { id: 'bsc', name: 'BSC', rpcUrl: config.bscRpc, chainId: 56 },
        { id: 'arbitrum', name: 'Arbitrum', rpcUrl: config.arbitrumRpc, chainId: 42161 },
        { id: 'optimism', name: 'Optimism', rpcUrl: config.optimismRpc, chainId: 10 },
        { id: 'avalanche', name: 'Avalanche', rpcUrl: config.avalancheRpc, chainId: 43114 }
      ],
      gasOptimizationEnabled: config.gasOptimizationEnabled ?? true,
      routingAlgorithm: config.routingAlgorithm || 'optimal', // optimal, fastest, cheapest
      ...config
    };

    this.providers = new Map();
    this.gasOracle = new Map();
    this.liquidityPools = new Map();
    this.activeTransfers = new Map();
    this.routingTable = new Map();
    
    this.metrics = {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      averageCompletionTime: 0,
      totalGasSaved: 0
    };

    this.initializeProviders();
    this.startGasMonitoring();
  }

  /**
   * Initialize blockchain providers
   */
  initializeProviders() {
    this.config.supportedChains.forEach(chain => {
      if (chain.rpcUrl) {
        const provider = new Web3.providers.HttpProvider(chain.rpcUrl);
        this.providers.set(chain.id, { web3: new Web3(provider), chain });
        logger.info(`Initialized provider for ${chain.name}`);
      }
    });
  }

  /**
   * Start monitoring gas prices across chains
   */
  startGasMonitoring() {
    const updateGasPrices = async () => {
      for (const [chainId, provider] of this.providers) {
        try {
          const gasPrice = await provider.web3.eth.getGasPrice();
          this.gasOracle.set(chainId, {
            gasPrice: Web3.utils.fromWei(gasPrice, 'gwei'),
            timestamp: Date.now(),
            congestionLevel: this._assessCongestion(gasPrice)
          });
        } catch (error) {
          logger.error(`Failed to get gas price for ${chainId}:`, error);
        }
      }
    };

    // Update every 10 seconds
    updateGasPrices();
    setInterval(updateGasPrices, 10000);
  }

  /**
   * Find optimal route for cross-chain transfer
   */
  async findOptimalRoute(params) {
    const { sourceChain, destinationChain, amount, token } = params;
    
    const routes = [];
    
    // Direct route
    const directRoute = await this._evaluateRoute(sourceChain, destinationChain, amount, token);
    routes.push(directRoute);

    // Multi-hop routes through intermediate chains
    const intermediateRoutes = await this._findIntermediateRoutes(sourceChain, destinationChain, amount, token);
    routes.push(...intermediateRoutes);

    // Sort by criteria based on routing algorithm
    routes.sort((a, b) => {
      if (this.config.routingAlgorithm === 'cheapest') {
        return a.totalCost - b.totalCost;
      } else if (this.config.routingAlgorithm === 'fastest') {
        return a.estimatedTime - b.estimatedTime;
      } else {
        // Optimal: balance of cost and speed
        return (a.totalCost * 0.6 + a.estimatedTime * 0.4) - 
               (b.totalCost * 0.6 + b.estimatedTime * 0.4);
      }
    });

    const bestRoute = routes[0];
    logger.info(`Best route found: ${sourceChain} -> ${destinationChain}, Cost: ${bestRoute.totalCost.toFixed(2)}, Time: ${bestRoute.estimatedTime}s`);
    
    return bestRoute;
  }

  /**
   * Execute cross-chain transfer with optimized routing
   */
  async executeTransfer(transferParams) {
    const { sourceChain, destinationChain, amount, token, recipient, sender } = transferParams;
    
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Find optimal route
      const route = await this.findOptimalRoute({
        sourceChain,
        destinationChain,
        amount,
        token
      });

      this.activeTransfers.set(transferId, {
        status: 'initiated',
        route,
        params: transferParams,
        startTime: Date.now(),
        steps: []
      });

      this.emit('transferStarted', { transferId, route });

      // Step 1: Lock tokens on source chain
      const lockResult = await this._lockTokens(sourceChain, amount, token, sender);
      this._addTransferStep(transferId, 'lock_tokens', lockResult);

      // Step 2: Generate proof of lock
      const proof = await this._generateLockProof(lockResult);
      this._addTransferStep(transferId, 'generate_proof', { success: true, proof });

      // Step 3: Relay proof to destination chain
      const relayResult = await this._relayProof(destinationChain, proof);
      this._addTransferStep(transferId, 'relay_proof', relayResult);

      // Step 4: Release tokens on destination chain
      const releaseResult = await this._releaseTokens(destinationChain, amount, token, recipient, proof);
      this._addTransferStep(transferId, 'release_tokens', releaseResult);

      // Transfer completed successfully
      this._completeTransfer(transferId, releaseResult);
      
      this.metrics.successfulTransfers++;
      const completionTime = (Date.now() - this.activeTransfers.get(transferId).startTime) / 1000;
      this._updateAverageCompletionTime(completionTime);

      return {
        transferId,
        success: true,
        route,
        completionTime,
        txHash: releaseResult.txHash
      };

    } catch (error) {
      logger.error(`Transfer ${transferId} failed:`, error);
      
      this.metrics.failedTransfers++;
      this.activeTransfers.get(transferId).status = 'failed';
      this.activeTransfers.get(transferId).error = error.message;

      this.emit('transferFailed', { transferId, error: error.message });

      throw error;
    }
  }

  /**
   * Get liquidity pool status for a chain pair
   */
  async getLiquidityStatus(sourceChain, destinationChain) {
    const poolKey = `${sourceChain}:${destinationChain}`;
    
    if (!this.liquidityPools.has(poolKey)) {
      // Initialize pool if not exists
      this.liquidityPools.set(poolKey, {
        sourceBalance: Math.random() * 1000000, // Simulated
        destinationBalance: Math.random() * 1000000,
        utilizationRate: Math.random() * 0.6 + 0.2,
        lastUpdated: Date.now()
      });
    }

    return this.liquidityPools.get(poolKey);
  }

  /**
   * Calculate gas savings from optimization
   */
  calculateGasSavings(originalRoute, optimizedRoute) {
    const savings = originalRoute.totalCost - optimizedRoute.totalCost;
    const savingsPercentage = (savings / originalRoute.totalCost) * 100;
    
    this.metrics.totalGasSaved += savings;
    
    return {
      originalCost: originalRoute.totalCost,
      optimizedCost: optimizedRoute.totalCost,
      savings,
      savingsPercentage: savingsPercentage.toFixed(2) + '%'
    };
  }

  /**
   * Get bridge statistics and metrics
   */
  getBridgeStats() {
    return {
      metrics: this.metrics,
      activeTransfers: this.activeTransfers.size,
      supportedChains: this.providers.size,
      averageGasPrices: Object.fromEntries(this.gasOracle),
      successRate: this.metrics.totalTransfers > 0 
        ? ((this.metrics.successfulTransfers / this.metrics.totalTransfers) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Evaluate single route
   */
  async _evaluateRoute(sourceChain, destinationChain, amount, token) {
    const sourceGas = this.gasOracle.get(sourceChain) || { gasPrice: 50, congestionLevel: 0.5 };
    const destGas = this.gasOracle.get(destinationChain) || { gasPrice: 50, congestionLevel: 0.5 };
    
    const liquidityStatus = await this.getLiquidityStatus(sourceChain, destinationChain);
    
    // Calculate costs
    const lockCost = sourceGas.gasPrice * 21000 * 1e-9; // ETH equivalent
    const relayCost = 0.1; // Fixed relay cost
    const releaseCost = destGas.gasPrice * 50000 * 1e-9;
    
    const totalCost = lockCost + relayCost + releaseCost;
    const estimatedTime = this._estimateTransferTime(sourceGas.congestionLevel, destGas.congestionLevel);

    return {
      path: [sourceChain, destinationChain],
      hops: 1,
      totalCost,
      estimatedTime,
      liquidityAvailable: liquidityStatus.sourceBalance > amount,
      riskScore: this._calculateRiskScore(sourceChain, destinationChain)
    };
  }

  /**
   * Find multi-hop routes
   */
  async _findIntermediateRoutes(sourceChain, destinationChain, amount, token) {
    const routes = [];
    const intermediateChains = this.config.supportedChains
      .filter(c => c.id !== sourceChain && c.id !== destinationChain)
      .map(c => c.id);

    for (const intermediate of intermediateChains) {
      const firstHop = await this._evaluateRoute(sourceChain, intermediate, amount, token);
      const secondHop = await this._evaluateRoute(intermediate, destinationChain, amount, token);
      
      routes.push({
        path: [sourceChain, intermediate, destinationChain],
        hops: 2,
        totalCost: firstHop.totalCost + secondHop.totalCost,
        estimatedTime: firstHop.estimatedTime + secondHop.estimatedTime + 30, // Additional delay for hop
        liquidityAvailable: firstHop.liquidityAvailable && secondHop.liquidityAvailable,
        riskScore: Math.max(firstHop.riskScore, secondHop.riskScore)
      });
    }

    return routes;
  }

  /**
   * Lock tokens on source chain
   */
  async _lockTokens(chainId, amount, token, sender) {
    logger.info(`Locking ${amount} ${token} on ${chainId} from ${sender}`);
    
    // Simulated lock - implement actual smart contract interaction
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      lockedAmount: amount,
      lockAddress: '0x...' + Math.random().toString(16).substr(2, 4),
      timestamp: Date.now()
    };
  }

  /**
   * Generate cryptographic proof of lock
   */
  async _generateLockProof(lockResult) {
    const crypto = require('crypto');
    
    const proofData = {
      lockTxHash: lockResult.txHash,
      amount: lockResult.lockedAmount,
      timestamp: lockResult.timestamp
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex');

    return {
      type: 'merkle_proof',
      hash,
      data: proofData
    };
  }

  /**
   * Relay proof to destination chain
   */
  async _relayProof(chainId, proof) {
    logger.info(`Relaying proof to ${chainId}`);
    
    // Simulated relay
    return {
      success: true,
      relayedAt: Date.now(),
      destinationChain: chainId
    };
  }

  /**
   * Release tokens on destination chain
   */
  async _releaseTokens(chainId, amount, token, recipient, proof) {
    logger.info(`Releasing ${amount} ${token} to ${recipient} on ${chainId}`);
    
    // Simulated release
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      releasedAmount: amount,
      recipient,
      timestamp: Date.now()
    };
  }

  /**
   * Add step to transfer tracking
   */
  _addTransferStep(transferId, stepType, result) {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.steps.push({
        type: stepType,
        result,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Complete transfer
   */
  _completeTransfer(transferId, result) {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.result = result;
      this.metrics.totalTransfers++;
      
      this.emit('transferCompleted', { 
        transferId, 
        result,
        duration: Date.now() - transfer.startTime
      });
    }
  }

  /**
   * Estimate transfer time based on congestion
   */
  _estimateTransferTime(sourceCongestion, destCongestion) {
    const baseTime = 30; // Base 30 seconds
    const congestionDelay = (sourceCongestion + destCongestion) * 60;
    return baseTime + congestionDelay;
  }

  /**
   * Calculate risk score for route
   */
  _calculateRiskScore(sourceChain, destinationChain) {
    // Simplified risk calculation
    return Math.random() * 0.3 + 0.1; // 0.1-0.4 risk score
  }

  /**
   * Assess network congestion level
   */
  _assessCongestion(gasPriceWei) {
    const gasPriceGwei = Web3.utils.fromWei(gasPriceWei.toString(), 'gwei');
    
    if (gasPriceGwei > 100) return 0.9; // High congestion
    if (gasPriceGwei > 50) return 0.6;  // Medium congestion
    if (gasPriceGwei > 20) return 0.3;  // Low congestion
    return 0.1; // Minimal congestion
  }

  /**
   * Update average completion time metric
   */
  _updateAverageCompletionTime(newTime) {
    const total = this.metrics.successfulTransfers;
    const prevAvg = this.metrics.averageCompletionTime;
    
    this.metrics.averageCompletionTime = 
      ((prevAvg * (total - 1)) + newTime) / total;
  }
}

module.exports = CrossChainBridge;
