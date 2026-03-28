/**
 * Credential Automation Service
 * Handles automated credential renewal and management
 */

import { ethers } from 'ethers';
import axios from 'axios';

export interface CredentialInfo {
  credentialId: string;
  walletAddress: string;
  issuer: string;
  type: string;
  expiresAt: Date;
  autoRenewal: boolean;
  renewalThreshold: number; // Days before expiry to trigger renewal
}

export interface RenewalConfig {
  enabled: boolean;
  checkInterval: number; // Milliseconds
  warningThreshold: number; // Seconds before expiry
  batchSize: number;
}

export class CredentialAutomationService {
  private provider: ethers.Provider;
  private credentialRegistryAddress: string;
  private renewalConfig: RenewalConfig;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: {
    rpcUrl: string;
    credentialRegistryAddress: string;
    renewalConfig: RenewalConfig;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.credentialRegistryAddress = config.credentialRegistryAddress;
    this.renewalConfig = config.renewalConfig;
  }

  /**
   * Start automated credential monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('Credential monitoring already running');
      return;
    }

    console.log('🔔 Starting credential expiration monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkExpiringCredentials();
      } catch (error) {
        console.error('❌ Error during credential check:', error);
      }
    }, this.renewalConfig.checkInterval);

    // Run initial check
    this.checkExpiringCredentials().catch(console.error);
  }

  /**
   * Stop automated credential monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('Credential monitoring stopped');
    }
  }

  /**
   * Check for expiring credentials
   */
  async checkExpiringCredentials(): Promise<void> {
    try {
      console.log('🔍 Checking for expiring credentials...');
      
      const expiringCredentials = await this.getExpiringCredentials(
        this.renewalConfig.warningThreshold
      );

      if (expiringCredentials.length > 0) {
        console.log(`⏰ Found ${expiringCredentials.length} credentials expiring soon`);
        
        // Process in batches
        for (let i = 0; i < expiringCredentials.length; i += this.renewalConfig.batchSize) {
          const batch = expiringCredentials.slice(i, i + this.renewalConfig.batchSize);
          await this.processBatch(batch);
        }
      }

      // Check for expired credentials
      const expiredCredentials = await this.getExpiredCredentials();
      if (expiredCredentials.length > 0) {
        console.log(`⚠️ Found ${expiredCredentials.length} expired credentials`);
        await this.handleExpiredCredentials(expiredCredentials);
      }

    } catch (error) {
      console.error('Failed to check expiring credentials:', error);
      throw error;
    }
  }

