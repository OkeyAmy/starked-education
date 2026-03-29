/**
 * Enrollment Status Service
 * Handles enrollment status tracking and transitions
 */

import { 
  Enrollment, 
  EnrollmentStatus, 
  PaymentStatus,
  PaymentMethod,
  WaitlistEntry,
  EnrollmentCapacity
} from '../models/Enrollment';
import { EnrollmentService } from './EnrollmentService';
import { PaymentService } from './PaymentService';
import { NotificationService } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

export interface StatusTransition {
  from: EnrollmentStatus;
  to: EnrollmentStatus;
  reason?: string;
  timestamp: Date;
  triggeredBy: string; // user ID or system
  metadata?: Record<string, any>;
}

export interface EnrollmentStatusRule {
  from: EnrollmentStatus;
  to: EnrollmentStatus;
  conditions?: (enrollment: Enrollment, context?: any) => boolean;
  actions?: (enrollment: Enrollment, context?: any) => Promise<void>;
  automatic?: boolean; // Can this transition happen automatically?
}

export class EnrollmentStatusService {
  private enrollmentService: EnrollmentService;
  private paymentService: PaymentService;
  private notificationService: any;
  private statusTransitions: Map<string, StatusTransition[]> = new Map();
  private statusRules: EnrollmentStatusRule[] = [];

  constructor() {
    this.enrollmentService = new EnrollmentService();
    this.paymentService = new PaymentService();
    this.notificationService = new NotificationService();
    this.initializeStatusRules();
  }

  /**
   * Initialize status transition rules
   */
  private initializeStatusRules() {
    this.statusRules = [
      {
        from: EnrollmentStatus.PENDING,
        to: EnrollmentStatus.CONFIRMED,
        conditions: (enrollment) => enrollment.paymentStatus === PaymentStatus.COMPLETED,
        actions: async (enrollment) => {
          await this.handlePaymentConfirmed(enrollment);
        },
        automatic: true
      },
      {
        from: EnrollmentStatus.CONFIRMED,
        to: EnrollmentStatus.ACTIVE,
        conditions: (enrollment) => {
          const now = new Date();
          const courseStartDate = enrollment.metadata?.courseStartDate;
          return !courseStartDate || new Date(courseStartDate) <= now;
        },
        actions: async (enrollment) => {
          await this.handleEnrollmentActivated(enrollment);
        },
        automatic: true
      },
      {
        from: EnrollmentStatus.ACTIVE,
        to: EnrollmentStatus.COMPLETED,
        conditions: (enrollment) => enrollment.progress >= 100,
        actions: async (enrollment) => {
          await this.handleEnrollmentCompleted(enrollment);
        },
        automatic: true
      },
      {
        from: EnrollmentStatus.ACTIVE,
        to: EnrollmentStatus.EXPIRED,
        conditions: (enrollment) => {
          if (!enrollment.expiresAt) return false;
          return new Date() > enrollment.expiresAt;
        },
        actions: async (enrollment) => {
          await this.handleEnrollmentExpired(enrollment);
        },
        automatic: true
      },
      {
        from: EnrollmentStatus.PENDING,
        to: EnrollmentStatus.CANCELLED,
        actions: async (enrollment, context) => {
          await this.handleEnrollmentCancelled(enrollment, context?.reason);
        }
      },
      {
        from: EnrollmentStatus.CONFIRMED,
        to: EnrollmentStatus.CANCELLED,
        actions: async (enrollment, context) => {
          await this.handleEnrollmentCancelled(enrollment, context?.reason);
        }
      },
      {
        from: EnrollmentStatus.ACTIVE,
        to: EnrollmentStatus.CANCELLED,
        actions: async (enrollment, context) => {
          await this.handleEnrollmentCancelled(enrollment, context?.reason);
        }
      },
      {
        from: EnrollmentStatus.ACTIVE,
        to: EnrollmentStatus.SUSPENDED,
        actions: async (enrollment, context) => {
          await this.handleEnrollmentSuspended(enrollment, context?.reason);
        }
      },
      {
        from: EnrollmentStatus.SUSPENDED,
        to: EnrollmentStatus.ACTIVE,
        actions: async (enrollment) => {
          await this.handleEnrollmentReactivated(enrollment);
        }
      }
    ];
  }

  /**
   * Transition enrollment status
   */
  async transitionStatus(
    enrollmentId: string,
    newStatus: EnrollmentStatus,
    triggeredBy: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentService.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check if transition is valid
    const transitionRule = this.statusRules.find(
      rule => rule.from === enrollment.status && rule.to === newStatus
    );

    if (!transitionRule) {
      throw new Error(`Invalid status transition from ${enrollment.status} to ${newStatus}`);
    }

    // Check conditions if specified
    if (transitionRule.conditions && !transitionRule.conditions(enrollment, { reason, metadata })) {
      throw new Error(`Conditions not met for status transition from ${enrollment.status} to ${newStatus}`);
    }

    // Record status transition
    const transition: StatusTransition = {
      from: enrollment.status,
      to: newStatus,
      reason,
      timestamp: new Date(),
      triggeredBy,
      metadata
    };

    this.recordStatusTransition(enrollmentId, transition);

    // Update enrollment status
    const updatedEnrollment = await this.enrollmentService.updateEnrollment(enrollmentId, {
      status: newStatus,
      updatedAt: new Date(),
      notes: reason
    });

    // Execute transition actions
    if (transitionRule.actions) {
      await transitionRule.actions(updatedEnrollment, { reason, metadata });
    }

    return updatedEnrollment;
  }

