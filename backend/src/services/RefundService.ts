/**
 * Refund Service
 * Handles refund requests, processing, and policies
 */

import { 
  Enrollment, 
  EnrollmentStatus, 
  RefundRequest,
  PaymentStatus,
  PaymentMethod
} from '../models/Enrollment';
import { PaymentService } from './PaymentService';
import { EnrollmentService } from './EnrollmentService';
import { NotificationService } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

export interface RefundPolicy {
  id: string;
  name: string;
  description: string;
  conditions: RefundCondition[];
  refundCalculation: RefundCalculationRule;
  autoApprove: boolean;
  requiresAdminApproval: boolean;
  maxRefundWindow: number; // days from enrollment
  applicableCourses?: string[]; // empty means all courses
  applicablePaymentMethods?: PaymentMethod[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundCondition {
  type: 'time_based' | 'progress_based' | 'completion_based' | 'custom';
  description: string;
  condition: (enrollment: Enrollment, context?: any) => boolean;
  refundPercentage: number;
}

export interface RefundCalculationRule {
  type: 'percentage' | 'fixed' | 'tiered' | 'pro_rata';
  baseAmount?: number;
  percentage?: number;
  tiers?: RefundTier[];
  deductibles?: RefundDeductible[];
}

export interface RefundTier {
  minDays: number;
  maxDays: number;
  refundPercentage: number;
  description: string;
}

export interface RefundDeductible {
  type: 'fixed' | 'percentage';
  amount: number;
  description: string;
  required: boolean;
}

export interface RefundRequestDetails {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  originalAmount: number;
  requestedAmount: number;
  calculatedRefundAmount: number;
  reason: string;
  category: 'change_of_mind' | 'technical_issues' | 'course_quality' | 'personal_reasons' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  policyApplied: string;
  calculationDetails: {
    baseRefund: number;
    deductibles: Array<{ type: string; amount: number; description: string }>;
    finalAmount: number;
  };
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  adminNotes?: string;
  processedAt?: Date;
  refundTransactionId?: string;
  estimatedProcessingTime?: number; // days
  metadata?: Record<string, any>;
}

export interface RefundAnalytics {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  processedRequests: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  averageProcessingTime: number; // days
  refundByCategory: { category: string; count: number; amount: number }[];
  refundByReason: { reason: string; count: number; amount: number }[];
  refundByMonth: { month: string; count: number; amount: number }[];
  commonRejectionReasons: { reason: string; count: number }[];
}

export class RefundService {
  private paymentService: PaymentService;
  private enrollmentService: EnrollmentService;
  private notificationService: any;
  private refundPolicies: Map<string, RefundPolicy> = new Map();
  private refundRequests: Map<string, RefundRequestDetails> = new Map();

  constructor() {
    this.paymentService = new PaymentService();
    this.enrollmentService = new EnrollmentService();
    this.notificationService = new NotificationService();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default refund policies
   */
  private initializeDefaultPolicies() {
    const standardPolicy: RefundPolicy = {
      id: 'standard_30_day',
      name: '30-Day Standard Refund Policy',
      description: 'Full refund within 30 days, partial refund up to 60 days',
      conditions: [
        {
          type: 'time_based',
          description: 'Within 30 days of enrollment',
          condition: (enrollment) => {
            const daysSinceEnrollment = Math.floor(
              (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceEnrollment <= 30;
          },
          refundPercentage: 100
        },
        {
          type: 'time_based',
          description: '31-60 days after enrollment',
          condition: (enrollment) => {
            const daysSinceEnrollment = Math.floor(
              (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceEnrollment > 30 && daysSinceEnrollment <= 60;
          },
          refundPercentage: 50
        }
      ],
      refundCalculation: {
        type: 'tiered',
        tiers: [
          {
            minDays: 0,
            maxDays: 30,
            refundPercentage: 100,
            description: 'Full refund'
          },
          {
            minDays: 31,
            maxDays: 60,
            refundPercentage: 50,
            description: '50% refund'
          }
        ],
        deductibles: [
          {
            type: 'fixed',
            amount: 5,
            description: 'Processing fee',
            required: true
          }
        ]
      },
      autoApprove: true,
      requiresAdminApproval: false,
      maxRefundWindow: 60,
      applicablePaymentMethods: [PaymentMethod.STELLAR, PaymentMethod.CREDIT_CARD],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const strictPolicy: RefundPolicy = {
      id: 'strict_14_day',
      name: '14-Day Strict Refund Policy',
      description: 'Full refund within 14 days only',
      conditions: [
        {
          type: 'time_based',
          description: 'Within 14 days of enrollment',
          condition: (enrollment) => {
            const daysSinceEnrollment = Math.floor(
              (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceEnrollment <= 14;
          },
          refundPercentage: 100
        }
      ],
      refundCalculation: {
        type: 'percentage',
        percentage: 100,
        deductibles: [
          {
            type: 'percentage',
            amount: 10,
            description: 'Restocking fee',
            required: true
          }
        ]
      },
      autoApprove: false,
      requiresAdminApproval: true,
      maxRefundWindow: 14,
      applicablePaymentMethods: [PaymentMethod.STELLAR],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.refundPolicies.set('standard_30_day', standardPolicy);
    this.refundPolicies.set('strict_14_day', strictPolicy);
  }

  /**
   * Create refund request
   */
  async createRefundRequest(
    enrollmentId: string,
    userId: string,
    reason: string,
    category: string,
    requestedAmount?: number
  ): Promise<{
    success: boolean;
    refundRequest?: RefundRequestDetails;
    message?: string;
    errors?: string[];
  }> {
    try {
      // Get enrollment details
      const enrollment = await this.enrollmentService.getEnrollmentById(enrollmentId);
      if (!enrollment) {
        return {
          success: false,
          message: 'Enrollment not found'
        };
      }

      // Verify ownership
      if (enrollment.userId !== userId) {
        return {
          success: false,
          message: 'Access denied'
        };
      }

      // Check if refund request already exists
      const existingRequest = Array.from(this.refundRequests.values())
        .find(req => req.enrollmentId === enrollmentId && req.status !== 'cancelled' && req.status !== 'rejected');
      
      if (existingRequest) {
        return {
          success: false,
          message: 'Refund request already exists for this enrollment'
        };
      }

      // Check if refund is allowed based on enrollment status
      if (enrollment.status === EnrollmentStatus.COMPLETED) {
        return {
          success: false,
          message: 'Refunds are not available for completed enrollments'
        };
      }

      if (enrollment.status === EnrollmentStatus.REFUNDED) {
        return {
          success: false,
          message: 'Enrollment has already been refunded'
        };
      }

      // Check if payment was completed
      if (enrollment.paymentStatus !== PaymentStatus.COMPLETED || enrollment.amountPaid === 0) {
        return {
          success: false,
          message: 'No payment found for this enrollment'
        };
      }

      // Find applicable refund policy
      const applicablePolicy = await this.findApplicablePolicy(enrollment);
      if (!applicablePolicy) {
        return {
          success: false,
          message: 'No refund policy applies to this enrollment'
        };
      }

      // Calculate refund amount
      const refundCalculation = await this.calculateRefundAmount(
        enrollment,
        applicablePolicy,
        requestedAmount
      );

      if (refundCalculation.finalAmount <= 0) {
        return {
          success: false,
          message: 'Refund amount is zero or negative'
        };
      }

      // Create refund request
      const refundRequest: RefundRequestDetails = {
        id: uuidv4(),
        enrollmentId,
        userId,
        courseId: enrollment.courseId,
        originalAmount: enrollment.amountPaid,
        requestedAmount: requestedAmount || enrollment.amountPaid,
        calculatedRefundAmount: refundCalculation.finalAmount,
        reason,
        category: category as any,
        status: 'pending',
        policyApplied: applicablePolicy.id,
        calculationDetails: refundCalculation,
        requestedAt: new Date(),
        estimatedProcessingTime: applicablePolicy.requiresAdminApproval ? 7 : 3
      };

      this.refundRequests.set(refundRequest.id, refundRequest);

      // Auto-approve if policy allows
      if (applicablePolicy.autoApprove) {
        await this.approveRefundRequest(refundRequest.id, 'system', 'Auto-approved by policy');
      }

      // Send notification
      await this.notificationService.sendRefundRequestConfirmationNotification(
        userId,
        refundRequest
      );

      return {
        success: true,
        refundRequest
      };
    } catch (error) {
      console.error('Error creating refund request:', error);
      return {
        success: false,
        message: 'Failed to create refund request',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Find applicable refund policy
   */
  private async findApplicablePolicy(enrollment: Enrollment): Promise<RefundPolicy | null> {
    const applicablePolicies = Array.from(this.refundPolicies.values())
      .filter(policy => 
        policy.isActive &&
        (!policy.applicableCourses || policy.applicableCourses.includes(enrollment.courseId)) &&
        (!policy.applicablePaymentMethods || policy.applicablePaymentMethods.includes(enrollment.paymentMethod))
      );

    // Check each policy's conditions
    for (const policy of applicablePolicies) {
      for (const condition of policy.conditions) {
        if (condition.condition(enrollment)) {
          return policy;
        }
      }
    }

    return null;
  }

  /**
   * Calculate refund amount
   */
  private async calculateRefundAmount(
    enrollment: Enrollment,
    policy: RefundPolicy,
    requestedAmount?: number
  ): Promise<{
    baseRefund: number;
    deductibles: Array<{ type: string; amount: number; description: string }>;
    finalAmount: number;
  }> {
    const originalAmount = enrollment.amountPaid;
    let baseRefund = originalAmount;
    const deductibles: Array<{ type: string; amount: number; description: string }> = [];

    // Apply refund calculation rule
    switch (policy.refundCalculation.type) {
      case 'percentage':
        baseRefund = originalAmount * (policy.refundCalculation.percentage! / 100);
        break;

      case 'fixed':
        baseRefund = Math.min(originalAmount, policy.refundCalculation.baseAmount!);
        break;

      case 'tiered':
        const daysSinceEnrollment = Math.floor(
          (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const applicableTier = policy.refundCalculation.tiers?.find(
          tier => daysSinceEnrollment >= tier.minDays && daysSinceEnrollment <= tier.maxDays
        );
        
        if (applicableTier) {
          baseRefund = originalAmount * (applicableTier.refundPercentage / 100);
        } else {
          baseRefund = 0; // No refund if outside all tiers
        }
        break;

      case 'pro_rata':
        // Calculate based on course progress
        const progressPenalty = (enrollment.progress / 100) * originalAmount * 0.5;
        baseRefund = originalAmount - progressPenalty;
        break;
    }

    // Apply deductibles
    if (policy.refundCalculation.deductibles) {
      for (const deductible of policy.refundCalculation.deductibles) {
        let deductibleAmount = 0;
        
        if (deductible.type === 'fixed') {
          deductibleAmount = deductible.amount;
        } else if (deductible.type === 'percentage') {
          deductibleAmount = baseRefund * (deductible.amount / 100);
        }

        if (deductible.required || deductibleAmount <= baseRefund) {
          deductibles.push({
            type: deductible.type,
            amount: deductibleAmount,
            description: deductible.description
          });
          baseRefund -= deductibleAmount;
        }
      }
    }

    // Apply requested amount limit
    if (requestedAmount && requestedAmount < baseRefund) {
      baseRefund = requestedAmount;
    }

    // Ensure non-negative
    baseRefund = Math.max(0, baseRefund);

    return {
      baseRefund: originalAmount - deductibles.reduce((sum, d) => sum + d.amount, 0),
      deductibles,
      finalAmount: baseRefund
    };
  }

  /**
   * Approve refund request
   */
  async approveRefundRequest(
    refundRequestId: string,
    reviewedBy: string,
    adminNotes?: string
  ): Promise<RefundRequestDetails> {
    const refundRequest = this.refundRequests.get(refundRequestId);
    if (!refundRequest) {
      throw new Error('Refund request not found');
    }

    if (refundRequest.status !== 'pending') {
      throw new Error('Refund request is not in pending status');
    }

    // Update request status
    refundRequest.status = 'approved';
    refundRequest.reviewedAt = new Date();
    refundRequest.reviewedBy = reviewedBy;
    refundRequest.adminNotes = adminNotes;

    // Process refund
    try {
      const refundTransaction = await this.paymentService.processRefund(
        refundRequest.enrollmentId,
        refundRequest.calculatedRefundAmount,
        refundRequest.reason
      );

      refundRequest.status = 'processed';
      refundRequest.processedAt = new Date();
      refundRequest.refundTransactionId = refundTransaction.id;

      // Update enrollment status
      await this.enrollmentService.updateEnrollment(refundRequest.enrollmentId, {
        status: EnrollmentStatus.REFUNDED,
        refundAmount: refundRequest.calculatedRefundAmount,
        refundReason: refundRequest.reason,
        refundedAt: new Date()
      });

      // Send notification
      await this.notificationService.sendRefundApprovedNotification(
        refundRequest.userId,
        refundRequest
      );
    } catch (error) {
      console.error('Error processing refund:', error);
      refundRequest.status = 'approved'; // Keep approved but note processing error
      refundRequest.adminNotes = (refundRequest.adminNotes || '') + 
        ` | Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.refundRequests.set(refundRequestId, refundRequest);
    return refundRequest;
  }

  /**
   * Reject refund request
   */
  async rejectRefundRequest(
    refundRequestId: string,
    reviewedBy: string,
    rejectionReason: string
  ): Promise<RefundRequestDetails> {
    const refundRequest = this.refundRequests.get(refundRequestId);
    if (!refundRequest) {
      throw new Error('Refund request not found');
    }

    if (refundRequest.status !== 'pending') {
      throw new Error('Refund request is not in pending status');
    }

    refundRequest.status = 'rejected';
    refundRequest.reviewedAt = new Date();
    refundRequest.reviewedBy = reviewedBy;
    refundRequest.adminNotes = rejectionReason;

    this.refundRequests.set(refundRequestId, refundRequest);

    // Send notification
    await this.notificationService.sendRefundRejectedNotification(
      refundRequest.userId,
      refundRequest,
      rejectionReason
    );

    return refundRequest;
  }

  /**
   * Get refund request by ID
   */
  async getRefundRequest(refundRequestId: string): Promise<RefundRequestDetails | null> {
    return this.refundRequests.get(refundRequestId) || null;
  }

  /**
   * Get refund requests for user
   */
  async getUserRefundRequests(userId: string): Promise<RefundRequestDetails[]> {
    return Array.from(this.refundRequests.values())
      .filter(req => req.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Get all refund requests (for admins)
   */
  async getAllRefundRequests(filters?: {
    status?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<RefundRequestDetails[]> {
    let requests = Array.from(this.refundRequests.values());

    if (filters) {
      if (filters.status) {
        requests = requests.filter(req => req.status === filters.status);
      }
      if (filters.category) {
        requests = requests.filter(req => req.category === filters.category);
      }
      if (filters.dateFrom) {
        requests = requests.filter(req => req.requestedAt >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        requests = requests.filter(req => req.requestedAt <= filters.dateTo!);
      }
    }

    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(dateRange?: { start: Date; end: Date }): Promise<RefundAnalytics> {
    let requests = Array.from(this.refundRequests.values());

    if (dateRange) {
      requests = requests.filter(req => 
        req.requestedAt >= dateRange.start && req.requestedAt <= dateRange.end
      );
    }

    const totalRequests = requests.length;
    const approvedRequests = requests.filter(req => req.status === 'approved' || req.status === 'processed').length;
    const rejectedRequests = requests.filter(req => req.status === 'rejected').length;
    const processedRequests = requests.filter(req => req.status === 'processed').length;

    const totalRefundAmount = requests
      .filter(req => req.status === 'processed')
      .reduce((sum, req) => sum + req.calculatedRefundAmount, 0);

    const averageRefundAmount = processedRequests > 0 
      ? totalRefundAmount / processedRequests 
      : 0;

    // Calculate average processing time
    const processedRequestsWithTime = requests.filter(req => req.processedAt && req.requestedAt);
    const averageProcessingTime = processedRequestsWithTime.length > 0
      ? processedRequestsWithTime.reduce((sum, req) => {
          const days = Math.floor(
            (req.processedAt!.getTime() - req.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / processedRequestsWithTime.length
      : 0;

    // Refund by category
    const refundByCategory = requests.reduce((acc, req) => {
      const existing = acc.find(item => item.category === req.category);
      if (existing) {
        existing.count++;
        existing.amount += req.calculatedRefundAmount;
      } else {
        acc.push({
          category: req.category,
          count: 1,
          amount: req.calculatedRefundAmount
        });
      }
      return acc;
    }, [] as { category: string; count: number; amount: number }[]);

    // Refund by reason (group similar reasons)
    const refundByReason = requests.reduce((acc, req) => {
      const existing = acc.find(item => item.reason === req.reason);
      if (existing) {
        existing.count++;
        existing.amount += req.calculatedRefundAmount;
      } else {
        acc.push({
          reason: req.reason,
          count: 1,
          amount: req.calculatedRefundAmount
        });
      }
      return acc;
    }, [] as { reason: string; count: number; amount: number }[]);

    // Mock monthly data
    const refundByMonth = [
      { month: '2024-01', count: 15, amount: 1500 },
      { month: '2024-02', count: 20, amount: 2000 },
      { month: '2024-03', count: 18, amount: 1800 }
    ];

    // Common rejection reasons
    const commonRejectionReasons = [
      { reason: 'Outside refund window', count: 25 },
      { reason: 'Course progress too high', count: 15 },
      { reason: 'Policy not applicable', count: 10 }
    ];

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      processedRequests,
      totalRefundAmount,
      averageRefundAmount,
      averageProcessingTime,
      refundByCategory,
      refundByReason,
      refundByMonth,
      commonRejectionReasons
    };
  }

  /**
   * Update refund policy
   */
  async updateRefundPolicy(policyId: string, updates: Partial<RefundPolicy>): Promise<RefundPolicy> {
    const existingPolicy = this.refundPolicies.get(policyId);
    if (!existingPolicy) {
      throw new Error('Refund policy not found');
    }

    const updatedPolicy = {
      ...existingPolicy,
      ...updates,
      updatedAt: new Date()
    };

    this.refundPolicies.set(policyId, updatedPolicy);
    return updatedPolicy;
  }

  /**
   * Get all refund policies
   */
  getRefundPolicies(): RefundPolicy[] {
    return Array.from(this.refundPolicies.values());
  }

  /**
   * Cancel refund request
   */
  async cancelRefundRequest(refundRequestId: string, userId: string): Promise<RefundRequestDetails> {
    const refundRequest = this.refundRequests.get(refundRequestId);
    if (!refundRequest) {
      throw new Error('Refund request not found');
    }

    if (refundRequest.userId !== userId) {
      throw new Error('Access denied');
    }

    if (refundRequest.status !== 'pending') {
      throw new Error('Cannot cancel refund request in current status');
    }

    refundRequest.status = 'cancelled';
    this.refundRequests.set(refundRequestId, refundRequest);

    // Send notification
    await this.notificationService.sendRefundCancelledNotification(
      refundRequest.userId,
      refundRequest
    );

    return refundRequest;
  }
}
