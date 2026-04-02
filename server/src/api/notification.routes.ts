import { Router } from 'express';
import {
  getAllNotifications,
  getNotificationStats,
  sendTestNotification,
  getNotificationChannels,
  broadcastNotification,
} from '../controllers/notification.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const notificationRoutes = Router();

// All routes require authentication
notificationRoutes.use(authenticate);

// Notification routes
notificationRoutes.get('/', getAllNotifications);
notificationRoutes.get('/stats', getNotificationStats);
notificationRoutes.get('/channels', getNotificationChannels);
notificationRoutes.post('/test', sendTestNotification);

// Admin-only broadcast route
notificationRoutes.post('/broadcast', requireAdmin, broadcastNotification);
