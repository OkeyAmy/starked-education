/**
 * Smart Wallet Routes
 * API endpoints for smart contract wallet operations
 *
 * Validation gaps closed here resolve [Backend] issue #44:
 * every POST body and GET/POST route param now uses a strict Joi schema
 * (Ethereum address, hex data/signature, BigInt-safe value string,
 * structured arrays, ISO date) rather than the previous permissive
 * `Joi.string().required()` / `Joi.array().required()` placeholders.
 */

import express from 'express';
import Joi from 'joi';
import * as smartWalletController from '../controllers/smartWalletController';
import { authenticateToken } from '../middleware/auth';
import { validateRequestSchema, ValidationSchema } from '../middleware/validateRequestSchema';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ---------------------------------------------------------------------------
// Reusable Joi primitives for EVM-side fields. The smart-wallet stack in this
// repo is EVM-based (AccountAbstractionService / EntryPoint v0.6 / Sepolia),
// not Stellar, so we validate EOA / contract addresses by hex shape rather
// than the Stellar G… base32 alphabet used elsewhere.
// ---------------------------------------------------------------------------

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEX_DATA_REGEX = /^0x([a-fA-F0-9]{2})*$/; // EVM calldata, optional empty (0x)
const SIGNATURE_REGEX = /^0x[a-fA-F0-9]{130}$/; // 65-byte EIP-191 signature
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/; // 32-byte hash (recoveryId, txId)
const NUMERIC_STRING_REGEX = /^[0-9]+$/; // Safe BigInt() input

const ethAddress = Joi.string().pattern(ETH_ADDRESS_REGEX).required().messages({
  'string.pattern.base': '{{#label}} must be a 0x-prefixed 20-byte Ethereum address',
  'string.empty': '{{#label}} is required',
  'any.required': '{{#label}} is required',
});

const optionalEthAddress = Joi.string().pattern(ETH_ADDRESS_REGEX).optional().messages({
  'string.pattern.base': '{{#label}} must be a 0x-prefixed 20-byte Ethereum address',
});

const bigIntString = Joi.string().pattern(NUMERIC_STRING_REGEX).required().messages({
  'string.pattern.base': '{{#label}} must be a non-negative integer string (decoded as BigInt)',
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} is required',
});

const hexData = Joi.string().pattern(HEX_DATA_REGEX).required().messages({
  'string.pattern.base': '{{#label}} must be a 0x-prefixed even-length hex string',
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} is required',
});

const signature = Joi.string().pattern(SIGNATURE_REGEX).required().messages({
  'string.pattern.base': '{{#label}} must be a 0x-prefixed 65-byte hex signature',
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} is required',
});

const txHash = Joi.string().pattern(TX_HASH_REGEX).required().messages({
  'string.pattern.base': '{{#label}} must be a 0x-prefixed 32-byte hex hash',
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} is required',
});

const guardianObject = Joi.object({
  address: ethAddress,
  name: Joi.string().trim().min(1).max(100).optional(),
});

const transactionObject = Joi.object({
  to: ethAddress,
  value: bigIntString,
  data: hexData,
});

const permissionsObject = Joi.object({
  allowedContracts: Joi.array().items(ethAddress).max(50).default([]),
  allowedMethods: Joi.array()
    .items(Joi.string().trim().min(1).max(128))
    .max(50)
    .default([]),
  spendingLimit: bigIntString.default('0'),
}).unknown(false);

// ---------------------------------------------------------------------------
// Per-route schemas
// ---------------------------------------------------------------------------

const createWalletSchema: ValidationSchema = {
  body: Joi.object({
    ownerAddress: ethAddress.label('ownerAddress'),
    guardians: Joi.array().items(guardianObject).max(50).optional(),
    threshold: Joi.number().integer().min(1).max(50).optional(),
  }),
};

const executeTransactionSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    to: ethAddress.label('to'),
    value: bigIntString.label('value'),
    data: hexData.label('data'),
    signature: signature.label('signature'),
  }),
};

const executeBatchSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    transactions: Joi.array().items(transactionObject).min(1).max(100).required()
      .messages({
        'array.min': 'transactions must contain at least one transaction',
        'any.required': 'transactions is required',
      }),
    signature: signature.label('signature'),
  }),
};

const recoverySetupSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    guardians: Joi.array().items(guardianObject).min(1).max(50).required()
      .messages({ 'array.min': 'guardians must contain at least one guardian' }),
    threshold: Joi.number().integer().min(1).max(50).required()
      .messages({ 'number.max': 'threshold must not exceed 50' }),
  }),
};

const recoveryInitiateSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    newOwner: ethAddress.label('newOwner'),
    guardianAddress: ethAddress.label('guardianAddress'),
    guardianSignature: signature.label('guardianSignature'),
  }).custom((value, helpers) => {
    if (value.newOwner === value.guardianAddress) {
      return helpers.error('any.invalid', {
        message: 'newOwner must differ from guardianAddress',
      });
    }
    return value;
  }).messages({ 'any.invalid': '{{#message}}' }),
};

const recoverySupportSchema: ValidationSchema = {
  body: Joi.object({
    recoveryId: txHash.label('recoveryId'),
    guardianAddress: ethAddress.label('guardianAddress'),
    guardianSignature: signature.label('guardianSignature'),
  }),
};

const getRecoveryRequestSchema: ValidationSchema = {
  params: Joi.object({
    recoveryId: txHash.label('recoveryId'),
  }),
};

const multisigSetupSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    signers: Joi.array().items(ethAddress).min(2).max(20).unique().required()
      .messages({ 'array.min': 'signers must contain at least two addresses' }),
    threshold: Joi.number().integer().min(1).max(20).required(),
  }).custom((value, helpers) => {
    if (value.threshold > value.signers.length) {
      return helpers.error('any.invalid', {
        message: 'threshold must not exceed the number of signers',
      });
    }
    return value;
  }).messages({ 'any.invalid': '{{#message}}' }),
};

const multisigProposeSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    to: ethAddress.label('to'),
    value: bigIntString.label('value'),
    data: hexData.label('data'),
    proposer: ethAddress.label('proposer'),
  }),
};

const getPendingTransactionsSchema: ValidationSchema = {
  params: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
  }),
};

const sessionKeyCreateSchema: ValidationSchema = {
  body: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
    permissions: permissionsObject.required()
      .messages({ 'any.required': 'permissions is required' }),
    validUntil: Joi.date().iso().greater('now').required()
      .messages({
        'date.greater': 'validUntil must be in the future',
        'any.required': 'validUntil is required',
      }),
  }),
};

const getActiveSessionKeysSchema: ValidationSchema = {
  params: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
  }),
};

const walletActivitySchema: ValidationSchema = {
  params: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
  }),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(500).optional(),
  }),
};

const alertsSchema: ValidationSchema = {
  params: Joi.object({
    walletAddress: ethAddress.label('walletAddress'),
  }),
  query: Joi.object({
    acknowledged: Joi.string().valid('true', 'false').optional(),
  }),
};

