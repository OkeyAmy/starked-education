/**
 * Smart Wallet Routes
 * API endpoints for smart contract wallet operations
 */

import express from 'express';
import Joi from 'joi';
import * as smartWalletController from '../controllers/smartWalletController';
import { authenticateToken } from '../middleware/auth';
import { validateRequestSchema } from '../middleware/validateRequestSchema';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/smart-wallet/create
 * @desc    Create a new smart contract wallet
 * @access  Private
 */
router.post(
  '/create',
  validateRequestSchema({
    body: Joi.object({
      ownerAddress: Joi.string().required(),
      guardians: Joi.array().optional(),
      threshold: Joi.number().optional(),
    }),
  }),
  smartWalletController.createSmartWallet
);

/**
 * @route   POST /api/smart-wallet/execute
 * @desc    Execute a transaction through smart wallet
 * @access  Private
 */
router.post(
  '/execute',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      to: Joi.string().required(),
      value: Joi.string().required(),
      data: Joi.string().required(),
      signature: Joi.string().required(),
    }),
  }),
  smartWalletController.executeTransaction
);

/**
 * @route   POST /api/smart-wallet/execute-batch
 * @desc    Execute batch transactions
 * @access  Private
 */
router.post(
  '/execute-batch',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      transactions: Joi.array().required(),
      signature: Joi.string().required(),
    }),
  }),
  smartWalletController.executeBatchTransactions
);

/**
 * @route   POST /api/smart-wallet/recovery/setup
 * @desc    Setup social recovery
 * @access  Private
 */
router.post(
  '/recovery/setup',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      guardians: Joi.array().required(),
      threshold: Joi.number().required(),
    }),
  }),
  smartWalletController.setupSocialRecovery
);

/**
 * @route   POST /api/smart-wallet/recovery/initiate
 * @desc    Initiate recovery process
 * @access  Private
 */
router.post(
  '/recovery/initiate',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      newOwner: Joi.string().required(),
      guardianAddress: Joi.string().required(),
      guardianSignature: Joi.string().required(),
    }),
  }),
  smartWalletController.initiateRecovery
);

/**
 * @route   POST /api/smart-wallet/recovery/support
 * @desc    Support recovery request
 * @access  Private
 */
router.post(
  '/recovery/support',
  validateRequestSchema({
    body: Joi.object({
      recoveryId: Joi.string().required(),
      guardianAddress: Joi.string().required(),
      guardianSignature: Joi.string().required(),
    }),
  }),
  smartWalletController.supportRecovery
);

/**
 * @route   GET /api/smart-wallet/recovery/:recoveryId
 * @desc    Get recovery request details
 * @access  Private
 */
router.get(
  '/recovery/:recoveryId',
  smartWalletController.getRecoveryRequest
);

/**
 * @route   POST /api/smart-wallet/multisig/setup
 * @desc    Setup multi-signature
 * @access  Private
 */
router.post(
  '/multisig/setup',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      signers: Joi.array().required(),
      threshold: Joi.number().required(),
    }),
  }),
  smartWalletController.setupMultiSig
);

/**
 * @route   POST /api/smart-wallet/multisig/propose
 * @desc    Propose a multi-sig transaction
 * @access  Private
 */
router.post(
  '/multisig/propose',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      to: Joi.string().required(),
      value: Joi.string().required(),
      data: Joi.string().required(),
      proposer: Joi.string().required(),
    }),
  }),
  smartWalletController.proposeTransaction
);

/**
 * @route   GET /api/smart-wallet/multisig/pending/:walletAddress
 * @desc    Get pending multi-sig transactions
 * @access  Private
 */
router.get(
  '/multisig/pending/:walletAddress',
  smartWalletController.getPendingTransactions
);

/**
 * @route   POST /api/smart-wallet/session-key/create
 * @desc    Create a session key
 * @access  Private
 */
router.post(
  '/session-key/create',
  validateRequestSchema({
    body: Joi.object({
      walletAddress: Joi.string().required(),
      permissions: Joi.object().required(),
      validUntil: Joi.string().required(),
    }),
  }),
  smartWalletController.createSessionKey
);

/**
 * @route   GET /api/smart-wallet/session-key/active/:walletAddress
 * @desc    Get active session keys
 * @access  Private
 */
router.get(
  '/session-key/active/:walletAddress',
  smartWalletController.getActiveSessionKeys
);

/**
 * @route   GET /api/smart-wallet/activity/:walletAddress
 * @desc    Get wallet activity
 * @access  Private
 */
router.get(
  '/activity/:walletAddress',
  smartWalletController.getWalletActivity
);

/**
 * @route   GET /api/smart-wallet/alerts/:walletAddress
 * @desc    Get activity alerts
 * @access  Private
 */
router.get(
  '/alerts/:walletAddress',
  smartWalletController.getActivityAlerts
);

/**
 * @route   GET /api/smart-wallet/credentials/stats
 * @desc    Get credential renewal statistics
 * @access  Private
 */
router.get(
  '/credentials/stats',
  smartWalletController.getCredentialRenewalStats
);

/**
 * @route   POST /api/smart-wallet/credentials/auto-renewal
 * @desc    Enable auto-renewal for credential
 * @access  Private
 */
router.post(
  '/credentials/auto-renewal',
  validateRequestSchema({
    body: Joi.object({
      credentialId: Joi.string().required(),
      renewalThreshold: Joi.number().required(),
    }),
  }),
  smartWalletController.enableAutoRenewal
);

export default router;
