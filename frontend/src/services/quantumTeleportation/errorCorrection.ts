/**
 * Error Correction Service
 * Handles error detection, correction, and verification for quantum state transfers
 */

import type { ErrorCorrectionData } from '@/types/quantum';
import {
  calculateParityBits,
  verifyAndCorrectData,
  generateChecksum,
  verifyChecksum,
  createErrorCorrectionData,
  applyErrorCorrection,
  calculateErrorRate,
  isErrorRateAcceptable,
  generateQuantumSafeHash,
  verifyQuantumSafeHash
} from '@/utils/errorCorrection';

class ErrorCorrectionService {
  private messageHistory: Map<string, { sent: number, errors: number }> = new Map();
  private errorLog: Array<{ timestamp: number, messageId: string, error: string }> = [];

  /**
   * Create error correction data for a message
   */
  createErrorCorrectionData(messageId: string, payload: string): ErrorCorrectionData {
    return createErrorCorrectionData(messageId, payload);
  }

  /**
   * Verify and correct received data
   */
  verifyAndCorrect(
    payload: string,
    errorData: ErrorCorrectionData
  ): { success: boolean, correctedPayload?: string, hadError: boolean, errorPosition?: number } {
    try {
      // Check checksum
      if (!verifyChecksum(payload, errorData.checksumVerification)) {
        const { corrected, hadError } = applyErrorCorrection(payload, errorData);
        
        if (hadError) {
          this.logError(
            errorData.messageId,
            `Error detected and corrected at position during checksum verification`
          );
        }
        
        return {
          success: true,
          correctedPayload: corrected,
          hadError
        };
      }
      
      return {
        success: true,
        correctedPayload: payload,
        hadError: false
      };
    } catch (err) {
      this.logError(errorData.messageId, `Error correction failed: ${err}`);
      return {
        success: false,
        hadError: true
      };
    }
  }

  /**
   * Track message for error rate calculation
   */
  trackMessage(messageId: string, hadError: boolean = false): void {
    const current = this.messageHistory.get(messageId) || { sent: 0, errors: 0 };
    current.sent++;
    if (hadError) current.errors++;
    this.messageHistory.set(messageId, current);
  }

  /**
   * Get error rate for a specific connection or overall
   */
  getErrorRate(connectionId?: string): number {
    if (connectionId) {
      const stats = this.messageHistory.get(connectionId);
      if (!stats || stats.sent === 0) return 0;
      return calculateErrorRate(stats.sent, stats.errors);
    }

    // Calculate overall error rate
    let totalMessages = 0;
    let totalErrors = 0;

    for (const [, stats] of this.messageHistory) {
      totalMessages += stats.sent;
      totalErrors += stats.errors;
    }

    return calculateErrorRate(totalMessages, totalErrors);
  }

  /**
   * Check if error rate is within acceptable limits
   */
  isErrorRateAcceptable(connectionId?: string, maxRate: number = 0.0001): boolean {
    const errorRate = this.getErrorRate(connectionId);
    return isErrorRateAcceptable(errorRate, maxRate);
  }

  /**
   * Generate quantum-safe hash for state verification
   */
  generateQuantumHash(data: string): string {
    return generateQuantumSafeHash(data);
  }

  /**
   * Verify quantum-safe hash
   */
  verifyQuantumHash(data: string, hash: string): boolean {
    return verifyQuantumSafeHash(data, hash);
  }

  /**
   * Log error for monitoring
   */
  private logError(messageId: string, error: string): void {
    this.errorLog.push({
      timestamp: Date.now(),
      messageId,
      error
    });

    // Keep only last 1000 errors in memory
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100): Array<{ timestamp: number, messageId: string, error: string }> {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.messageHistory.clear();
    this.errorLog = [];
  }

  /**
   * Get overall statistics
   */
  getStatistics() {
    let totalMessages = 0;
    let totalErrors = 0;

    for (const [, stats] of this.messageHistory) {
      totalMessages += stats.sent;
      totalErrors += stats.errors;
    }

    return {
      totalMessages,
      totalErrors,
      errorRate: calculateErrorRate(totalMessages, totalErrors),
      isAcceptable: isErrorRateAcceptable(
        calculateErrorRate(totalMessages, totalErrors),
        0.0001
      ),
      errorLogsCount: this.errorLog.length
    };
  }
}

// Export singleton instance
export const errorCorrectionService = new ErrorCorrectionService();

export default ErrorCorrectionService;