const autoRenewalSchema: ValidationSchema = {
  body: Joi.object({
    credentialId: Joi.string().trim().min(1).max(128).required()
      .messages({ 'any.required': 'credentialId is required' }),
    renewalThreshold: Joi.number().integer().min(1).max(365 * 24 * 3600).required()
      .messages({
        'number.max': 'renewalThreshold must not exceed one year in seconds',
        'any.required': 'renewalThreshold is required',
      }),
  }),
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @route   POST /api/v1/smart-wallet/create
 * @desc    Create a new smart contract wallet
 * @access  Private
 */
router.post(
  '/create',
  validateRequestSchema(createWalletSchema),
  smartWalletController.createSmartWallet
);

/**
 * @route   POST /api/v1/smart-wallet/execute
 * @desc    Execute a transaction through smart wallet
 * @access  Private
 */
router.post(
  '/execute',
  validateRequestSchema(executeTransactionSchema),
  smartWalletController.executeTransaction
);

/**
 * @route   POST /api/v1/smart-wallet/execute-batch
 * @desc    Execute batch transactions
 * @access  Private
 */
router.post(
  '/execute-batch',
  validateRequestSchema(executeBatchSchema),
  smartWalletController.executeBatchTransactions
);

/**
 * @route   POST /api/v1/smart-wallet/recovery/setup
 * @desc    Setup social recovery
 * @access  Private
 */
router.post(
  '/recovery/setup',
  validateRequestSchema(recoverySetupSchema),
  smartWalletController.setupSocialRecovery
);

/**
 * @route   POST /api/v1/smart-wallet/recovery/initiate
 * @desc    Initiate recovery process
 * @access  Private
 */
router.post(
  '/recovery/initiate',
  validateRequestSchema(recoveryInitiateSchema),
  smartWalletController.initiateRecovery
);

/**
 * @route   POST /api/v1/smart-wallet/recovery/support
 * @desc    Support recovery request
 * @access  Private
 */
router.post(
  '/recovery/support',
  validateRequestSchema(recoverySupportSchema),
  smartWalletController.supportRecovery
);

/**
 * @route   GET /api/v1/smart-wallet/recovery/:recoveryId
 * @desc    Get recovery request details
 * @access  Private
 */
router.get(
  '/recovery/:recoveryId',
  validateRequestSchema(getRecoveryRequestSchema),
  smartWalletController.getRecoveryRequest
);

/**
 * @route   POST /api/v1/smart-wallet/multisig/setup
 * @desc    Setup multi-signature
 * @access  Private
 */
router.post(
  '/multisig/setup',
  validateRequestSchema(multisigSetupSchema),
  smartWalletController.setupMultiSig
);

/**
 * @route   POST /api/v1/smart-wallet/multisig/propose
 * @desc    Propose a multi-sig transaction
 * @access  Private
 */
router.post(
  '/multisig/propose',
  validateRequestSchema(multisigProposeSchema),
  smartWalletController.proposeTransaction
);

/**
 * @route   GET /api/v1/smart-wallet/multisig/pending/:walletAddress
 * @desc    Get pending multi-sig transactions
 * @access  Private
 */
router.get(
  '/multisig/pending/:walletAddress',
  validateRequestSchema(getPendingTransactionsSchema),
  smartWalletController.getPendingTransactions
);

/**
 * @route   POST /api/v1/smart-wallet/session-key/create
 * @desc    Create a session key
 * @access  Private
 */
router.post(
  '/session-key/create',
  validateRequestSchema(sessionKeyCreateSchema),
  smartWalletController.createSessionKey
);

/**
 * @route   GET /api/v1/smart-wallet/session-key/active/:walletAddress
 * @desc    Get active session keys
 * @access  Private
 */
router.get(
  '/session-key/active/:walletAddress',
  validateRequestSchema(getActiveSessionKeysSchema),
  smartWalletController.getActiveSessionKeys
);

/**
 * @route   GET /api/v1/smart-wallet/activity/:walletAddress
 * @desc    Get wallet activity
 * @access  Private
 */
router.get(
  '/activity/:walletAddress',
  validateRequestSchema(walletActivitySchema),
  smartWalletController.getWalletActivity
);

/**
 * @route   GET /api/v1/smart-wallet/alerts/:walletAddress
 * @desc    Get activity alerts
 * @access  Private
 */
router.get(
  '/alerts/:walletAddress',
  validateRequestSchema(alertsSchema),
  smartWalletController.getActivityAlerts
);

/**
 * @route   GET /api/v1/smart-wallet/credentials/stats
 * @desc    Get credential renewal statistics
 * @access  Private
 */
router.get(
  '/credentials/stats',
  smartWalletController.getCredentialRenewalStats
);

/**
 * @route   POST /api/v1/smart-wallet/credentials/auto-renewal
 * @desc    Enable auto-renewal for credential
 * @access  Private
 */
router.post(
  '/credentials/auto-renewal',
  validateRequestSchema(autoRenewalSchema),
  smartWalletController.enableAutoRenewal
);

export default router;
