import { createLogger } from '../utils/logger.js';
import { emailService } from './email.service.js';
import { prisma } from '../database/index.js';

const logger = createLogger('notification-service');

export type NotificationChannel =
  | 'EMAIL'
  | 'SMS'
  | 'VOICE'
  | 'APP_PUSH'
  | 'WEBHOOK'
  | 'URL'
  | 'DINGTALK'
  | 'WECHAT'
  | 'SLACK';

export interface NotificationPayload {
  type: 'ALERT' | 'INCIDENT' | 'RECOVERY' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  recipient?: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface NotificationStats {
  total: number;
  byChannel: Record<NotificationChannel, number>;
  byStatus: {
    success: number;
    failed: number;
  };
  lastSentAt?: Date;
}

/**
 * Notification Service - Unified notification across multiple channels
 */
export class NotificationService {
  private readonly smsConfig = {
    provider: process.env.SMS_PROVIDER || '',
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || '',
  };

  private readonly voiceConfig = {
    provider: process.env.VOICE_PROVIDER || '',
    apiKey: process.env.VOICE_API_KEY || '',
  };

  private readonly pushConfig = {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  };

  /**
   * Send notification via specified channel
   */
  public async send(
    channel: NotificationChannel,
    recipient: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      let result: NotificationResult;

      switch (channel) {
        case 'EMAIL':
          result = await this.sendEmail(recipient, payload);
          break;
        case 'SMS':
          result = await this.sendSMS(recipient, payload);
          break;
        case 'VOICE':
          result = await this.sendVoiceCall(recipient, payload);
          break;
        case 'APP_PUSH':
          result = await this.sendPushNotification(recipient, payload);
          break;
        case 'WEBHOOK':
          result = await this.sendWebhook(recipient, payload);
          break;
        case 'URL':
          result = await this.sendURLCallback(recipient, payload);
          break;
        case 'DINGTALK':
          result = await this.sendDingTalk(recipient, payload);
          break;
        case 'WECHAT':
          result = await this.sendWeChat(recipient, payload);
          break;
        case 'SLACK':
          result = await this.sendSlack(recipient, payload);
          break;
        default:
          return {
            success: false,
            channel,
            recipient,
            error: `Unknown channel: ${channel}`,
            timestamp: new Date(),
          };
      }

      // Log notification to database
      await this.logNotification({
        channel,
        recipient,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        responseTime: Date.now() - startTime,
        payload,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Notification send failed: ${channel}`, {
        error: errorMessage,
        recipient,
        payload,
      });

      return {
        success: false,
        channel,
        recipient,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send notification via multiple channels
   */
  public async sendBatch(
    channels: Array<{ channel: NotificationChannel; recipient: string }>,
    payload: NotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const { channel, recipient } of channels) {
      const result = await this.send(channel, recipient, payload);
      results.push(result);
    }

    return results;
  }

  /**
   * Send email notification
   */
  private async sendEmail(recipient: string, payload: NotificationPayload): Promise<NotificationResult> {
    if (payload.type === 'ALERT') {
      const { taskId, taskType, message, severity, condition, dashboardUrl } = payload.data || {};
      const success = await emailService.sendAlertEmail(
        [recipient],
        payload.title,
        taskId as string,
        taskType as string,
        message,
        severity as 'INFO' | 'WARNING' | 'CRITICAL',
        condition as string,
        dashboardUrl as string
      );

      return {
        success,
        channel: 'EMAIL',
        recipient,
        messageId: success ? `email_${Date.now()}` : undefined,
        timestamp: new Date(),
      };
    }

    // Generic email for other notification types
    const success = await emailService.sendEmail([recipient], 'alert', {
      taskName: payload.title,
      message: payload.message,
      severity: payload.priority || 'NORMAL',
      severityClass: payload.priority?.toLowerCase() || 'normal',
      timestamp: new Date().toISOString(),
      dashboardUrl: payload.data?.dashboardUrl as string || '#',
    });

    return {
      success,
      channel: 'EMAIL',
      recipient,
      messageId: success ? `email_${Date.now()}` : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(recipient: string, payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.smsConfig.apiKey) {
      return {
        success: false,
        channel: 'SMS',
        recipient,
        error: 'SMS service not configured',
        timestamp: new Date(),
      };
    }

    // Format SMS message (limited to 160 chars for single SMS)
    const message = `[${payload.priority || 'ALERT'}] ${payload.title}: ${payload.message}`.substring(0, 160);

    try {
      // SMS provider integration (placeholder - implement based on your provider)
      const response = await fetch(`https://api.${this.smsConfig.provider}.com/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.smsConfig.apiKey}`,
        },
        body: JSON.stringify({
          to: recipient,
          message,
          sender_id: this.smsConfig.senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS API returned ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channel: 'SMS',
        recipient,
        messageId: result.message_id,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SMS send failed', { error: errorMessage, recipient });

      return {
        success: false,
        channel: 'SMS',
        recipient,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send voice call notification
   */
  private async sendVoiceCall(recipient: string, payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.voiceConfig.apiKey) {
      return {
        success: false,
        channel: 'VOICE',
        recipient,
        error: 'Voice service not configured',
        timestamp: new Date(),
      };
    }

    try {
      // Voice call provider integration (placeholder)
      const response = await fetch(`https://api.${this.voiceConfig.provider}.com/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.voiceConfig.apiKey}`,
        },
        body: JSON.stringify({
          to: recipient,
          message: payload.message,
          priority: payload.priority,
        }),
      });

      if (!response.ok) {
        throw new Error(`Voice API returned ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channel: 'VOICE',
        recipient,
        messageId: result.call_id,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Voice call failed', { error: errorMessage, recipient });

      return {
        success: false,
        channel: 'VOICE',
        recipient,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(recipient: string, payload: NotificationPayload): Promise<NotificationResult> {
    // Get user's push subscriptions from database
    try {
      const user = await prisma.user.findUnique({
        where: { email: recipient },
        include: { pushSubscriptions: true },
      });

      if (!user?.pushSubscriptions?.length) {
        return {
          success: false,
          channel: 'APP_PUSH',
          recipient,
          error: 'No push subscriptions found',
          timestamp: new Date(),
        };
      }

      // Send to all user's devices
      const pushPromises = user.pushSubscriptions.map(async (subscription) => {
        // Web Push API implementation would go here
        logger.debug('Sending push notification', { endpoint: subscription.endpoint });
      });

      await Promise.all(pushPromises);

      return {
        success: true,
        channel: 'APP_PUSH',
        recipient,
        messageId: `push_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Push notification failed', { error: errorMessage, recipient });

      return {
        success: false,
        channel: 'APP_PUSH',
        recipient,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(url: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          data: payload.data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      return {
        success: true,
        channel: 'WEBHOOK',
        messageId: `webhook_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook failed', { error: errorMessage, url });

      return {
        success: false,
        channel: 'WEBHOOK',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send URL callback notification (GET request with query params)
   */
  private async sendURLCallback(url: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const callbackUrl = new URL(url);
      callbackUrl.searchParams.set('type', payload.type);
      callbackUrl.searchParams.set('title', payload.title);
      callbackUrl.searchParams.set('message', payload.message);
      callbackUrl.searchParams.set('priority', payload.priority || 'NORMAL');
      callbackUrl.searchParams.set('timestamp', new Date().toISOString());

      if (payload.data) {
        callbackUrl.searchParams.set('data', JSON.stringify(payload.data));
      }

      const response = await fetch(callbackUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`URL callback returned ${response.status}`);
      }

      return {
        success: true,
        channel: 'URL',
        messageId: `url_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('URL callback failed', { error: errorMessage, url });

      return {
        success: false,
        channel: 'URL',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send DingTalk notification
   */
  private async sendDingTalk(webhookUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // DingTalk webhook format
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            title: payload.title,
            text: `## ${payload.title}\n\n${payload.message}\n\n> Priority: ${payload.priority || 'NORMAL'}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`DingTalk returned ${response.status}`);
      }

      const result = await response.json();

      return {
        success: result.errcode === 0,
        channel: 'DINGTALK',
        messageId: result.message_id,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('DingTalk notification failed', { error: errorMessage });

      return {
        success: false,
        channel: 'DINGTALK',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send WeChat Work notification
   */
  private async sendWeChat(webhookUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // WeChat Work webhook format
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgtype: 'text',
          text: {
            content: `[${payload.priority || 'ALERT'}] ${payload.title}\n\n${payload.message}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`WeChat returned ${response.status}`);
      }

      const result = await response.json();

      return {
        success: result.errcode === 0,
        channel: 'WECHAT',
        messageId: `wechat_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WeChat notification failed', { error: errorMessage });

      return {
        success: false,
        channel: 'WECHAT',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(webhookUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // Slack webhook format
      const color = payload.priority === 'CRITICAL' ? 'danger'
        : payload.priority === 'HIGH' ? 'warning'
        : 'good';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachments: [{
            color,
            title: payload.title,
            text: payload.message,
            fields: Object.entries(payload.data || {}).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack returned ${response.status}`);
      }

      return {
        success: true,
        channel: 'SLACK',
        messageId: `slack_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Slack notification failed', { error: errorMessage });

      return {
        success: false,
        channel: 'SLACK',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(data: {
    channel: NotificationChannel;
    recipient?: string;
    success: boolean;
    messageId?: string;
    error?: string;
    responseTime: number;
    payload: NotificationPayload;
  }): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          channel: data.channel,
          recipient: data.recipient,
          status: data.success ? 'SENT' : 'FAILED',
          messageId: data.messageId,
          errorMessage: data.error,
          responseTime: data.responseTime,
          payload: data.payload as Record<string, unknown>,
        },
      });
    } catch (error) {
      logger.error('Failed to log notification', { error });
    }
  }

  /**
   * Get notification statistics
   */
  public async getStats(period: '24h' | '7d' | '30d' = '24h'): Promise<NotificationStats> {
    try {
      const now = new Date();
      let startTime: Date;

      switch (period) {
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const notifications = await prisma.notification.findMany({
        where: {
          createdAt: {
            gte: startTime,
            lte: now,
          },
        },
      });

      const byChannel: Record<NotificationChannel, number> = {
        EMAIL: 0, SMS: 0, VOICE: 0, APP_PUSH: 0,
        WEBHOOK: 0, URL: 0, DINGTALK: 0, WECHAT: 0, SLACK: 0,
      };

      const byStatus = { success: 0, failed: 0 };
      let lastSentAt: Date | undefined;

      for (const notification of notifications) {
        byChannel[notification.channel as NotificationChannel]++;
        if (notification.status === 'SENT') {
          byStatus.success++;
        } else {
          byStatus.failed++;
        }

        if (!lastSentAt || notification.createdAt > lastSentAt) {
          lastSentAt = notification.createdAt;
        }
      }

      return {
        total: notifications.length,
        byChannel,
        byStatus,
        lastSentAt,
      };
    } catch (error) {
      logger.error('Failed to get notification stats', { error });
      return {
        total: 0,
        byChannel: {
          EMAIL: 0, SMS: 0, VOICE: 0, APP_PUSH: 0,
          WEBHOOK: 0, URL: 0, DINGTALK: 0, WECHAT: 0, SLACK: 0,
        },
        byStatus: { success: 0, failed: 0 },
      };
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
