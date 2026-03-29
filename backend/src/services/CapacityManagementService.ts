/**
 * Capacity Management Service
 * Handles course capacity management and waitlisting operations
 */

import { 
  Enrollment, 
  EnrollmentStatus, 
  WaitlistEntry,
  EnrollmentCapacity,
  CourseEnrollmentSummary
} from '../models/Enrollment';
import { EnrollmentService } from './EnrollmentService';
import { NotificationService } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

export interface CapacityRule {
  courseId: string;
  maxStudents: number;
  waitlistEnabled: boolean;
  maxWaitlistSize?: number;
  autoEnrollFromWaitlist: boolean;
  waitlistNotificationHours: number;
  enrollmentDeadline?: Date;
  prerequisites: string[];
}

export interface WaitlistConfiguration {
  enabled: boolean;
  maxSize: number;
  autoEnroll: boolean;
  notificationHours: number;
  expirationHours: number;
  allowPriority: boolean;
  priorityRules: PriorityRule[];
}

export interface PriorityRule {
  condition: string; // e.g., "early_bird", "premium_member", "referral"
  priority: number; // Lower number = higher priority
  description: string;
}

export interface CapacityAlert {
  courseId: string;
  alertType: 'nearly_full' | 'full' | 'waitlist_full' | 'over_capacity';
  currentEnrollments: number;
  maxStudents: number;
  waitlistCount: number;
  timestamp: Date;
  message: string;
}

export class CapacityManagementService {
  private enrollmentService: EnrollmentService;
  private notificationService: any;
  private capacityRules: Map<string, CapacityRule> = new Map();
  private waitlistConfig: Map<string, WaitlistConfiguration> = new Map();
  private capacityAlerts: Map<string, CapacityAlert[]> = new Map();

