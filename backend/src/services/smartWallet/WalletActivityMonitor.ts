/**
 * Wallet Activity Monitor
 * Monitors wallet activity and sends alerts for suspicious behavior
 */

import { ethers } from 'ethers';
import axios from 'axios';

export interface ActivityRule {
  id: string;
  type: 'spending_limit' | 'transaction_frequency' | 'unusual_contract' | 'large_transfer' | 'new_signer';
  threshold: number;
  timeWindow: number; // Seconds
  enabled: boolean;
}

export interface ActivityAlert {
  id: string;
  walletAddress: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
}

export interface WalletActivity {
  transactionHash: string;
  walletAddress: string;
  type: string;
  to: string;
  value: bigint;
  timestamp: Date;
  gasUsed: bigint;
}

export class WalletActivityMonitor {
  private provider: ethers.Provider;
  private monitoringInterval?: NodeJS.Timeout;
  private activityRules: Map<string, ActivityRule> = new Map();
  private activityHistory: Map<string, WalletActivity[]> = new Map();
  private alerts: ActivityAlert[] = [];

  constructor(config: {
    rpcUrl: string;
    checkInterval?: number;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.initializeDefaultRules();
  }

  /**
   * Initialize default monitoring rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ActivityRule[] = [
      {
        id: 'spending_limit_24h',
        type: 'spending_limit',
        threshold: Number(ethers.parseEther('10')), // 10 ETH in 24 hours
        timeWindow: 24 * 60 * 60,
        enabled: true,
      },
      {
        id: 'transaction_frequency',
        type: 'transaction_frequency',
        threshold: 20, // 20 transactions per hour
        timeWindow: 60 * 60,
        enabled: true,
      },
      {
        id: 'large_transfer',
        type: 'large_transfer',
        threshold: Number(ethers.parseEther('5')), // Single transfer > 5 ETH
        timeWindow: 0,
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => this.activityRules.set(rule.id, rule));
  }

  /**
   * Start monitoring wallet activity
   */
  startMonitoring(walletAddresses: string[], checkInterval: number = 60000): void {
    if (this.monitoringInterval) {
      console.log('Activity monitoring already running');
      return;
    }

    console.log(`🔍 Starting activity monitoring for ${walletAddresses.length} wallets...`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkWalletActivity(walletAddresses);
      } catch (error) {
        console.error('❌ Error during activity check:', error);
      }
    }, checkInterval);

