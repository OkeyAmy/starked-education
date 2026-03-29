import {
  Notification,
  INotification,
  NotificationPreference,
  INotificationPreference,
} from "../models/Notification";
import { getWebsocketService } from "./websocketService";
import logger from "../utils/logger";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { Twilio } from "twilio";
import webpush from "web-push";

// Initialize services with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || "",
);

if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

if (process.env.VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    "mailto:" + process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || "",
  );
}

interface NotificationFilter {
  userId?: string;
  category?: "course" | "message" | "system" | "achievement";
  isRead?: boolean;
  priority?: "low" | "medium" | "high";
  limit?: number;
  skip?: number;
}

interface NotificationPreference {
  userId: string;
  enabledCategories: string[];
  deliveryMethods: ("email" | "push" | "websocket")[];
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

class NotificationService {
  constructor() {}

  public async createNotification(
    userId: string,
    title: string,
    message: string,
    category: "course" | "message" | "system" | "achievement",
    options?: {
      priority?: "low" | "medium" | "high";
      deliveryMethods?: ("email" | "push" | "websocket")[];
      actionUrl?: string;
      metadata?: Record<string, any>;
      scheduledTime?: Date;
    },
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        category,
        priority: options?.priority || "medium",
        deliveryMethods: options?.deliveryMethods || ["websocket"],
        actionUrl: options?.actionUrl,
        metadata: options?.metadata,
        scheduledTime: options?.scheduledTime,
      });

      await notification.save();

      // Check if user has preferences that allow this notification
      const preferences = await this.getUserPreferences(userId);
      if (this.shouldSendNotification(userId, category, preferences)) {
        // Deliver based on user preferences
        await this.deliverNotification(notification, preferences);
      }