  constructor() {
    this.enrollmentService = new EnrollmentService();
    this.notificationService = new NotificationService();
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default capacity configurations
   */
  private initializeDefaultConfigurations() {
    // Default waitlist configuration
    const defaultWaitlistConfig: WaitlistConfiguration = {
      enabled: true,
      maxSize: 50,
      autoEnroll: true,
      notificationHours: 24,
      expirationHours: 48,
      allowPriority: true,
      priorityRules: [
        {
          condition: 'early_bird',
          priority: 1,
          description: 'Early bird enrollment'
        },
        {
          condition: 'premium_member',
          priority: 2,
          description: 'Premium member'
        },
        {
          condition: 'referral',
          priority: 3,
          description: 'Referred student'
        }
      ]
    };

    // Set default configuration for all courses (in production, this would be per-course)
    this.waitlistConfig.set('default', defaultWaitlistConfig);
  }

  /**
   * Set capacity rule for a course
   */
  async setCapacityRule(rule: CapacityRule): Promise<void> {
    this.capacityRules.set(rule.courseId, rule);

    // Set waitlist configuration if not exists
    if (!this.waitlistConfig.has(rule.courseId)) {
      const defaultConfig = this.waitlistConfig.get('default')!;
      this.waitlistConfig.set(rule.courseId, { ...defaultConfig });
    }

    // Check for capacity alerts
    await this.checkCapacityAlerts(rule.courseId);
  }

  /**
   * Get capacity rule for a course
   */
  getCapacityRule(courseId: string): CapacityRule | null {
    return this.capacityRules.get(courseId) || null;
  }

  /**
   * Check if enrollment is allowed
   */
  async canEnroll(courseId: string, userId: string): Promise<{
    canEnroll: boolean;
    reason?: string;
    waitlistAvailable?: boolean;
    waitlistPosition?: number;
  }> {
    const capacity = await this.enrollmentService.getCourseCapacity(courseId);
    const rule = this.capacityRules.get(courseId);
    const waitlistConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentService.getUserEnrollmentForCourse(userId, courseId);
    if (existingEnrollment) {
      return {
        canEnroll: false,
        reason: 'Already enrolled in this course'
      };
    }

    // Check if user is already on waitlist
    const waitlist = await this.enrollmentService.getCourseWaitlist(courseId);
    const existingWaitlistEntry = waitlist.find(entry => entry.userId === userId);
    if (existingWaitlistEntry) {
      return {
        canEnroll: false,
        reason: 'Already on waitlist for this course',
        waitlistAvailable: true,
        waitlistPosition: existingWaitlistEntry.position
      };
    }

    // Check enrollment deadline
    if (rule?.enrollmentDeadline && new Date() > rule.enrollmentDeadline) {
      return {
        canEnroll: false,
        reason: 'Enrollment deadline has passed'
      };
    }

    // Check if course has capacity
    if (capacity.currentEnrollments < capacity.maxStudents) {
      return { canEnroll: true };
    }

    // Check if waitlist is enabled and has space
    if (waitlistConfig.enabled && (!waitlistConfig.maxSize || capacity.waitlistCount < waitlistConfig.maxSize)) {
      return {
        canEnroll: false,
        reason: 'Course is full',
        waitlistAvailable: true
      };
    }

    return {
      canEnroll: false,
      reason: waitlistConfig.enabled ? 'Course and waitlist are full' : 'Course is full and waitlist is disabled'
    };
  }

  /**
   * Add user to waitlist with priority
   */
  async addToWaitlist(
    courseId: string,
    userId: string,
    priorityCondition?: string
  ): Promise<{
    success: boolean;
    position?: number;
    estimatedTime?: string;
    message?: string;
  }> {
    const capacity = await this.enrollmentService.getCourseCapacity(courseId);
    const waitlistConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;

    if (!waitlistConfig.enabled) {
      return {
        success: false,
        message: 'Waitlist is not enabled for this course'
      };
    }

    if (waitlistConfig.maxSize && capacity.waitlistCount >= waitlistConfig.maxSize) {
      return {
        success: false,
        message: 'Waitlist is full'
      };
    }

    // Calculate priority
    let priority = 999; // Default priority
    if (priorityCondition && waitlistConfig.allowPriority) {
      const priorityRule = waitlistConfig.priorityRules.find(rule => rule.condition === priorityCondition);
      if (priorityRule) {
        priority = priorityRule.priority;
      }
    }

    // Add to waitlist with priority consideration
    const waitlistPosition = await this.enrollmentService.addToWaitlist(userId, courseId);

    // Calculate estimated time (mock calculation - in production, this would be based on historical data)
    const estimatedDays = Math.ceil(capacity.waitlistCount / 5); // Assume 5 spots open per week
    const estimatedTime = estimatedDays > 0 ? `${estimatedDays} days` : 'Soon';

    // Send waitlist confirmation notification
    await this.notificationService.sendWaitlistConfirmationNotification(
      userId,
      courseId,
      waitlistPosition,
      estimatedTime
    );

    return {
      success: true,
      position: waitlistPosition,
      estimatedTime,
      message: `Added to waitlist at position ${waitlistPosition}`
    };
  }

  /**
   * Process waitlist enrollments
   */
  async processWaitlistEnrollments(courseId: string): Promise<{
    enrolled: number;
    notified: number;
    errors: string[];
  }> {
    const capacity = await this.enrollmentService.getCourseCapacity(courseId);
    const waitlistConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;
    const waitlist = await this.enrollmentService.getCourseWaitlist(courseId);

    let enrolled = 0;
    let notified = 0;
    const errors: string[] = [];

    const availableSlots = capacity.maxStudents - capacity.currentEnrollments;

    if (availableSlots <= 0 || !waitlistConfig.autoEnroll) {
      return { enrolled, notified, errors };
    }

    // Sort waitlist by priority and position
    const sortedWaitlist = this.sortWaitlistByPriority(waitlist, waitlistConfig);

    // Enroll students from waitlist
    for (let i = 0; i < Math.min(availableSlots, sortedWaitlist.length); i++) {
      const waitlistEntry = sortedWaitlist[i];

      try {
        // Create enrollment
        await this.enrollmentService.createEnrollment({
          userId: waitlistEntry.userId,
          courseId: waitlistEntry.courseId,
          status: EnrollmentStatus.CONFIRMED,
          paymentStatus: 'completed' as any,
          paymentMethod: 'stellar' as any,
          amountPaid: 0,
          totalAmount: 0,
          currency: 'USD',
          prerequisitesMet: true
        });

        // Remove from waitlist
        await this.enrollmentService.removeFromWaitlist(waitlistEntry.userId, courseId);

        // Send enrollment notification
        await this.notificationService.sendWaitlistEnrollmentNotification(
          waitlistEntry.userId,
          courseId
        );

        enrolled++;
      } catch (error) {
        errors.push(`Failed to enroll waitlisted user ${waitlistEntry.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Notify next students on waitlist about upcoming availability
    const notificationSlots = Math.min(3, sortedWaitlist.length - enrolled);
    for (let i = enrolled; i < enrolled + notificationSlots; i++) {
      const waitlistEntry = sortedWaitlist[i];
      
      try {
        await this.notificationService.sendWaitlistAvailabilityNotification(
          waitlistEntry.userId,
          courseId,
          waitlistEntry.position - enrolled
        );
        notified++;
      } catch (error) {
        errors.push(`Failed to notify waitlisted user ${waitlistEntry.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { enrolled, notified, errors };
  }

  /**
   * Sort waitlist by priority and position
   */
  private sortWaitlistByPriority(
    waitlist: WaitlistEntry[],
    config: WaitlistConfiguration
  ): WaitlistEntry[] {
    if (!config.allowPriority) {
      return waitlist.sort((a, b) => a.position - b.position);
    }

    return waitlist.sort((a, b) => {
      // In production, this would consider user attributes for priority
      // For now, sort by position only
      return a.position - b.position;
    });
  }

  /**
   * Check capacity alerts
   */
  async checkCapacityAlerts(courseId: string): Promise<void> {
    const capacity = await this.enrollmentService.getCourseCapacity(courseId);
    const rule = this.capacityRules.get(courseId);
    
    if (!rule) return;

    const alerts: CapacityAlert[] = [];
    const now = new Date();

    // Check for nearly full alert (80% capacity)
    if (capacity.currentEnrollments >= Math.floor(rule.maxStudents * 0.8)) {
      alerts.push({
        courseId,
        alertType: 'nearly_full',
        currentEnrollments: capacity.currentEnrollments,
        maxStudents: rule.maxStudents,
        waitlistCount: capacity.waitlistCount,
        timestamp: now,
        message: `Course is ${Math.round((capacity.currentEnrollments / rule.maxStudents) * 100)}% full`
      });
    }

    // Check for full alert
    if (capacity.currentEnrollments >= rule.maxStudents) {
      alerts.push({
        courseId,
        alertType: 'full',
        currentEnrollments: capacity.currentEnrollments,
        maxStudents: rule.maxStudents,
        waitlistCount: capacity.waitlistCount,
        timestamp: now,
        message: 'Course is at full capacity'
      });
    }

    // Check for waitlist full alert
    const waitlistConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;
    if (waitlistConfig.maxSize && capacity.waitlistCount >= waitlistConfig.maxSize) {
      alerts.push({
        courseId,
        alertType: 'waitlist_full',
        currentEnrollments: capacity.currentEnrollments,
        maxStudents: rule.maxStudents,
        waitlistCount: capacity.waitlistCount,
        timestamp: now,
        message: 'Waitlist is at full capacity'
      });
    }

    // Check for over capacity alert
    if (capacity.currentEnrollments > rule.maxStudents) {
      alerts.push({
        courseId,
        alertType: 'over_capacity',
        currentEnrollments: capacity.currentEnrollments,
        maxStudents: rule.maxStudents,
        waitlistCount: capacity.waitlistCount,
        timestamp: now,
        message: `Course is over capacity by ${capacity.currentEnrollments - rule.maxStudents} students`
      });
    }

    // Store alerts
    const existingAlerts = this.capacityAlerts.get(courseId) || [];
    existingAlerts.push(...alerts);
    this.capacityAlerts.set(courseId, existingAlerts);

    // Send notifications for new alerts
    for (const alert of alerts) {
      await this.notificationService.sendCapacityAlertNotification(alert);
    }
  }

  /**
   * Get capacity alerts for course
   */
  getCapacityAlerts(courseId: string, hours: number = 24): CapacityAlert[] {
    const alerts = this.capacityAlerts.get(courseId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return alerts.filter(alert => alert.timestamp >= cutoff);
  }

  /**
   * Get waitlist analytics
   */
  async getWaitlistAnalytics(courseId: string): Promise<{
    totalWaitlisted: number;
    averageWaitTime: number;
    conversionRate: number;
    dropoffRate: number;
    priorityDistribution: { condition: string; count: number }[];
    waitTimeByMonth: { month: string; averageDays: number }[];
  }> {
    const waitlist = await this.enrollmentService.getCourseWaitlist(courseId);
    const waitlistConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;

    // Mock analytics data - in production, this would be calculated from actual data
    const totalWaitlisted = waitlist.length;
    const averageWaitTime = 7; // days
    const conversionRate = 75; // percentage
    const dropoffRate = 15; // percentage

    const priorityDistribution = [
      { condition: 'early_bird', count: Math.floor(totalWaitlisted * 0.3) },
      { condition: 'premium_member', count: Math.floor(totalWaitlisted * 0.2) },
      { condition: 'referral', count: Math.floor(totalWaitlisted * 0.1) },
      { condition: 'regular', count: Math.floor(totalWaitlisted * 0.4) }
    ];

    const waitTimeByMonth = [
      { month: '2024-01', averageDays: 5 },
      { month: '2024-02', averageDays: 6 },
      { month: '2024-03', averageDays: 8 }
    ];

    return {
      totalWaitlisted,
      averageWaitTime,
      conversionRate,
      dropoffRate,
      priorityDistribution,
      waitTimeByMonth
    };
  }

  /**
   * Clean up expired waitlist entries
   */
  async cleanupExpiredWaitlistEntries(): Promise<{
    removed: number;
    errors: string[];
  }> {
    const removed = 0;
    const errors: string[] = [];

    // In production, this would iterate through all courses and remove expired entries
    console.log('Cleaning up expired waitlist entries...');

    return { removed, errors };
  }

  /**
   * Update waitlist configuration
   */
  updateWaitlistConfiguration(courseId: string, config: Partial<WaitlistConfiguration>): void {
    const existingConfig = this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default')!;
    const updatedConfig = { ...existingConfig, ...config };
    this.waitlistConfig.set(courseId, updatedConfig);
  }

  /**
   * Get waitlist configuration
   */
  getWaitlistConfiguration(courseId: string): WaitlistConfiguration | null {
    return this.waitlistConfig.get(courseId) || this.waitlistConfig.get('default') || null;
  }

  /**
   * Batch process waitlists for all courses
   */
  async processAllWaitlists(): Promise<{
    coursesProcessed: number;
    totalEnrolled: number;
    totalNotified: number;
    errors: string[];
  }> {
    let coursesProcessed = 0;
    let totalEnrolled = 0;
    let totalNotified = 0;
    const errors: string[] = [];

    // In production, this would get all courses with waitlists
    const courseIds = ['course1', 'course2', 'course3']; // Mock data

    for (const courseId of courseIds) {
      try {
        const result = await this.processWaitlistEnrollments(courseId);
        coursesProcessed++;
        totalEnrolled += result.enrolled;
        totalNotified += result.notified;
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`Error processing waitlist for course ${courseId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      coursesProcessed,
      totalEnrolled,
      totalNotified,
      errors
    };
  }

  /**
   * Generate capacity report
   */
  async generateCapacityReport(courseId?: string): Promise<{
    summary: {
      totalCourses: number;
      totalCapacity: number;
      totalEnrolled: number;
      averageUtilization: number;
      totalWaitlisted: number;
    };
    courses: Array<{
      courseId: string;
      capacity: EnrollmentCapacity;
      utilization: number;
      waitlistConfig: WaitlistConfiguration;
      alerts: CapacityAlert[];
    }>;
  }> {
    // Mock data - in production, this would query actual data
    const summary = {
      totalCourses: 10,
      totalCapacity: 1000,
      totalEnrolled: 750,
      averageUtilization: 75,
      totalWaitlisted: 50
    };

    const courses = [
      {
        courseId: 'course1',
        capacity: {
          courseId: 'course1',
          maxStudents: 100,
          currentEnrollments: 85,
          waitlistCount: 15,
          lastUpdated: new Date()
        },
        utilization: 85,
        waitlistConfig: this.waitlistConfig.get('course1') || this.waitlistConfig.get('default')!,
        alerts: this.getCapacityAlerts('course1')
      }
    ];

    return { summary, courses };
  }
}
