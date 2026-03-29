/**
 * Enrollment Controller
 * Handles enrollment-related operations and business logic
 */

import { Request, Response } from 'express';
import { EnrollmentService } from '../services/EnrollmentService';
import { PaymentService } from '../services/PaymentService';
import { NotificationService } from '../services/NotificationService';
import { 
  Enrollment, 
  EnrollmentFilter, 
  EnrollmentStatus, 
  PaymentStatus,
  PaymentMethod,
  EnrollmentAnalytics,
  UserEnrollmentHistory,
  CourseEnrollmentSummary,
  EnrollmentCapacity
} from '../models/Enrollment';
import { UserRole } from '../models/User';

export class EnrollmentController {
  private enrollmentService: EnrollmentService;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  constructor() {
    this.enrollmentService = new EnrollmentService();
    this.paymentService = new PaymentService();
    this.notificationService = new NotificationService();
  }

  /**
   * Get user's enrollments with filtering and pagination
   */
  async getUserEnrollments(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        status,
        paymentStatus,
        paymentMethod,
        page = '1',
        limit = '10',
        sortBy = 'enrolledAt',
        sortOrder = 'desc'
      } = req.query;

      const filter: EnrollmentFilter = {
        userId,
        status: status ? (Array.isArray(status) ? status as EnrollmentStatus[] : [status as EnrollmentStatus]) : undefined,
        paymentStatus: paymentStatus ? (Array.isArray(paymentStatus) ? paymentStatus as PaymentStatus[] : [paymentStatus as PaymentStatus]) : undefined,
        paymentMethod: paymentMethod ? (Array.isArray(paymentMethod) ? paymentMethod as PaymentMethod[] : [paymentMethod as PaymentMethod]) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.enrollmentService.getEnrollments(filter);

      res.json({
        success: true,
        data: result.enrollments,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error getting user enrollments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enrollments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get specific enrollment details
   */
  async getEnrollmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      // Check if user has permission to view this enrollment
      if (enrollment.userId !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.EDUCATOR) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: enrollment
      });
    } catch (error) {
      console.error('Error getting enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new enrollment
   */
  async createEnrollment(req: Request, res: Response) {
    try {
      const { courseId, paymentMethod, paymentDetails } = req.body;
      const userId = req.user!.id;

      // Check if user is already enrolled
      const existingEnrollment = await this.enrollmentService.getUserEnrollmentForCourse(userId, courseId);
      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course'
        });
      }

      // Validate prerequisites
      const prerequisitesMet = await this.enrollmentService.validatePrerequisites(userId, courseId);
      if (!prerequisitesMet.valid) {
        return res.status(400).json({
          success: false,
          message: 'Prerequisites not met',
          missingPrerequisites: prerequisitesMet.missing
        });
      }

      // Check course capacity
      const capacity = await this.enrollmentService.getCourseCapacity(courseId);
      if (capacity.currentEnrollments >= capacity.maxStudents) {
        // Add to waitlist
        const waitlistPosition = await this.enrollmentService.addToWaitlist(userId, courseId);
        return res.status(202).json({
          success: true,
          message: 'Course is full. Added to waitlist',
          data: {
            waitlistPosition,
            status: 'waitlisted'
          }
        });
      }

      // Create enrollment
      const enrollment = await this.enrollmentService.createEnrollment({
        userId,
        courseId,
        paymentMethod,
        amountPaid: 0,
        totalAmount: paymentDetails.amount,
        currency: paymentDetails.currency,
        status: EnrollmentStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING
      });

      // Process payment
      if (paymentMethod === PaymentMethod.STELLAR) {
        const paymentIntent = await this.paymentService.createStellarPaymentIntent(
          enrollment.id,
          paymentDetails
        );
        
        return res.status(201).json({
          success: true,
          message: 'Enrollment created. Payment required to confirm.',
          data: {
            enrollment,
            paymentIntent
          }
        });
      } else {
        // Handle other payment methods
        const paymentIntent = await this.paymentService.createPaymentIntent(
          enrollment.id,
          paymentMethod,
          paymentDetails
        );

        return res.status(201).json({
          success: true,
          message: 'Enrollment created. Payment required to confirm.',
          data: {
            enrollment,
            paymentIntent
          }
        });
      }
    } catch (error) {
      console.error('Error creating enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update enrollment details
   */
  async updateEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const updates = req.body;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      // Check permissions
      if (enrollment.userId !== userId && userRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedEnrollment = await this.enrollmentService.updateEnrollment(id, updates);

      res.json({
        success: true,
        data: updatedEnrollment
      });
    } catch (error) {
      console.error('Error updating enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      if (enrollment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if cancellation is allowed
      if (enrollment.status === EnrollmentStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel completed enrollment'
        });
      }

      const cancelledEnrollment = await this.enrollmentService.cancelEnrollment(id, reason);

      // Process refund if applicable
      if (enrollment.paymentStatus === PaymentStatus.COMPLETED && enrollment.amountPaid > 0) {
        const refund = await this.paymentService.processRefund(
          enrollment.id,
          enrollment.amountPaid,
          reason
        );
        
        // Send notification
        await this.notificationService.sendRefundNotification(userId, refund);
      }

      // Send cancellation notification
      await this.notificationService.sendEnrollmentCancellationNotification(userId, cancelledEnrollment);

      res.json({
        success: true,
        data: cancelledEnrollment
      });
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Complete enrollment
   */
  async completeEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { issueCertificate = true } = req.body;

      const enrollment = await this.enrollmentService.completeEnrollment(id);

      if (issueCertificate && enrollment.progress === 100) {
        const certificate = await this.enrollmentService.issueCertificate(id);
        
        // Send certificate notification
        await this.notificationService.sendCertificateIssuanceNotification(
          enrollment.userId,
          certificate
        );
      }

      res.json({
        success: true,
        data: enrollment
      });
    } catch (error) {
      console.error('Error completing enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get enrollment progress
   */
  async getEnrollmentProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      if (enrollment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const progress = await this.enrollmentService.getEnrollmentProgress(id);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error getting enrollment progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get enrollment progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update enrollment progress
   */
  async updateEnrollmentProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      const userId = req.user!.id;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      if (enrollment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedEnrollment = await this.enrollmentService.updateEnrollmentProgress(id, progress);

      res.json({
        success: true,
        data: updatedEnrollment
      });
    } catch (error) {
      console.error('Error updating enrollment progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update enrollment progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get course enrollments (for educators/admins)
   */
  async getCourseEnrollments(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const {
        status,
        page = '1',
        limit = '50'
      } = req.query;

      const filter: EnrollmentFilter = {
        courseId,
        status: status ? (Array.isArray(status) ? status as EnrollmentStatus[] : [status as EnrollmentStatus]) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.enrollmentService.getEnrollments(filter);

      res.json({
        success: true,
        data: result.enrollments,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error getting course enrollments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve course enrollments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Issue certificate
   */
  async issueCertificate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const certificate = await this.enrollmentService.issueCertificate(id);

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      console.error('Error issuing certificate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to issue certificate',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get course waitlist
   */
  async getCourseWaitlist(req: Request, res: Response) {
    try {
      const { courseId } = req.params;

      const waitlist = await this.enrollmentService.getCourseWaitlist(courseId);

      res.json({
        success: true,
        data: waitlist
      });
    } catch (error) {
      console.error('Error getting course waitlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve course waitlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add to waitlist
   */
  async addToWaitlist(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;

      // Check if already enrolled or on waitlist
      const existingEnrollment = await this.enrollmentService.getUserEnrollmentForCourse(userId, courseId);
      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled or on waitlist for this course'
        });
      }

      const waitlistPosition = await this.enrollmentService.addToWaitlist(userId, courseId);

      res.status(201).json({
        success: true,
        data: {
          waitlistPosition,
          message: 'Added to waitlist'
        }
      });
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to waitlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;

      await this.enrollmentService.removeFromWaitlist(userId, courseId);

      res.json({
        success: true,
        message: 'Removed from waitlist'
      });
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from waitlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user enrollment analytics
   */
  async getUserEnrollmentAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const analytics: UserEnrollmentHistory = await this.enrollmentService.getUserEnrollmentHistory(userId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting user enrollment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user enrollment analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get course enrollment analytics
   */
  async getCourseEnrollmentAnalytics(req: Request, res: Response) {
    try {
      const { courseId } = req.params;

      const analytics: CourseEnrollmentSummary = await this.enrollmentService.getCourseEnrollmentSummary(courseId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting course enrollment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve course enrollment analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get global enrollment analytics
   */
  async getGlobalEnrollmentAnalytics(req: Request, res: Response) {
    try {
      const analytics: EnrollmentAnalytics = await this.enrollmentService.getGlobalEnrollmentAnalytics();

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting global enrollment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve global enrollment analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Bulk enrollment operations
   */
  async bulkEnrollmentOperations(req: Request, res: Response) {
    try {
      const { operation, enrollments } = req.body;

      const result = await this.enrollmentService.bulkEnrollmentOperations(operation, enrollments);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error performing bulk enrollment operations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk enrollment operations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get course capacity
   */
  async getCourseCapacity(req: Request, res: Response) {
    try {
      const { courseId } = req.params;

      const capacity: EnrollmentCapacity = await this.enrollmentService.getCourseCapacity(courseId);

      res.json({
        success: true,
        data: capacity
      });
    } catch (error) {
      console.error('Error getting course capacity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve course capacity',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate prerequisites
   */
  async validatePrerequisites(req: Request, res: Response) {
    try {
      const { courseId } = req.body;
      const userId = req.user!.id;

      const validation = await this.enrollmentService.validatePrerequisites(userId, courseId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating prerequisites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate prerequisites',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user enrollment history
   */
  async getUserEnrollmentHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const userRole = req.user!.role;

      // Check permissions
      if (userId !== requestingUserId && userRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const history: UserEnrollmentHistory = await this.enrollmentService.getUserEnrollmentHistory(userId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting user enrollment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user enrollment history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Renew enrollment
   */
  async renewEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentDetails } = req.body;
      const userId = req.user!.id;

      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      if (enrollment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const renewedEnrollment = await this.enrollmentService.renewEnrollment(id, paymentDetails);

      res.json({
        success: true,
        data: renewedEnrollment
      });
    } catch (error) {
      console.error('Error renewing enrollment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew enrollment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export course enrollments
   */
  async exportCourseEnrollments(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const { format = 'csv' } = req.query;

      const exportData = await this.enrollmentService.exportCourseEnrollments(courseId, format as string);

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=enrollments-${courseId}.${format}`);
      
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting course enrollments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export course enrollments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
