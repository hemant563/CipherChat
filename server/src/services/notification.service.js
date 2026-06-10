import { Notification } from '../models/index.js';
import logger from '../utils/logger.js';
// import admin from 'firebase-admin'; // To be added when FCM is implemented

/**
 * Service to handle creating in-app notifications and sending push notifications.
 */
class NotificationService {
  /**
   * Creates an in-app notification and attempts to send a push notification.
   * @param {Object} params
   * @param {string} params.recipientId - User ID
   * @param {string} params.type - NOTIFICATION_TYPE
   * @param {string} params.title
   * @param {string} params.body
   * @param {Object} params.data - Custom payload data
   * @returns {Promise<Object>} Created notification document
   */
  static async sendNotification({ recipientId, type, title, body, data = {} }) {
    try {
      // 1. Save in-app notification
      const notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        body,
        data,
      });

      // 2. Send push notification via FCM (Mocked for now)
      await this.sendPushNotification(recipientId, title, body, data);

      return notification;
    } catch (error) {
      logger.error(`Failed to send notification to ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Mocks sending a push notification.
   * (In production, this would use Firebase Admin SDK to send to user's FCM tokens)
   */
  static async sendPushNotification(recipientId, title, body, data) {
    // Mock implementation
    logger.info(`[MOCK PUSH] Sent to user ${recipientId} - Title: ${title}`);
    
    // Future implementation:
    // 1. Get user's trusted devices with FCM tokens from DB
    // 2. Construct FCM payload
    // 3. Send using admin.messaging().sendMulticast(...)
    // 4. Update notification `isPushSent` to true
  }
}

export default NotificationService;