  /**
   * Check and process automatic status transitions
   */
  async processAutomaticTransitions(): Promise<void> {
    try {
      const allEnrollments = await this.enrollmentService.getEnrollments({
        page: 1,
        limit: 1000 // Process in batches
      });

      for (const enrollment of allEnrollments.enrollments) {
        await this.checkAutomaticTransitions(enrollment);
      }
    } catch (error) {
      console.error('Error processing automatic transitions:', error);
    }
  }

  /**
   * Check automatic transitions for a single enrollment
   */
  private async checkAutomaticTransitions(enrollment: Enrollment): Promise<void> {
    const applicableRules = this.statusRules.filter(
      rule => rule.from === enrollment.status && rule.automatic
    );

    for (const rule of applicableRules) {
      try {
        if (!rule.conditions || rule.conditions(enrollment)) {
          await this.transitionStatus(
            enrollment.id,
            rule.to,
            'system',
            'Automatic status transition',
            { automatic: true }
          );
          break; // Only apply one automatic transition at a time
        }
      } catch (error) {
        console.error(`Error in automatic transition for enrollment ${enrollment.id}:`, error);
      }
    }
  }

  /**
   * Record status transition
   */
  private recordStatusTransition(enrollmentId: string, transition: StatusTransition): void {
    const transitions = this.statusTransitions.get(enrollmentId) || [];
    transitions.push(transition);
    this.statusTransitions.set(enrollmentId, transitions);
  }

  /**
   * Get status history for enrollment
   */
  async getStatusHistory(enrollmentId: string): Promise<StatusTransition[]> {
    return this.statusTransitions.get(enrollmentId) || [];
  }

  /**
   * Handle payment confirmed
   */
  private async handlePaymentConfirmed(enrollment: Enrollment): Promise<void> {
    // Send confirmation notification
    await this.notificationService.sendEnrollmentConfirmationNotification(
      enrollment.userId,
      enrollment
    );

    // Check if course has capacity for waitlisted students
    await this.processWaitlist(enrollment.courseId);
  }

  /**
   * Handle enrollment activated
   */
  private async handleEnrollmentActivated(enrollment: Enrollment): Promise<void> {
    // Send activation notification
    await this.notificationService.sendEnrollmentActivationNotification(
      enrollment.userId,
      enrollment
    );

    // Update course capacity metrics
    await this.updateCapacityMetrics(enrollment.courseId);
  }

  /**
   * Handle enrollment completed
   */
  private async handleEnrollmentCompleted(enrollment: Enrollment): Promise<void> {
    // Issue certificate if not already issued
    if (!enrollment.certificateIssued) {
      try {
        await this.enrollmentService.issueCertificate(enrollment.id);
      } catch (error) {
        console.error('Error issuing certificate:', error);
      }
    }

    // Send completion notification
    await this.notificationService.sendEnrollmentCompletionNotification(
      enrollment.userId,
      enrollment
    );

    // Update analytics
    await this.updateCompletionAnalytics(enrollment.courseId);
  }

  /**
   * Handle enrollment expired
   */
  private async handleEnrollmentExpired(enrollment: Enrollment): Promise<void> {
    // Send expiration notification
    await this.notificationService.sendEnrollmentExpirationNotification(
      enrollment.userId,
      enrollment
    );

    // Update capacity metrics
    await this.updateCapacityMetrics(enrollment.courseId);
  }

  /**
   * Handle enrollment cancelled
   */
  private async handleEnrollmentCancelled(enrollment: Enrollment, reason?: string): Promise<void> {
    // Process refund if applicable
    if (enrollment.paymentStatus === PaymentStatus.COMPLETED && enrollment.amountPaid > 0) {
      try {
        await this.paymentService.processRefund(
          enrollment.id,
          enrollment.amountPaid,
          reason || 'Enrollment cancelled'
        );
      } catch (error) {
        console.error('Error processing refund:', error);
      }
    }

    // Send cancellation notification
    await this.notificationService.sendEnrollmentCancellationNotification(
      enrollment.userId,
      enrollment
    );

    // Process waitlist if space becomes available
    await this.processWaitlist(enrollment.courseId);

    // Update capacity metrics
    await this.updateCapacityMetrics(enrollment.courseId);
  }

  /**
   * Handle enrollment suspended
   */
  private async handleEnrollmentSuspended(enrollment: Enrollment, reason?: string): Promise<void> {
    // Send suspension notification
    await this.notificationService.sendEnrollmentSuspensionNotification(
      enrollment.userId,
      enrollment,
      reason
    );
  }

  /**
   * Handle enrollment reactivated
   */
  private async handleEnrollmentReactivated(enrollment: Enrollment): Promise<void> {
    // Send reactivation notification
    await this.notificationService.sendEnrollmentReactivationNotification(
      enrollment.userId,
      enrollment
    );
  }