  /**
   * Get credentials expiring within threshold
   */
  async getExpiringCredentials(withinSeconds: number): Promise<CredentialInfo[]> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function getExpiringCredentials(uint256 withinSeconds) view returns (bytes32[])',
        ],
        this.provider
      );

      const credentialIds = await credentialRegistry.getExpiringCredentials(withinSeconds);
      
      const credentials = await Promise.all(
        credentialIds.map((id: string) => this.getCredentialInfo(id))
      );

      return credentials.filter((cred): cred is CredentialInfo => cred !== null);
    } catch (error) {
      console.error('Failed to get expiring credentials:', error);
      return [];
    }
  }

  /**
   * Get expired credentials
   */
  async getExpiredCredentials(): Promise<CredentialInfo[]> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function getExpiredCredentials() view returns (bytes32[])',
        ],
        this.provider
      );

      const credentialIds = await credentialRegistry.getExpiredCredentials();
      
      const credentials = await Promise.all(
        credentialIds.map((id: string) => this.getCredentialInfo(id))
      );

      return credentials.filter((cred): cred is CredentialInfo => cred !== null);
    } catch (error) {
      console.error('Failed to get expired credentials:', error);
      return [];
    }
  }

  /**
   * Get credential information
   */
  async getCredentialInfo(credentialId: string): Promise<CredentialInfo | null> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function getCredential(bytes32 credentialId) view returns (address wallet, address issuer, string credType, uint256 expiresAt, bool autoRenewal, uint256 renewalThreshold)',
        ],
        this.provider
      );

      const result = await credentialRegistry.getCredential(credentialId);

      return {
        credentialId,
        walletAddress: result.wallet,
        issuer: result.issuer,
        type: result.credType,
        expiresAt: new Date(Number(result.expiresAt) * 1000),
        autoRenewal: result.autoRenewal,
        renewalThreshold: Number(result.renewalThreshold),
      };
    } catch (error) {
      console.error(`Failed to get credential info for ${credentialId}:`, error);
      return null;
    }
  }

  /**
   * Process batch of expiring credentials
   */
  private async processBatch(credentials: CredentialInfo[]): Promise<void> {
    await Promise.all(
      credentials.map(async (credential) => {
        try {
          if (credential.autoRenewal) {
            await this.renewCredential(credential);
          } else {
            await this.sendExpirationWarning(credential);
          }
        } catch (error) {
          console.error(`Failed to process credential ${credential.credentialId}:`, error);
        }
      })
    );
  }

  /**
   * Renew a credential
   */
  async renewCredential(credential: CredentialInfo): Promise<string> {
    try {
      console.log(`🔄 Renewing credential ${credential.credentialId}`);
      
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function renewCredential(bytes32 credentialId, uint256 extensionPeriod)',
        ],
        this.provider
      );

      // Default extension: 30 days
      const extensionPeriod = 30 * 24 * 60 * 60;

      const callData = credentialRegistry.interface.encodeFunctionData(
        'renewCredential',
        [credential.credentialId, extensionPeriod]
      );

      // Send renewal notification
      await this.sendRenewalNotification(credential, extensionPeriod);

      console.log(`✅ Credential ${credential.credentialId} renewed successfully`);
      
      return callData;
    } catch (error) {
      console.error(`Failed to renew credential ${credential.credentialId}:`, error);
      throw error;
    }
  }

  /**
   * Send expiration warning
   */
  private async sendExpirationWarning(credential: CredentialInfo): Promise<void> {
    try {
      console.log(`📧 Sending expiration warning for credential ${credential.credentialId}`);
      
      const daysUntilExpiry = Math.ceil(
        (credential.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (process.env.NOTIFICATION_SERVICE_URL) {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send`, {
          type: 'credential_expiration_warning',
          recipient: credential.walletAddress,
          data: {
            credentialId: credential.credentialId,
            type: credential.type,
            expiresAt: credential.expiresAt.toISOString(),
            daysUntilExpiry,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send expiration warning:', error);
    }
  }

  /**
   * Send renewal notification
   */
  private async sendRenewalNotification(
    credential: CredentialInfo,
    extensionPeriod: number
  ): Promise<void> {
    try {
      if (process.env.NOTIFICATION_SERVICE_URL) {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send`, {
          type: 'credential_renewed',
          recipient: credential.walletAddress,
          data: {
            credentialId: credential.credentialId,
            type: credential.type,
            extensionDays: Math.floor(extensionPeriod / (24 * 60 * 60)),
            newExpiryDate: new Date(
              credential.expiresAt.getTime() + extensionPeriod * 1000
            ).toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to send renewal notification:', error);
    }
  }

  /**
   * Handle expired credentials
   */
  private async handleExpiredCredentials(credentials: CredentialInfo[]): Promise<void> {
    await Promise.all(
      credentials.map(async (credential) => {
        try {
          await this.sendExpiredNotification(credential);
          await this.markCredentialExpired(credential.credentialId);
        } catch (error) {
          console.error(`Failed to handle expired credential ${credential.credentialId}:`, error);
        }
      })
    );
  }

  /**
   * Send expired notification
   */
  private async sendExpiredNotification(credential: CredentialInfo): Promise<void> {
    try {
      console.log(`📧 Sending expired notification for credential ${credential.credentialId}`);
      
      if (process.env.NOTIFICATION_SERVICE_URL) {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send`, {
          type: 'credential_expired',
          recipient: credential.walletAddress,
          data: {
            credentialId: credential.credentialId,
            type: credential.type,
            expiredAt: credential.expiresAt.toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to send expired notification:', error);
    }
  }

  /**
   * Mark credential as expired
   */
  private async markCredentialExpired(credentialId: string): Promise<void> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function markExpired(bytes32 credentialId)',
        ],
        this.provider
      );

      const callData = credentialRegistry.interface.encodeFunctionData(
        'markExpired',
        [credentialId]
      );

      console.log(`Marked credential ${credentialId} as expired`);
    } catch (error) {
      console.error(`Failed to mark credential ${credentialId} as expired:`, error);
    }
  }

  /**
   * Enable auto-renewal for credential
   */
  async enableAutoRenewal(
    credentialId: string,
    renewalThreshold: number
  ): Promise<string> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function enableAutoRenewal(bytes32 credentialId, uint256 renewalThreshold)',
        ],
        this.provider
      );

      const callData = credentialRegistry.interface.encodeFunctionData(
        'enableAutoRenewal',
        [credentialId, renewalThreshold]
      );

      return callData;
    } catch (error) {
      console.error('Failed to enable auto-renewal:', error);
      throw error;
    }
  }

  /**
   * Disable auto-renewal for credential
   */
  async disableAutoRenewal(credentialId: string): Promise<string> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function disableAutoRenewal(bytes32 credentialId)',
        ],
        this.provider
      );

      const callData = credentialRegistry.interface.encodeFunctionData(
        'disableAutoRenewal',
        [credentialId]
      );

      return callData;
    } catch (error) {
      console.error('Failed to disable auto-renewal:', error);
      throw error;
    }
  }

  /**
   * Get renewal statistics
   */
  async getRenewalStats(): Promise<{
    totalCredentials: number;
    autoRenewalEnabled: number;
    expiringWithin7Days: number;
    expiringWithin30Days: number;
    expired: number;
  }> {
    try {
      const credentialRegistry = new ethers.Contract(
        this.credentialRegistryAddress,
        [
          'function getRenewalStats() view returns (uint256 total, uint256 autoRenewal, uint256 expiring7d, uint256 expiring30d, uint256 expired)',
        ],
        this.provider
      );

      const result = await credentialRegistry.getRenewalStats();

      return {
        totalCredentials: Number(result.total),
        autoRenewalEnabled: Number(result.autoRenewal),
        expiringWithin7Days: Number(result.expiring7d),
        expiringWithin30Days: Number(result.expiring30d),
        expired: Number(result.expired),
      };
    } catch (error) {
      console.error('Failed to get renewal stats:', error);
      throw error;
    }
  }
}
