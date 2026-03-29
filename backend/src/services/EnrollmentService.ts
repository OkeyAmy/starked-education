/**
 * Enrollment Service
 * Handles business logic for course enrollments
 */

import { 
  Enrollment, 
  EnrollmentStatus, 
  PaymentStatus, 
  PaymentMethod,
  EnrollmentFilter,
  EnrollmentAnalytics,
  UserEnrollmentHistory,
  CourseEnrollmentSummary,
  EnrollmentCapacity,
  WaitlistEntry,
  RefundRequest,
  InstallmentPlan,
  Installment
} from '../models/Enrollment';
import { Course } from '../models/Course';
import { UserRole } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

export class EnrollmentService {
  // Mock database - in production, this would be replaced with actual database calls
  private enrollments: Map<string, Enrollment> = new Map();
  private waitlist: Map<string, WaitlistEntry[]> = new Map();
  private refundRequests: Map<string, RefundRequest> = new Map();
  private installmentPlans: Map<string, InstallmentPlan> = new Map();

  /**
   * Get enrollments with filtering and pagination
   */
  async getEnrollments(filter: EnrollmentFilter): Promise<{
    enrollments: Enrollment[];
    total: number;
    page: number;
    limit: number;
  }> {
    let filteredEnrollments = Array.from(this.enrollments.values());

    // Apply filters
    if (filter.userId) {
      filteredEnrollments = filteredEnrollments.filter(e => e.userId === filter.userId);
    }

    if (filter.courseId) {
      filteredEnrollments = filteredEnrollments.filter(e => e.courseId === filter.courseId);
    }

    if (filter.status && filter.status.length > 0) {
      filteredEnrollments = filteredEnrollments.filter(e => filter.status!.includes(e.status));
    }

    if (filter.paymentStatus && filter.paymentStatus.length > 0) {
      filteredEnrollments = filteredEnrollments.filter(e => filter.paymentStatus!.includes(e.paymentStatus));
    }

    if (filter.paymentMethod && filter.paymentMethod.length > 0) {
      filteredEnrollments = filteredEnrollments.filter(e => filter.paymentMethod!.includes(e.paymentMethod));
    }

    if (filter.progressRange) {
      filteredEnrollments = filteredEnrollments.filter(e => 
        e.progress >= filter.progressRange!.min && e.progress <= filter.progressRange!.max
      );
    }

    if (filter.certificateIssued !== undefined) {
      filteredEnrollments = filteredEnrollments.filter(e => e.certificateIssued === filter.certificateIssued);
    }

    // Sort
    if (filter.sortBy) {
      filteredEnrollments.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filter.sortBy) {
          case 'enrolledAt':
            aValue = a.enrolledAt.getTime();
            bValue = b.enrolledAt.getTime();
            break;
          case 'progress':
            aValue = a.progress;
            bValue = b.progress;
            break;
          case 'amountPaid':
            aValue = a.amountPaid;
            bValue = b.amountPaid;
            break;
          case 'completedAt':
            aValue = a.completedAt?.getTime() || 0;
            bValue = b.completedAt?.getTime() || 0;
            break;
          default:
            aValue = a.enrolledAt.getTime();
            bValue = b.enrolledAt.getTime();
        }

        if (filter.sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });
    }

    const total = filteredEnrollments.length;
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      enrollments: filteredEnrollments.slice(startIndex, endIndex),
      total,
      page,
      limit
    };
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollmentById(id: string): Promise<Enrollment | null> {
    return this.enrollments.get(id) || null;
  }

  /**
   * Get user enrollment for a specific course
   */
  async getUserEnrollmentForCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    const enrollments = Array.from(this.enrollments.values());
    return enrollments.find(e => e.userId === userId && e.courseId === courseId) || null;
  }

  /**
   * Create new enrollment
   */
  async createEnrollment(data: Omit<Enrollment, 'id' | 'enrolledAt' | 'updatedAt' | 'progress' | 'certificateIssued'>): Promise<Enrollment> {
    const enrollment: Enrollment = {
      id: uuidv4(),
      ...data,
      enrolledAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      certificateIssued: false
    };

    this.enrollments.set(enrollment.id, enrollment);
    return enrollment;
  }

  /**
   * Update enrollment
   */
  async updateEnrollment(id: string, updates: Partial<Enrollment>): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updatedEnrollment = {
      ...enrollment,
      ...updates,
      updatedAt: new Date()
    };

    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(id: string, reason?: string): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updatedEnrollment = {
      ...enrollment,
      status: EnrollmentStatus.CANCELLED,
      updatedAt: new Date(),
      notes: reason
    };

    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  /**
   * Complete enrollment
   */
  async completeEnrollment(id: string): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const updatedEnrollment = {
      ...enrollment,
      status: EnrollmentStatus.COMPLETED,
      progress: 100,
      completedAt: new Date(),
      updatedAt: new Date()
    };

    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  /**
   * Get enrollment progress
   */
  async getEnrollmentProgress(id: string): Promise<{
    enrollmentId: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    timeSpent: number;
    lastAccessed: Date;
  }> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Mock progress data - in production, this would come from actual learning progress tracking
    return {
      enrollmentId: id,
      progress: enrollment.progress,
      completedLessons: Math.floor((enrollment.progress / 100) * 20), // Assuming 20 lessons
      totalLessons: 20,
      timeSpent: Math.floor(enrollment.progress * 2.5), // Mock time spent in hours
      lastAccessed: enrollment.updatedAt
    };
  }

  /**
   * Update enrollment progress
   */
  async updateEnrollmentProgress(id: string, progress: number): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const updatedEnrollment = {
      ...enrollment,
      progress,
      updatedAt: new Date()
    };

    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  /**
   * Issue certificate for enrollment
   */
  async issueCertificate(enrollmentId: string): Promise<{
    id: string;
    enrollmentId: string;
    userId: string;
    courseId: string;
    issuedAt: Date;
    certificateUrl: string;
    blockchainHash: string;
  }> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new Error('Enrollment must be completed to issue certificate');
    }

    if (enrollment.certificateIssued) {
      throw new Error('Certificate already issued');
    }

    const certificate = {
      id: uuidv4(),
      enrollmentId,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      issuedAt: new Date(),
      certificateUrl: `https://certificates.starked-education.org/${uuidv4()}`,
      blockchainHash: `0x${Buffer.from(uuidv4()).toString('hex')}`
    };

    // Update enrollment
    const updatedEnrollment = {
      ...enrollment,
      certificateIssued: true,
      certificateId: certificate.id,
      updatedAt: new Date()
    };

    this.enrollments.set(enrollmentId, updatedEnrollment);

    return certificate;
  }

  /**
   * Get course waitlist
   */
  async getCourseWaitlist(courseId: string): Promise<WaitlistEntry[]> {
    return this.waitlist.get(courseId) || [];
  }

  /**
   * Add user to waitlist
   */
  async addToWaitlist(userId: string, courseId: string): Promise<number> {
    const courseWaitlist = this.waitlist.get(courseId) || [];
    
    // Check if already on waitlist
    if (courseWaitlist.some(entry => entry.userId === userId)) {
      throw new Error('User already on waitlist');
    }

    const position = courseWaitlist.length + 1;
    const waitlistEntry: WaitlistEntry = {
      id: uuidv4(),
      userId,
      courseId,
      position,
      addedAt: new Date(),
      status: 'active'
    };

    courseWaitlist.push(waitlistEntry);
    this.waitlist.set(courseId, courseWaitlist);

    return position;
  }

  /**
   * Remove user from waitlist
   */
  async removeFromWaitlist(userId: string, courseId: string): Promise<void> {
    const courseWaitlist = this.waitlist.get(courseId) || [];
    const index = courseWaitlist.findIndex(entry => entry.userId === userId);
    
    if (index === -1) {
      throw new Error('User not found on waitlist');
    }

    courseWaitlist.splice(index, 1);
    
    // Update positions
    courseWaitlist.forEach((entry, i) => {
      entry.position = i + 1;
    });

    this.waitlist.set(courseId, courseWaitlist);
  }

  /**
   * Get course capacity
   */
  async getCourseCapacity(courseId: string): Promise<EnrollmentCapacity> {
    const enrollments = Array.from(this.enrollments.values());
    const courseEnrollments = enrollments.filter(e => 
      e.courseId === courseId && 
      e.status !== EnrollmentStatus.CANCELLED && 
      e.status !== EnrollmentStatus.REFUNDED
    );
    
    const waitlist = this.waitlist.get(courseId) || [];
    const activeWaitlist = waitlist.filter(entry => entry.status === 'active');

    // Mock course data - in production, this would come from the course service
    const course = await this.getCourseDetails(courseId);
    const maxStudents = course?.metadata.maxStudents || 100;

    return {
      courseId,
      maxStudents,
      currentEnrollments: courseEnrollments.length,
      waitlistCount: activeWaitlist.length,
      lastUpdated: new Date()
    };
  }

  /**
   * Validate prerequisites
   */
  async validatePrerequisites(userId: string, courseId: string): Promise<{
    valid: boolean;
    missing: string[];
    completed: string[];
  }> {
    const course = await this.getCourseDetails(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const prerequisiteCourses = course.metadata.prerequisiteCourses || [];
    const userEnrollments = Array.from(this.enrollments.values())
      .filter(e => e.userId === userId && e.status === EnrollmentStatus.COMPLETED)
      .map(e => e.courseId);

    const completed = prerequisiteCourses.filter(prereq => userEnrollments.includes(prereq));
    const missing = prerequisiteCourses.filter(prereq => !userEnrollments.includes(prereq));

    return {
      valid: missing.length === 0,
      missing,
      completed
    };
  }

  /**
   * Get user enrollment history
   */
  async getUserEnrollmentHistory(userId: string): Promise<UserEnrollmentHistory> {
    const userEnrollments = Array.from(this.enrollments.values())
      .filter(e => e.userId === userId);

    const totalEnrollments = userEnrollments.length;
    const activeEnrollments = userEnrollments.filter(e => e.status === EnrollmentStatus.ACTIVE).length;
    const completedEnrollments = userEnrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
    const totalSpent = userEnrollments.reduce((sum, e) => sum + e.amountPaid, 0);

    // Mock favorite categories and completion time - in production, this would be calculated from actual data
    const favoriteCategories = ['Web Development', 'Blockchain', 'Data Science'];
    const averageCompletionTime = 30; // days
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const lastActivityDate = userEnrollments.length > 0 
      ? userEnrollments.reduce((latest, e) => e.updatedAt > latest ? e.updatedAt : latest, userEnrollments[0].updatedAt)
      : new Date();

    return {
      userId,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalSpent,
      averageCompletionTime,
      favoriteCategories,
      completionRate,
      lastActivityDate,
      enrollments: userEnrollments
    };
  }

  /**
   * Get course enrollment summary
   */
  async getCourseEnrollmentSummary(courseId: string): Promise<CourseEnrollmentSummary> {
    const enrollments = Array.from(this.enrollments.values())
      .filter(e => e.courseId === courseId);

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE).length;
    const completedEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
    const cancelledEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.CANCELLED).length;
    const refundedEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.REFUNDED).length;
    
    const totalRevenue = enrollments.reduce((sum, e) => sum + e.amountPaid, 0);
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const refundRate = totalEnrollments > 0 ? (refundedEnrollments / totalEnrollments) * 100 : 0;

    const waitlist = this.waitlist.get(courseId) || [];
    const waitlistCount = waitlist.filter(entry => entry.status === 'active').length;

    const course = await this.getCourseDetails(courseId);
    const lastEnrollmentDate = enrollments.length > 0 
      ? enrollments.reduce((latest, e) => e.enrolledAt > latest ? e.enrolledAt : latest, enrollments[0].enrolledAt)
      : new Date();

    return {
      courseId,
      courseTitle: course?.title || 'Unknown Course',
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      waitlistCount,
      totalRevenue,
      averageRating: course?.rating || 0,
      completionRate,
      refundRate,
      lastEnrollmentDate
    };
  }

  /**
   * Get global enrollment analytics
   */
  async getGlobalEnrollmentAnalytics(): Promise<EnrollmentAnalytics> {
    const enrollments = Array.from(this.enrollments.values());

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE).length;
    const completedEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
    const cancelledEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.CANCELLED).length;
    const refundedEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.REFUNDED).length;

    const totalRevenue = enrollments.reduce((sum, e) => sum + e.amountPaid, 0);
    const averageCompletionTime = 30; // Mock data - in production, calculate from actual data
    const enrollmentRate = totalEnrollments / 30; // Mock rate per day
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const refundRate = totalEnrollments > 0 ? (refundedEnrollments / totalEnrollments) * 100 : 0;
    const dropoffRate = totalEnrollments > 0 ? ((cancelledEnrollments + refundedEnrollments) / totalEnrollments) * 100 : 0;

    // Mock monthly data - in production, this would be calculated from actual timestamps
    const revenueByMonth = [
      { month: '2024-01', revenue: 15000 },
      { month: '2024-02', revenue: 18000 },
      { month: '2024-03', revenue: 22000 }
    ];

    const enrollmentsByMonth = [
      { month: '2024-01', count: 150 },
      { month: '2024-02', count: 180 },
      { month: '2024-03', count: 220 }
    ];

    const completionByMonth = [
      { month: '2024-01', count: 120 },
      { month: '2024-02', count: 144 },
      { month: '2024-03', count: 176 }
    ];

    return {
      courseId: 'global',
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      cancelledEnrollments,
      refundedEnrollments,
      totalRevenue,
      averageCompletionTime,
      enrollmentRate,
      completionRate,
      refundRate,
      dropoffRate,
      revenueByMonth,
      enrollmentsByMonth,
      completionByMonth
    };
  }

  /**
   * Bulk enrollment operations
   */
  async bulkEnrollmentOperations(operation: string, enrollments: any[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const enrollmentData of enrollments) {
      try {
        switch (operation) {
          case 'activate':
            await this.updateEnrollment(enrollmentData.id, { status: EnrollmentStatus.ACTIVE });
            break;
          case 'cancel':
            await this.cancelEnrollment(enrollmentData.id, enrollmentData.reason);
            break;
          case 'complete':
            await this.completeEnrollment(enrollmentData.id);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`Failed to ${operation} enrollment ${enrollmentData.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Renew enrollment
   */
  async renewEnrollment(enrollmentId: string, paymentDetails: any): Promise<Enrollment> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.EXPIRED) {
      throw new Error('Only expired enrollments can be renewed');
    }

    const renewedEnrollment = {
      ...enrollment,
      status: EnrollmentStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      updatedAt: new Date(),
      totalAmount: paymentDetails.amount,
      amountPaid: 0,
      paymentStatus: PaymentStatus.PENDING
    };

    this.enrollments.set(enrollmentId, renewedEnrollment);
    return renewedEnrollment;
  }

  /**
   * Export course enrollments
   */
  async exportCourseEnrollments(courseId: string, format: string): Promise<string> {
    const enrollments = Array.from(this.enrollments.values())
      .filter(e => e.courseId === courseId);

    if (format === 'csv') {
      const headers = 'ID,User ID,Course ID,Status,Payment Status,Amount Paid,Total Amount,Enrolled At,Progress\n';
      const rows = enrollments.map(e => 
        `${e.id},${e.userId},${e.courseId},${e.status},${e.paymentStatus},${e.amountPaid},${e.totalAmount},${e.enrolledAt.toISOString()},${e.progress}`
      ).join('\n');
      return headers + rows;
    } else {
      return JSON.stringify(enrollments, null, 2);
    }
  }

  /**
   * Mock method to get course details
   * In production, this would call the course service
   */
  private async getCourseDetails(courseId: string): Promise<Course | null> {
    // Mock course data
    return {
      id: courseId,
      title: 'Sample Course',
      description: 'A sample course for testing',
      shortDescription: 'Sample course',
      category: { id: 'cat1', name: 'Technology', description: 'Tech courses' },
      instructor: { id: 'inst1', name: 'John Doe', bio: 'Instructor', avatar: '', rating: 4.5 },
      price: 99.99,
      rating: 4.5,
      ratingCount: 100,
      reviews: [],
      enrollmentCount: 150,
      thumbnail: '',
      coverImage: '',
      tags: [],
      skills: [],
      objectives: [],
      curriculum: [],
      metadata: {
        level: 'beginner' as const,
        duration: 40,
        language: 'English',
        subtitle: '',
        prerequisiteCourses: [],
        maxStudents: 100,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }
}