  /**
   * Process waitlist for course
   */
  private async processWaitlist(courseId: string): Promise<void> {
    try {
      const capacity = await this.enrollmentService.getCourseCapacity(courseId);
      
      if (capacity.currentEnrollments < capacity.maxStudents) {
        const waitlist = await this.enrollmentService.getCourseWaitlist(courseId);
        const availableSlots = capacity.maxStudents - capacity.currentEnrollments;
        
        // Enroll waitlisted students
        for (let i = 0; i < Math.min(availableSlots, waitlist.length); i++) {
          const waitlistEntry = waitlist[i];
          
          try {
            // Create enrollment for waitlisted student
            await this.enrollmentService.createEnrollment({
              userId: waitlistEntry.userId,
              courseId: waitlistEntry.courseId,
              status: EnrollmentStatus.CONFIRMED,
              paymentStatus: PaymentStatus.COMPLETED,
              paymentMethod: PaymentMethod.STELLAR,
              amountPaid: 0, // Waitlist enrollment might be free or have special pricing
              totalAmount: 0,
              currency: 'USD',
              prerequisitesMet: true
            });

            // Remove from waitlist
            await this.enrollmentService.removeFromWaitlist(waitlistEntry.userId, courseId);

            // Send waitlist notification
            await this.notificationService.sendWaitlistEnrollmentNotification(
              waitlistEntry.userId,
              courseId
            );
          } catch (error) {
            console.error(`Error enrolling waitlisted student ${waitlistEntry.userId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing waitlist:', error);
    }
  }

  /**
   * Update capacity metrics
   */
  private async updateCapacityMetrics(courseId: string): Promise<void> {
    try {
      const capacity = await this.enrollmentService.getCourseCapacity(courseId);
      
      // Update course capacity metrics (could be sent to analytics service)
      console.log(`Updated capacity metrics for course ${courseId}:`, capacity);
    } catch (error) {
      console.error('Error updating capacity metrics:', error);
    }
  }

  /**
   * Update completion analytics
   */
  private async updateCompletionAnalytics(courseId: string): Promise<void> {
    try {
      const analytics = await this.enrollmentService.getCourseEnrollmentSummary(courseId);
      
      // Update completion analytics (could be sent to analytics service)
      console.log(`Updated completion analytics for course ${courseId}:`, analytics);
    } catch (error) {
      console.error('Error updating completion analytics:', error);
    }
  }

  /**
   * Get enrollment status metrics
   */
  async getStatusMetrics(courseId?: string): Promise<{
    [key in EnrollmentStatus]: number;
  }> {
    const filter = courseId ? { courseId } : {};
    const enrollments = await this.enrollmentService.getEnrollments({
      ...filter,
      page: 1,
      limit: 10000
    });

    const metrics = {} as { [key in EnrollmentStatus]: number };
    
    // Initialize all statuses to 0
    Object.values(EnrollmentStatus).forEach(status => {
      metrics[status] = 0;
    });

    // Count enrollments by status
    enrollments.enrollments.forEach(enrollment => {
      metrics[enrollment.status]++;
    });

    return metrics;
  }

  /**
   * Get enrollment status trends
   */
  async getStatusTrends(days: number = 30): Promise<{
    date: string;
    [key in EnrollmentStatus]?: number;
  }[]> {
    const trends: { date: string; [key in EnrollmentStatus]?: number }[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate date range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      trends.push({ date });
    }

    // In production, this would query actual transition data
    // For now, return mock data
    return trends.map(trend => ({
      ...trend,
      [EnrollmentStatus.PENDING]: Math.floor(Math.random() * 10),
      [EnrollmentStatus.CONFIRMED]: Math.floor(Math.random() * 15),
      [EnrollmentStatus.ACTIVE]: Math.floor(Math.random() * 50),
      [EnrollmentStatus.COMPLETED]: Math.floor(Math.random() * 20),
      [EnrollmentStatus.CANCELLED]: Math.floor(Math.random() * 5),
      [EnrollmentStatus.SUSPENDED]: Math.floor(Math.random() * 2),
      [EnrollmentStatus.REFUNDED]: Math.floor(Math.random() * 3),
      [EnrollmentStatus.EXPIRED]: Math.floor(Math.random() * 1)
    }));
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(
    currentStatus: EnrollmentStatus,
    newStatus: EnrollmentStatus,
    enrollment?: Enrollment
  ): { valid: boolean; reason?: string } {
    const rule = this.statusRules.find(
      r => r.from === currentStatus && r.to === newStatus
    );

    if (!rule) {
      return { valid: false, reason: 'Invalid status transition' };
    }

    if (rule.conditions && enrollment && !rule.conditions(enrollment)) {
      return { valid: false, reason: 'Transition conditions not met' };
    }

    return { valid: true };
  }

  /**
   * Get available transitions for current status
   */
  getAvailableTransitions(currentStatus: EnrollmentStatus): EnrollmentStatus[] {
    return this.statusRules
      .filter(rule => rule.from === currentStatus)
      .map(rule => rule.to);
  }
}
