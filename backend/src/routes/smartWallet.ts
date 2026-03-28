/**
 * Smart Wallet Routes
 * API endpoints for smart contract wallet operations
 */

import express from 'express';
import * as smartWalletController from '../controllers/smartWalletController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/smart-wallet/create
 * @desc    Create a new smart contract wallet
 * @access  Private
 */
router.post(
  '/create',
  validateRequest({
    body: {
      ownerAddress: { type: 'string', required: true },
      guardians: { type: 'array', required: false },
      threshold: { type: 'number', required: false },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      to: { type: 'string', required: true },
      value: { type: 'string', required: true },
      data: { type: 'string', required: true },
      signature: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      transactions: { type: 'array', required: true },
      signature: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      guardians: { type: 'array', required: true },
      threshold: { type: 'number', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      newOwner: { type: 'string', required: true },
      guardianAddress: { type: 'string', required: true },
      guardianSignature: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      recoveryId: { type: 'string', required: true },
      guardianAddress: { type: 'string', required: true },
      guardianSignature: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      signers: { type: 'array', required: true },
      threshold: { type: 'number', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      to: { type: 'string', required: true },
      value: { type: 'string', required: true },
      data: { type: 'string', required: true },
      proposer: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      walletAddress: { type: 'string', required: true },
      permissions: { type: 'object', required: true },
      validUntil: { type: 'string', required: true },
    },
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
  validateRequest({
    body: {
      credentialId: { type: 'string', required: true },
      renewalThreshold: { type: 'number', required: true },
    },
  }),
  smartWalletController.enableAutoRenewal
);

export default router;
