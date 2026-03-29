/**
 * Stellar Payment Service
 * Handles Stellar blockchain payment processing for course enrollments
 */

import { Server, Networks, TransactionBuilder, Operation, Asset, Keypair, Horizon, Transaction } from '@stellar/stellar-sdk';
import { StellarPayment, StellarAsset, StellarPaymentSettings, PaymentValidation } from '../models/Payment';
import { PaymentStatus, PaymentMethod } from '../models/Enrollment';

export class StellarPaymentService {
  private server: Server;
  private network: Networks.Network;
  private distributionKeypair: Keypair;
  private settings: StellarPaymentSettings;

  constructor(settings: StellarPaymentSettings) {
    this.settings = settings;
    this.server = new Server(settings.horizonUrl);
    this.network = settings.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
    this.distributionKeypair = Keypair.fromSecret(settings.distributionAccount);
  }

  /**
   * Create a payment transaction for course enrollment
   */
  async createPaymentTransaction(
    fromAddress: string,
    amount: string,
    assetCode: string,
    assetIssuer?: string,
    memo?: string
  ): Promise<{ transactionXDR: string; paymentId: string }> {
    try {
      const asset = assetCode === 'XLM' 
        ? Asset.native() 
        : new Asset(assetCode, assetIssuer!);

      // Load the source account
      const sourceAccount = await this.server.loadAccount(fromAddress);
      
      // Create transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: await this.server.fetchBaseFee(),
        networkPassphrase: this.network.passphrase
      })
        .addOperation(Operation.payment({
          destination: this.distributionKeypair.publicKey(),
          asset,
          amount
        }))
        .addMemo(memo ? Operation.memoText(memo) : Operation.memoNone())
        .setTimeout(30)
        .build();

      const paymentId = this.generatePaymentId();
      