      logger.info(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error);
      throw error;
    }
  }

  private async deliverNotification(
    notification: INotification,
    preferences: INotificationPreference,
  ): Promise<void> {
    try {
      // Update notification status to indicate it's being delivered
      notification.isDelivered = true;
      notification.sentTime = new Date();
      await notification.save();

      const deliveryPromises: Promise<void>[] = [];

      // Deliver via each specified method
      if (preferences.deliveryMethods.includes("websocket")) {
        // Deliver via websocket if user is online
        const websocketService = getWebsocketService();
        websocketService.sendNotification(notification.userId, notification);
      }

      if (preferences.deliveryMethods.includes("email")) {
        // Queue email delivery with retry
        deliveryPromises.push(
          this.withRetry(() => this.queueEmailDelivery(notification), 3),
        );
      }

      if (preferences.deliveryMethods.includes("push")) {
        // Queue push notification delivery with retry
        deliveryPromises.push(
          this.withRetry(() => this.queuePushDelivery(notification), 3),
        );
      }

      // We use allSettled to ensure one method failing doesn't stop others,
      // but we wait for all to finish/retry
      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      logger.error("Error delivering notification:", error);
      throw error;
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 1) throw error;
      logger.warn(
        `Delivery failed, retrying in ${delay}ms... (${retries - 1} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  private async queueEmailDelivery(notification: INotification): Promise<void> {
    try {
      // In a real app, you'd fetch the user's email from the user model
      const userEmail = notification.metadata?.email;

      if (!userEmail) {
        logger.warn(`No email found for user ${notification.userId}`);
        return;
      }

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject: notification.title,
        text: notification.message,
        html: `<p>${notification.message}</p>`,
      });
      logger.info(
        `Email sent to ${userEmail} for notification ${notification._id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending email for notification ${notification._id}:`,
        error,
      );
      throw error;
    }
  }

  private async queuePushDelivery(notification: INotification): Promise<void> {
    try {
      // Mobile Push (Firebase)
      if (notification.metadata?.fcmToken) {
        await admin.messaging().send({
          token: notification.metadata.fcmToken,
          notification: {
            title: notification.title,
            body: notification.message,
          },
          data: {
            notificationId: notification._id.toString(),
            actionUrl: notification.actionUrl || "",
          },
        });
        logger.info(`FCM Push sent to ${notification.userId}`);
      }

      // Web Push
      if (notification.metadata?.webPushSubscription) {
        await webpush.sendNotification(
          notification.metadata.webPushSubscription,
          JSON.stringify({
            title: notification.title,
            body: notification.message,
            icon: "/icon.png",
            url: notification.actionUrl,
          }),
        );
        logger.info(`Web Push sent to ${notification.userId}`);
      }
    } catch (error) {
      logger.error(
        `Error sending push for notification ${notification._id}:`,
        error,
      );
      throw error;
    }
  }

  private async sendSMS(notification: INotification): Promise<void> {
    try {
      const userPhone = notification.metadata?.phoneNumber;
      if (!userPhone) return;

      await twilioClient.messages.create({
        body: `${notification.title}: ${notification.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: userPhone,
      });
      logger.info(`SMS sent to ${userPhone} for user ${notification.userId}`);
    } catch (error) {
      logger.error(`Error sending SMS for user ${notification.userId}:`, error);
    }
  }

  public async getNotifications(
    filter: NotificationFilter,
  ): Promise<{ notifications: INotification[]; totalCount: number }> {
    try {
      const query: any = {};

      if (filter.userId) query.userId = filter.userId;
      if (filter.category) query.category = filter.category;
      if (filter.isRead !== undefined) query.isRead = filter.isRead;
      if (filter.priority) query.priority = filter.priority;

      const limit = filter.limit || 20;
      const skip = filter.skip || 0;

      const [notifications, totalCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Notification.countDocuments(query),
      ]);

      return { notifications, totalCount };
    } catch (error) {
      logger.error("Error fetching notifications:", error);
      throw error;
    }
  }

  public async getNotificationById(id: string): Promise<INotification | null> {
    try {
      return await Notification.findById(id).exec();
    } catch (error) {
      logger.error("Error fetching notification by ID:", error);
      throw error;
    }
  }

  public async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await Notification.updateOne(
        { _id: notificationId, userId },
        { isRead: true },
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error("Error marking notification as read:", error);
      throw error;
    }
  }

  public async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true },
      );
      return result.modifiedCount;
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  public async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId,
      });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error("Error deleting notification:", error);
      throw error;
    }
  }

  public async clearAllNotifications(userId: string): Promise<number> {
    try {
      const result = await Notification.deleteMany({ userId });
      return result.deletedCount;
    } catch (error) {
      logger.error("Error clearing all notifications:", error);
      throw error;
    }
  }

  public async setNotificationPreferences(
    userId: string,
    preferences: Partial<INotificationPreference>,
  ): Promise<void> {
    try {
      await NotificationPreference.findOneAndUpdate(
        { userId },
        { $set: preferences },
        { upsert: true, new: true },
      );
      logger.info(`Updated notification preferences for user ${userId}`);
    } catch (error) {
      logger.error("Error setting notification preferences:", error);
      throw error;
    }
  }

  public async getUserPreferences(
    userId: string,
  ): Promise<INotificationPreference> {
    try {
      let preferences = await NotificationPreference.findOne({ userId }).exec();

      if (!preferences) {
        preferences = new NotificationPreference({
          userId,
          enabledCategories: ["course", "message", "system", "achievement"],
          deliveryMethods: ["websocket"],
          quietHours: {
            enabled: false,
            start: "22:00",
            end: "08:00",
          },
        });
        await preferences.save();
      }

      return preferences;
    } catch (error) {
      logger.error(`Error fetching preferences for user ${userId}:`, error);
      throw error;
    }
  }

  private shouldSendNotification(
    userId: string,
    category: string,
    preferences: INotificationPreference,
  ): boolean {
    // Check if category is enabled
    if (!preferences.enabledCategories.includes(category)) {
      return false;
    }

    // Check if currently in quiet hours
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const { start, end } = preferences.quietHours;

      // Simple check for quiet hours - assumes start/end don't cross midnight
      if (start <= end) {
        // Same day quiet hours (e.g., 22:00 to 08:00 is not same day)
        if (currentTime >= start && currentTime <= end) {
          return false;
        }
      } else {
        // Cross midnight quiet hours (e.g., 22:00 to 08:00)
        if (currentTime >= start || currentTime <= end) {
          return false;
        }
      }
    }

    return true;
  }

  public async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    category: "course" | "message" | "system" | "achievement",
    options?: {
      priority?: "low" | "medium" | "high";
      deliveryMethods?: ("email" | "push" | "websocket")[];
      actionUrl?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
      try {
        await this.createNotification(
          userId,
          title,
          message,
          category,
          options,
        );
        successCount++;
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }
}

export const notificationService = new NotificationService();
