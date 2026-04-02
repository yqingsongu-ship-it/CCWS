import { Request, Response } from 'express';
import { ApiResponse } from '@synthetic-monitoring/shared';
import { notificationService, NotificationChannel } from '../services/notification.service.js';
import { prisma } from '../database/index.js';
import { ZodError } from 'zod';
import { z } from 'zod';

const testNotificationSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'VOICE', 'APP_PUSH', 'WEBHOOK', 'URL', 'DINGTALK', 'WECHAT', 'SLACK']),
  recipient: z.string(),
  message: z.string().optional(),
});

/**
 * GET /api/notifications
 * Get all notifications with pagination
 */
export async function getAllNotifications(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const channel = req.query.channel as string;
    const status = req.query.status as string;

    const where: Record<string, unknown> = {};

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    // Filter by user's notifications
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: { email: true },
      });
      if (user) {
        where.recipient = user.email;
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        items: notifications,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
}

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
export async function getNotificationStats(req: Request, res: Response): Promise<void> {
  try {
    const period = req.query.period as '24h' | '7d' | '30d' || '24h';
    const stats = await notificationService.getStats(period);

    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification statistics' });
  }
}

/**
 * POST /api/notifications/test
 * Send a test notification
 */
export async function sendTestNotification(req: Request, res: Response): Promise<void> {
  try {
    const data = testNotificationSchema.parse(req.body);

    const payload = {
      type: 'TEST' as const,
      title: 'Test Notification',
      message: data.message || 'This is a test notification from DEM Monitoring System.',
      priority: 'LOW' as const,
    };

    const result = await notificationService.send(data.channel, data.recipient, payload);

    const response: ApiResponse = { success: true, data: result };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Send test notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
}

/**
 * GET /api/notifications/channels
 * Get available notification channels
 */
export async function getNotificationChannels(req: Request, res: Response): Promise<void> {
  try {
    const channels = [
      { id: 'EMAIL', name: 'Email', enabled: true, icon: 'email' },
      { id: 'SMS', name: 'SMS', enabled: !!process.env.SMS_PROVIDER, icon: 'sms' },
      { id: 'VOICE', name: 'Voice Call', enabled: !!process.env.VOICE_PROVIDER, icon: 'phone' },
      { id: 'APP_PUSH', name: 'App Push', enabled: true, icon: 'notifications' },
      { id: 'WEBHOOK', name: 'Webhook', enabled: true, icon: 'link' },
      { id: 'URL', name: 'URL Callback', enabled: true, icon: 'http' },
      { id: 'DINGTALK', name: 'DingTalk', enabled: true, icon: 'chat' },
      { id: 'WECHAT', name: 'WeChat Work', enabled: true, icon: 'wechat' },
      { id: 'SLACK', name: 'Slack', enabled: true, icon: 'slack' },
    ];

    const response: ApiResponse = { success: true, data: channels };
    res.json(response);
  } catch (error) {
    console.error('Get notification channels error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification channels' });
  }
}

/**
 * POST /api/notifications/broadcast
 * Broadcast notification to multiple recipients (Admin only)
 */
export async function broadcastNotification(req: Request, res: Response): Promise<void> {
  try {
    const { channels, recipients, title, message, priority } = req.body;

    if (!Array.isArray(channels) || !Array.isArray(recipients)) {
      res.status(400).json({
        success: false,
        error: 'channels and recipients must be arrays',
      });
      return;
    }

    const payload = {
      type: 'SYSTEM' as const,
      title: title || 'System Notification',
      message: message || '',
      priority: (priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
    };

    const channelList = channels as NotificationChannel[];
    const results: Array<{ channel: string; recipient: string; success: boolean }> = [];

    for (const channel of channelList) {
      for (const recipient of recipients) {
        const result = await notificationService.send(channel, recipient, payload);
        results.push({
          channel,
          recipient,
          success: result.success,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    const response: ApiResponse = {
      success: true,
      data: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
        results,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to broadcast notification' });
  }
}
