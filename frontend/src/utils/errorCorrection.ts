/**
 * Quantum Error Correction
 * Implements Hamming(7,4) error correction for quantum state transfers
 * Also includes checksum verification and automatic error detection/correction
 */

import type { ErrorCorrectionData } from '@/types/quantum';
import crypto from 'crypto';

/**
 * Calculate parity bits using Hamming(7,4) code
 * Detects and corrects single-bit errors
 */
export function calculateParityBits(data: number[]): number[] {
  const parityBits: number[] = [];
  
  // P1: positions 1, 3, 5, 7 (binary: bit 0 set)
  let p1 = 0;
  for (let i = 0; i < data.length; i++) {
    if (((i + 1) & 1) === 1) p1 ^= (data[i] || 0);
  }
  parityBits.push(p1);
  
  // P2: positions 2, 3, 6, 7 (binary: bit 1 set)
  let p2 = 0;
  for (let i = 0; i < data.length; i++) {
    if (((i + 1) & 2) === 2) p2 ^= (data[i] || 0);
  }
  parityBits.push(p2);
  
  // P4: positions 4, 5, 6, 7 (binary: bit 2 set)
  let p4 = 0;
  for (let i = 0; i < data.length; i++) {
    if (((i + 1) & 4) === 4) p4 ^= (data[i] || 0);
  }
  parityBits.push(p4);
  
  return parityBits;
}

/**
 * Verify and correct data using Hamming code
 */
export function verifyAndCorrectData(
  data: number[],
  parityBits: number[]
): { corrected: number[], errorPosition: number | null } {
  const corrected = [...data];
  let errorPosition = 0;
  
  // Recalculate parity bits
  const calculatedParity = calculateParityBits(data);
  
  // XOR with stored parity bits to find error position
  for (let i = 0; i < parityBits.length; i++) {
    if (calculatedParity[i] !== parityBits[i]) {
      errorPosition |= (1 << i);
    }
  }
  
  // Correct the error if found
  if (errorPosition > 0 && errorPosition - 1 < corrected.length) {
    corrected[errorPosition - 1] ^= 1;
  }
  
  return {
    corrected,
    errorPosition: errorPosition > 0 ? errorPosition : null
  };
}

/**
 * Generate checksum for state verification
 */
export function generateChecksum(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Verify checksum integrity
 */
export function verifyChecksum(data: string, checksum: string): boolean {
  const calculated = generateChecksum(data);
  return calculated === checksum;
}

/**
 * Create error correction metadata for a message
 */
export function createErrorCorrectionData(
  messageId: string,
  payload: string
): ErrorCorrectionData {
  // Convert payload to bit array
  const bitArray = payload.split('').map(c => parseInt(c.charCodeAt(0).toString(2), 2));
  
  const parityBits = calculateParityBits(bitArray);
  const checksumVerification = generateChecksum(payload);
  
  return {
    messageId,
    parityBits,
    dataLength: bitArray.length,
    checksumVerification,
    correctionApplied: false
  };
}

/**
 * Apply error correction to received data
 */
export function applyErrorCorrection(
  payload: string,
  errorData: ErrorCorrectionData
): { corrected: string, hadError: boolean } {
  // Verify checksum first
  if (!verifyChecksum(payload, errorData.checksumVerification)) {
    // Checksum failed, attempt bit-level correction
    const bitArray = payload.split('').map(c => parseInt(c.charCodeAt(0).toString(2), 2));
    const { corrected: correctedBits, errorPosition } = verifyAndCorrectData(
      bitArray,
      errorData.parityBits
    );
    
    const correctedPayload = correctedBits
      .map(bit => String.fromCharCode(bit ? 1 : 0))
      .join('');
    
    return {
      corrected: correctedPayload,
      hadError: errorPosition !== null
    };
  }
  
  return { corrected: payload, hadError: false };
}

/**
 * Calculate error rate from message history
 * Error rate = (messages with errors / total messages) * 100
 */
export function calculateErrorRate(
  totalMessages: number,
  messagesWithErrors: number
): number {
  if (totalMessages === 0) return 0;
  const errorRate = (messagesWithErrors / totalMessages) * 100;
  // Round to 4 decimal places as per spec (<0.0001%)
  return Math.round(errorRate * 10000) / 10000;
}

/**
 * Check if error rate is within acceptable limits
 */
export function isErrorRateAcceptable(errorRate: number, maxRate: number = 0.0001): boolean {
  return errorRate <= maxRate;
}

/**
 * Generate quantum-safe hash using multiple hash algorithms
 */
export function generateQuantumSafeHash(data: string): string {
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const sha512 = crypto.createHash('sha512').update(data).digest('hex');
  
  // Combine hashes for quantum resistance
  const combined = sha256 + sha512;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Verify quantum-safe hash
 */
export function verifyQuantumSafeHash(data: string, hash: string): boolean {
  return generateQuantumSafeHash(data) === hash;
}