      return {
        transactionXDR: transaction.toXDR(),
        paymentId
      };
    } catch (error) {
      console.error('Error creating Stellar payment transaction:', error);
      throw new Error(`Failed to create payment transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit a signed transaction to the Stellar network
   */
  async submitTransaction(signedXDR: string): Promise<StellarPayment> {
    try {
      const transaction = TransactionBuilder.fromXDR(signedXDR, this.network.passphrase) as any;
      const result = await this.server.submitTransaction(transaction);

      if (!result.successful) {
        throw new Error(`Transaction failed: ${result.resultXdr}`);
      }

      // Extract payment details from the transaction
      const payment = this.extractPaymentDetails(result);
      
      // Verify the payment
      const verification = await this.verifyPayment(payment);
      if (!verification.isValid) {
        throw new Error(`Payment verification failed: ${verification.errors.join(', ')}`);
      }

      return payment;
    } catch (error) {
      console.error('Error submitting Stellar transaction:', error);
      throw new Error(`Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a Stellar payment transaction
   */
  async verifyPayment(payment: StellarPayment): Promise<PaymentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if transaction exists
      const transaction = await this.server.transactions().transaction(payment.transactionHash).call();
      
      if (!transaction.successful) {
        errors.push('Transaction was not successful');
      }

      // Verify payment details
      const paymentOperation = transaction.operations.find(op => op.type === 'payment');
      if (!paymentOperation) {
        errors.push('No payment operation found in transaction');
      }

      if (paymentOperation) {
        const op = paymentOperation as Horizon.PaymentOperation;
        
        // Verify destination
        if (op.destination !== this.distributionKeypair.publicKey()) {
          errors.push('Payment destination does not match distribution account');
        }

        // Verify amount
        if (op.amount !== payment.amount) {
          errors.push('Payment amount does not match expected amount');
        }

        // Verify asset
        const expectedAsset = payment.assetCode === 'XLM' ? 'native' : `${payment.assetCode}:${payment.assetIssuer}`;
        const actualAsset = op.asset_type === 'native' ? 'native' : `${op.asset_code}:${op.asset_issuer}`;
        if (actualAsset !== expectedAsset) {
          errors.push('Payment asset does not match expected asset');
        }
      }

      // Check for sufficient confirmations
      const confirmations = await this.getTransactionConfirmations(payment.transactionHash);
      if (confirmations < this.settings.confirmationThreshold) {
        warnings.push(`Transaction has only ${confirmations} confirmations (threshold: ${this.settings.confirmationThreshold})`);
      }

    } catch (error) {
      errors.push(`Failed to verify payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get transaction confirmations
   */
  private async getTransactionConfirmations(transactionHash: string): Promise<number> {
    try {
      const transaction = await this.server.transactions().transaction(transactionHash).call();
      const latestLedger = await this.server.ledgers().limit(1).order('desc').call();
      
      if (latestLedger.records.length === 0) {
        return 0;
      }

      return latestLedger.records[0].sequence - transaction.ledger;
    } catch (error) {
      console.error('Error getting transaction confirmations:', error);
      return 0;
    }
  }

  /**
   * Extract payment details from transaction result
   */
  private extractPaymentDetails(result: Horizon.SubmitTransactionResponse): StellarPayment {
    const transaction = result.resultXdr as any;
    const paymentOp = transaction.tx().operations()[0];

    const asset = paymentOp.body().paymentOp().asset();
    let assetCode = 'XLM';
    let assetIssuer: string | undefined;

    if (asset.switch().name === 'alphaNum4' || asset.switch().name === 'alphaNum12') {
      const assetObj = asset.switch().name === 'alphaNum4' ? asset.alphaNum4() : asset.alphaNum12();
      assetCode = assetObj.assetCode().toString('utf8').replace(/\0/g, '');
      assetIssuer = assetObj.issuer().toString();
    }

    return {
      from: paymentOp.body().paymentOp().sourceAccount().ed25519().toString(),
      to: this.distributionKeypair.publicKey(),
      amount: paymentOp.body().paymentOp().amount().toString(),
      assetCode,
      assetIssuer,
      transactionHash: result.hash!,
      memo: transaction.memo().switch().name !== 'memoNone' ? transaction.memo().switch().value().toString('utf8') : undefined,
      horizonUrl: `${this.settings.horizonUrl}/transactions/${result.hash}`,
      network: this.settings.network
    };
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string): Promise<{ asset: string; balance: string; issuer?: string }[]> {
    try {
      const account = await this.server.loadAccount(address);
      return account.balances.map((balance: any) => ({
        asset: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
        balance: balance.balance,
        issuer: balance.asset_issuer
      }));
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw new Error(`Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if account exists and is funded
   */
  async checkAccountExists(address: string): Promise<boolean> {
    try {
      await this.server.loadAccount(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported assets
   */
  getSupportedAssets(): StellarAsset[] {
    return this.settings.acceptedAssets;
  }

  /**
   * Validate payment parameters
   */
  validatePaymentParameters(
    amount: string,
    assetCode: string,
    fromAddress: string
  ): PaymentValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Invalid payment amount');
    }

    // Validate asset
    const supportedAsset = this.settings.acceptedAssets.find(
      asset => asset.code === assetCode
    );
    if (!supportedAsset) {
      errors.push(`Asset ${assetCode} is not supported`);
    } else {
      if (amountNum < supportedAsset.minAmount) {
        errors.push(`Amount is below minimum of ${supportedAsset.minAmount} ${assetCode}`);
      }
      if (amountNum > supportedAsset.maxAmount) {
        errors.push(`Amount exceeds maximum of ${supportedAsset.maxAmount} ${assetCode}`);
      }
    }

    // Validate address format (basic check)
    if (!this.isValidStellarAddress(fromAddress)) {
      errors.push('Invalid Stellar address format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Stellar address format
   */
  private isValidStellarAddress(address: string): boolean {
    try {
      return Keypair.fromPublicKey(address).publicKey() === address;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique payment ID
   */
  private generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(transactionHash: string): Promise<Horizon.TransactionResponse | null> {
    try {
      return await this.server.transactions().transaction(transactionHash).call();
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Create refund transaction
   */
  async createRefundTransaction(
    toAddress: string,
    amount: string,
    assetCode: string,
    assetIssuer?: string,
    originalTransactionHash?: string,
    reason?: string
  ): Promise<{ transactionXDR: string; refundId: string }> {
    try {
      const asset = assetCode === 'XLM' 
        ? Asset.native() 
        : new Asset(assetCode, assetIssuer!);

      // Load the source account (distribution account)
      const sourceAccount = await this.server.loadAccount(this.distributionKeypair.publicKey());
      
      // Create refund memo
      let memoText = originalTransactionHash 
        ? `REFUND: ${originalTransactionHash.substring(0, 20)}` 
        : 'REFUND';
      if (reason) {
        memoText += ` - ${reason.substring(0, 50)}`;
      }

      // Create transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: await this.server.fetchBaseFee(),
        networkPassphrase: this.network.passphrase
      })
        .addOperation(Operation.payment({
          destination: toAddress,
          asset,
          amount
        }))
        .addMemo(Operation.memoText(memoText))
        .setTimeout(30)
        .build();

      const refundId = this.generatePaymentId();
      
      return {
        transactionXDR: transaction.toXDR(),
        refundId
      };
    } catch (error) {
      console.error('Error creating Stellar refund transaction:', error);
      throw new Error(`Failed to create refund transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment history for an account
   */
  async getPaymentHistory(
    address: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ payments: StellarPayment[]; cursor?: string }> {
    try {
      const paymentsBuilder = this.server
        .payments()
        .forAccount(address)
        .limit(limit)
        .order('desc');

      if (cursor) {
        paymentsBuilder.cursor(cursor);
      }

      const result = await paymentsBuilder.call();
      
      const payments = result.records
        .filter((record: any) => record.type === 'payment' && record.successful)
        .map((record: any) => this.mapPaymentRecord(record));

      return {
        payments,
        cursor: result.records.length > 0 ? result.records[result.records.length - 1].paging_token : undefined
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw new Error(`Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map payment record to StellarPayment interface
   */
  private mapPaymentRecord(record: Horizon.PaymentOperationResponse): StellarPayment {
    return {
      from: record.from,
      to: record.to,
      amount: record.amount,
      assetCode: record.asset_type === 'native' ? 'XLM' : record.asset_code,
      assetIssuer: record.asset_issuer,
      transactionHash: record.transaction_hash,
      memo: record.memo,
      horizonUrl: `${this.settings.horizonUrl}/transactions/${record.transaction_hash}`,
      network: this.settings.network
    };
  }
}