    // Run initial check
    this.checkWalletActivity(walletAddresses).catch(console.error);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('Activity monitoring stopped');
    }
  }

  /**
   * Check wallet activity
   */
  async checkWalletActivity(walletAddresses: string[]): Promise<void> {
    for (const walletAddress of walletAddresses) {
      try {
        const recentActivity = await this.getRecentActivity(walletAddress);
        
        // Update activity history
        this.activityHistory.set(walletAddress, recentActivity);

        // Check against rules
        await this.evaluateRules(walletAddress, recentActivity);
      } catch (error) {
        console.error(`Failed to check activity for ${walletAddress}:`, error);
      }
    }
  }

  /**
   * Get recent wallet activity
   */
  async getRecentActivity(walletAddress: string, limit: number = 100): Promise<WalletActivity[]> {
    try {
      // Get recent transactions
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 1000; // Last ~1000 blocks

      const filter = {
        address: walletAddress,
        fromBlock,
        toBlock: 'latest',
      };

      const logs = await this.provider.getLogs(filter);
      
      const activities: WalletActivity[] = [];

      for (const log of logs) {
        const tx = await this.provider.getTransaction(log.transactionHash);
        if (!tx) continue;

        const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
        if (!receipt) continue;

        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) continue;

        activities.push({
          transactionHash: log.transactionHash,
          walletAddress,
          type: this.determineTransactionType(tx),
          to: tx.to || '',
          value: tx.value,
          timestamp: new Date(block.timestamp * 1000),
          gasUsed: receipt.gasUsed,
        });
      }

      return activities.slice(0, limit);
    } catch (error) {
      console.error(`Failed to get recent activity for ${walletAddress}:`, error);
      return [];
    }
  }

  /**
   * Determine transaction type
   */
  private determineTransactionType(tx: ethers.TransactionResponse): string {
    if (!tx.data || tx.data === '0x') {
      return 'transfer';
    }

    const methodId = tx.data.slice(0, 10);
    
    // Common method signatures
    const methodMap: { [key: string]: string } = {
      '0xa9059cbb': 'token_transfer',
      '0x23b872dd': 'token_transfer_from',
      '0x095ea7b3': 'token_approve',
      '0x40c10f19': 'token_mint',
      '0x42842e0e': 'nft_transfer',
      '0xb88d4fde': 'nft_safe_transfer',
    };

    return methodMap[methodId] || 'contract_interaction';
  }

  /**
   * Evaluate rules against activity
   */
  private async evaluateRules(
    walletAddress: string,
    activities: WalletActivity[]
  ): Promise<void> {
    for (const [ruleId, rule] of this.activityRules) {
      if (!rule.enabled) continue;

      try {
        const violation = await this.checkRule(walletAddress, activities, rule);
        
        if (violation) {
          await this.createAlert(walletAddress, rule, violation);
        }
      } catch (error) {
        console.error(`Failed to evaluate rule ${ruleId}:`, error);
      }
    }
  }

  /**
   * Check if activity violates a rule
   */
  private async checkRule(
    walletAddress: string,
    activities: WalletActivity[],
    rule: ActivityRule
  ): Promise<any | null> {
    const now = Date.now();
    const windowStart = new Date(now - rule.timeWindow * 1000);

    const recentActivities = activities.filter(
      activity => activity.timestamp >= windowStart
    );

    switch (rule.type) {
      case 'spending_limit':
        const totalSpent = recentActivities.reduce(
          (sum, activity) => sum + activity.value,
          0n
        );
        if (totalSpent > BigInt(rule.threshold)) {
          return {
            totalSpent: ethers.formatEther(totalSpent),
            threshold: ethers.formatEther(rule.threshold),
            transactionCount: recentActivities.length,
          };
        }
        break;

      case 'transaction_frequency':
        if (recentActivities.length > rule.threshold) {
          return {
            transactionCount: recentActivities.length,
            threshold: rule.threshold,
            timeWindow: rule.timeWindow / 60,
          };
        }
        break;

      case 'large_transfer':
        const largeTransfers = recentActivities.filter(
          activity => activity.value > BigInt(rule.threshold)
        );
        if (largeTransfers.length > 0) {
          return {
            transfers: largeTransfers.map(t => ({
              hash: t.transactionHash,
              value: ethers.formatEther(t.value),
              to: t.to,
            })),
          };
        }
        break;

      case 'unusual_contract':
        // Check for interactions with unknown contracts
        const contractInteractions = recentActivities.filter(
          activity => activity.type === 'contract_interaction'
        );
        // This would need a whitelist of known contracts
        break;
    }

    return null;
  }

  /**
   * Create alert for rule violation
   */
  private async createAlert(
    walletAddress: string,
    rule: ActivityRule,
    violation: any
  ): Promise<void> {
    const alert: ActivityAlert = {
      id: ethers.hexlify(ethers.randomBytes(16)),
      walletAddress,
      ruleId: rule.id,
      severity: this.determineSeverity(rule.type),
      message: this.generateAlertMessage(rule, violation),
      details: violation,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    
    console.log(`🚨 Alert created: ${alert.message}`);
    
    // Send notification
    await this.sendAlertNotification(alert);
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(ruleType: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
      'spending_limit': 'high',
      'transaction_frequency': 'medium',
      'unusual_contract': 'high',
      'large_transfer': 'high',
      'new_signer': 'critical',
    };

    return severityMap[ruleType] || 'medium';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: ActivityRule, violation: any): string {
    switch (rule.type) {
      case 'spending_limit':
        return `Spending limit exceeded: ${violation.totalSpent} ETH spent (limit: ${violation.threshold} ETH)`;
      case 'transaction_frequency':
        return `High transaction frequency: ${violation.transactionCount} transactions in ${violation.timeWindow} minutes`;
      case 'large_transfer':
        return `Large transfer detected: ${violation.transfers.length} transfer(s) above threshold`;
      default:
        return `Rule violation detected: ${rule.id}`;
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: ActivityAlert): Promise<void> {
    try {
      if (process.env.NOTIFICATION_SERVICE_URL) {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send`, {
          type: 'wallet_activity_alert',
          recipient: alert.walletAddress,
          data: {
            alertId: alert.id,
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            timestamp: alert.timestamp.toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Get alerts for wallet
   */
  getAlerts(walletAddress: string, acknowledged?: boolean): ActivityAlert[] {
    let alerts = this.alerts.filter(alert => alert.walletAddress === walletAddress);
    
    if (acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      return true;
    }

    return false;
  }

  /**
   * Add custom rule
   */
  addRule(rule: ActivityRule): void {
    this.activityRules.set(rule.id, rule);
    console.log(`Added monitoring rule: ${rule.id}`);
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string): boolean {
    return this.activityRules.delete(ruleId);
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<ActivityRule>): boolean {
    const rule = this.activityRules.get(ruleId);
    
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }

    return false;
  }

  /**
   * Get all rules
   */
  getRules(): ActivityRule[] {
    return Array.from(this.activityRules.values());
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(walletAddress: string): Promise<{
    totalTransactions: number;
    totalValue: string;
    averageGasUsed: string;
    mostFrequentType: string;
    lastActivity: Date | null;
  }> {
    const activities = this.activityHistory.get(walletAddress) || [];

    if (activities.length === 0) {
      return {
        totalTransactions: 0,
        totalValue: '0',
        averageGasUsed: '0',
        mostFrequentType: 'none',
        lastActivity: null,
      };
    }

    const totalValue = activities.reduce((sum, a) => sum + a.value, 0n);
    const totalGas = activities.reduce((sum, a) => sum + a.gasUsed, 0n);
    
    const typeCount = new Map<string, number>();
    activities.forEach(a => {
      typeCount.set(a.type, (typeCount.get(a.type) || 0) + 1);
    });

    const mostFrequentType = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    return {
      totalTransactions: activities.length,
      totalValue: ethers.formatEther(totalValue),
      averageGasUsed: ethers.formatUnits(totalGas / BigInt(activities.length), 'gwei'),
      mostFrequentType,
      lastActivity: activities[0]?.timestamp || null,
    };
  }
}
