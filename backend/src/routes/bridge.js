const express = require('express');
const router = express.Router();
const CrossChainBridge = require('../services/bridge/CrossChainBridge');
const logger = require('../../utils/logger');

// Initialize bridge service
let bridgeService;

try {
  bridgeService = new CrossChainBridge({
    ethereumRpc: process.env.ETHEREUM_RPC,
    polygonRpc: process.env.POLYGON_RPC,
    bscRpc: process.env.BSC_RPC,
    arbitrumRpc: process.env.ARBITRUM_RPC,
    optimismRpc: process.env.OPTIMISM_RPC,
    avalancheRpc: process.env.AVALANCHE_RPC,
    gasOptimizationEnabled: true,
    routingAlgorithm: 'optimal'
  });
  
  logger.info('Cross-chain bridge service initialized');
} catch (error) {
  logger.error('Failed to initialize bridge service:', error);
}

/**
 * @route GET /api/bridge/stats
 * @desc Get bridge statistics and metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = bridgeService.getBridgeStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting bridge stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/bridge/transfer
 * @desc Execute cross-chain transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { sourceChain, destinationChain, amount, token, recipient, sender } = req.body;

    if (!sourceChain || !destinationChain || !amount || !token || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sourceChain, destinationChain, amount, token, recipient'
      });
    }

    // Find optimal route first
    const route = await bridgeService.findOptimalRoute({
      sourceChain,
      destinationChain,
      amount,
      token
    });

    res.json({
      success: true,
      data: {
        route,
        message: 'Route found. Call execute to proceed with transfer.'
      }
    });
  } catch (error) {
    logger.error('Error finding route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/bridge/transfer/execute
 * @desc Execute transfer with pre-calculated route
 */
router.post('/transfer/execute', async (req, res) => {
  try {
    const { sourceChain, destinationChain, amount, token, recipient, sender } = req.body;

    if (!sourceChain || !destinationChain || !amount || !token || !recipient || !sender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await bridgeService.executeTransfer({
      sourceChain,
      destinationChain,
      amount,
      token,
      recipient,
      sender
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * @route GET /api/bridge/routes
 * @desc Get available routes for transfer
 */
router.get('/routes', async (req, res) => {
  try {
    const { sourceChain, destinationChain, amount, token } = req.query;

    if (!sourceChain || !destinationChain) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sourceChain, destinationChain'
      });
    }

    const route = await bridgeService.findOptimalRoute({
      sourceChain,
      destinationChain,
      amount: parseFloat(amount) || 1,
      token: token || 'ETH'
    });

    res.json({
      success: true,
      data: {
        route,
        algorithm: bridgeService.config.routingAlgorithm
      }
    });
  } catch (error) {
    logger.error('Error getting routes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/bridge/gas/prices
 * @desc Get current gas prices across all chains
 */
router.get('/gas/prices', async (req, res) => {
  try {
    const gasPrices = Object.fromEntries(bridgeService.gasOracle);
    
    res.json({
      success: true,
      data: {
        gasPrices,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error getting gas prices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/bridge/liquidity/:source/:destination
 * @desc Get liquidity pool status
 */
router.get('/liquidity/:source/:destination', async (req, res) => {
  try {
    const { source, destination } = req.params;
    
    const status = await bridgeService.getLiquidityStatus(source, destination);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting liquidity status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/bridge/transfer/:transferId/status
 * @desc Get transfer status
 */
router.get('/transfer/:transferId/status', async (req, res) => {
  try {
    const { transferId } = req.params;
    const transfer = bridgeService.activeTransfers.get(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      data: {
        status: transfer.status,
        steps: transfer.steps,
        error: transfer.error,
        startTime: transfer.startTime,
        duration: transfer.status === 'completed' ? Date.now() - transfer.startTime : null
      }
    });
  } catch (error) {
    logger.error('Error getting transfer status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
