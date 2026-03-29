/**
 * Payment Controller
 * Handles payment-related operations and business logic
 */

import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { StellarPaymentService } from '../services/StellarPaymentService';
import { NotificationService } from '../services/notificationService';
import { 
  Payment, 
  PaymentIntent, 
  PaymentMethod, 
  PaymentStatus,
  PaymentValidation,
  PaymentSettings
} from '../models/Payment';
import { UserRole } from '../models/User';

export class PaymentController {
  private paymentService: PaymentService;
  private stellarPaymentService: StellarPaymentService;
  private notificationService: any;

  constructor() {
    this.paymentService = new PaymentService();
    this.stellarPaymentService = new StellarPaymentService({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      distributionAccount: process.env.STELLAR_DISTRIBUTION_ACCOUNT || '',
      acceptedAssets: [],
      autoConfirmPayments: true,
      confirmationThreshold: 1
    });
    this.notificationService = new NotificationService();
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { enrollmentId, method, amount, currency, metadata } = req.body;
      const userId = req.user!.id;

      // Validate payment parameters
      const validation = this.paymentService.validatePaymentParameters(amount, currency, method);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment parameters',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      const paymentIntent = await this.paymentService.createPaymentIntent(enrollmentId, method, {
        userId,
        courseId: metadata?.courseId,
        amount,
        currency,
        metadata
      });

      res.status(201).json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create Stellar payment
   */
  async createStellarPayment(req: Request, res: Response) {
    try {
      const { enrollmentId, fromAddress, amount, assetCode, assetIssuer, memo } = req.body;
      const userId = req.user!.id;

      // Validate Stellar address
      const validation = this.stellarPaymentService.validatePaymentParameters(
        amount.toString(),
        assetCode || 'XLM',
        fromAddress
      );

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Stellar payment parameters',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      const paymentIntent = await this.paymentService.createStellarPaymentIntent(enrollmentId, {
        userId,
        fromAddress,
        amount,
        assetCode: assetCode || 'XLM',
        assetIssuer,
        memo,
        courseId: req.body.courseId
      });

      res.status(201).json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      console.error('Error creating Stellar payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Stellar payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Submit Stellar payment
   */
  async submitStellarPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId, signedTransactionXDR } = req.body;

      const transaction = await this.paymentService.processStellarPayment(
        paymentIntentId,
        signedTransactionXDR
      );

      // Send payment confirmation notification
      await this.notificationService.sendPaymentConfirmationNotification(
        transaction.userId,
        transaction
      );

      res.json({
        success: true,
        data: {
          transaction,
          message: 'Payment processed successfully'
        }
      });
    } catch (error) {
      console.error('Error submitting Stellar payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process Stellar payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const payment = await this.paymentService.getPaymentById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check if user has permission to view this payment
      if (payment.userId !== userId && userRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Error getting payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get enrollment payments
   */
  async getEnrollmentPayments(req: Request, res: Response) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // In production, verify user has permission to view enrollment payments
      const payments = await this.paymentService.getPaymentsForEnrollment(enrollmentId);

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Error getting enrollment payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enrollment payments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user payment history
   */
  async getUserPaymentHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '20', status } = req.query;

      const payments = await this.paymentService.getUserPaymentHistory(userId);

      // Filter by status if provided
      let filteredPayments = payments;
      if (status) {
        filteredPayments = payments.filter(p => p.status === status);
      }

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      res.json({
        success: true,
        data: filteredPayments.slice(startIndex, endIndex),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredPayments.length,
          pages: Math.ceil(filteredPayments.length / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting user payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process refund
   */
  async processRefund(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const refundTransaction = await this.paymentService.processRefund(id, amount, reason);

      // Send refund notification
      await this.notificationService.sendRefundNotification(
        refundTransaction.userId,
        refundTransaction
      );

      res.json({
        success: true,
        data: refundTransaction,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate receipt
   */
  async generateReceipt(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const payment = await this.paymentService.getPaymentById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check permissions
      if (payment.userId !== userId && userRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const receipt = await this.paymentService.generatePaymentReceipt(paymentId);

      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get payment settings
   */
  async getPaymentSettings(req: Request, res: Response) {
    try {
      const settings = this.paymentService.getPaymentSettings();

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting payment settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update payment settings
   */
  async updatePaymentSettings(req: Request, res: Response) {
    try {
      const updates = req.body;

      const updatedSettings = this.paymentService.updatePaymentSettings(updates);

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Payment settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating payment settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get supported payment methods
   */
  async getSupportedPaymentMethods(req: Request, res: Response) {
    try {
      const methods = this.paymentService.getSupportedPaymentMethods();

      res.json({
        success: true,
        data: methods
      });
    } catch (error) {
      console.error('Error getting supported payment methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve supported payment methods',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate payment parameters
   */
  async validatePaymentParameters(req: Request, res: Response) {
    try {
      const { amount, currency, method, fromAddress } = req.body;

      const validation = this.paymentService.validatePaymentParameters(
        amount,
        currency,
        method,
        fromAddress
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating payment parameters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate payment parameters',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const analytics = await this.paymentService.getPaymentAnalytics(dateRange);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(req: Request, res: Response) {
    try {
      const rates = await this.paymentService.getExchangeRates();

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve exchange rates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert currency
   */
  async convertCurrency(req: Request, res: Response) {
    try {
      const { amount, from, to } = req.body;

      const convertedAmount = await this.paymentService.convertCurrency(amount, from, to);

      res.json({
        success: true,
        data: {
          originalAmount: amount,
          from,
          to,
          convertedAmount,
          rate: convertedAmount / amount
        }
      });
    } catch (error) {
      console.error('Error converting currency:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to convert currency',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get Stellar balance
   */
  async getStellarBalance(req: Request, res: Response) {
    try {
      const { address } = req.params;

      const balance = await this.stellarPaymentService.getAccountBalance(address);

      res.json({
        success: true,
        data: balance
      });
    } catch (error) {
      console.error('Error getting Stellar balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve Stellar balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get Stellar transaction history
   */
  async getStellarTransactionHistory(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const { limit = '50', cursor } = req.query;

      const history = await this.stellarPaymentService.getPaymentHistory(
        address,
        parseInt(limit as string),
        cursor as string
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting Stellar transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve Stellar transaction history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle Stellar webhook
   */
  async handleStellarWebhook(req: Request, res: Response) {
    try {
      const { transaction, type } = req.body;

      // Process webhook based on type
      switch (type) {
        case 'payment':
          // Handle payment confirmation
          await this.processStellarWebhookPayment(transaction);
          break;
        case 'refund':
          // Handle refund confirmation
          await this.processStellarWebhookRefund(transaction);
          break;
        default:
          console.warn('Unknown webhook type:', type);
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Error processing Stellar webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle payment gateway webhook
   */
  async handlePaymentGatewayWebhook(req: Request, res: Response) {
    try {
      const { gateway, event, data } = req.body;

      // Process webhook based on gateway and event
      switch (gateway) {
        case 'stripe':
          await this.processStripeWebhook(event, data);
          break;
        case 'paypal':
          await this.processPayPalWebhook(event, data);
          break;
        default:
          console.warn('Unknown payment gateway:', gateway);
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Error processing payment gateway webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process Stellar webhook payment
   */
  private async processStellarWebhookPayment(transaction: any) {
    // Find payment intent by transaction hash
    // Update payment status
    // Send notifications
    console.log('Processing Stellar webhook payment:', transaction);
  }

  /**
   * Process Stellar webhook refund
   */
  private async processStellarWebhookRefund(transaction: any) {
    // Find refund by transaction hash
    // Update refund status
    // Send notifications
    console.log('Processing Stellar webhook refund:', transaction);
  }

  /**
   * Process Stripe webhook
   */
  private async processStripeWebhook(event: string, data: any) {
    // Handle Stripe webhook events
    console.log('Processing Stripe webhook:', event, data);
  }

  /**
   * Process PayPal webhook
   */
  private async processPayPalWebhook(event: string, data: any) {
    // Handle PayPal webhook events
    console.log('Processing PayPal webhook:', event, data);
  }
}
