import { CheckResult, AlertRule, AlertCondition, AlertEvent } from '@synthetic-monitoring/shared';
import { emailService } from './email.service.js';
import { createLogger } from '../utils/logger.js';
import { prisma } from '../database/index.js';

const logger = createLogger('alert-service');

export interface AlertEvaluationResult {
  triggered: boolean;
  alert?: AlertEvent;
  reason?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  recipient: string;
  error?: string;
}

export interface AlertStatistics {
  total: number;
  bySeverity: {
    INFO: number;
    WARNING: number;
    CRITICAL: number;
  };
  byCondition: Record<string, number>;
  lastTriggered?: Date;
}

/**
 * Alert Service - Evaluates alert rules and sends notifications
 */
export class AlertService {
  private consecutiveFailures: Map<string, number> = new Map();
  private previousCheckResults: Map<string, CheckResult> = new Map();
  private readonly MAX_HISTORY = 1000;

  // Alert compression - track last alert time per rule
  private lastAlertTime: Map<string, number> = new Map();
  private compressedAlerts: Map<string, AlertEvent[]> = new Map();

  /**
   * Evaluate alert rules based on check results
   */
  public async evaluateAlertRules(
    checkResult: CheckResult,
    alertRules: AlertRule[]
  ): Promise<AlertEvaluationResult[]> {
    const results: AlertEvaluationResult[] = [];

    for (const rule of alertRules) {
      if (!rule.enabled) {
        continue;
      }

      const evaluationResult = await this.evaluateRule(checkResult, rule);
      if (evaluationResult.triggered && evaluationResult.alert) {
        results.push(evaluationResult);

        // Store the alert in database
        await this.saveAlert(evaluationResult.alert, rule);

        // Send notifications
        await this.sendNotifications(evaluationResult.alert, rule);
      }
    }

    return results;
  }

  /**
   * Save alert to database
   */
  private async saveAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          id: alert.id,
          taskId: alert.taskId,
          ruleId: rule.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          triggeredAt: alert.timestamp,
          acknowledged: alert.acknowledged,
        },
      });
      logger.info('Alert saved to database', { alertId: alert.id, taskId: alert.taskId });
    } catch (error) {
      logger.error('Failed to save alert to database', { error, alertId: alert.id });
    }
  }

  /**
   * Send notifications via configured channels
   */
  private async sendNotifications(
    alert: AlertEvent,
    rule: AlertRule
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Update last alert time for compression
    if (rule.compressionEnabled) {
      this.lastAlertTime.set(rule.id, Date.now());
    }

    for (let i = 0; i < rule.notificationChannels.length; i++) {
      const channel = rule.notificationChannels[i];
      // Recipients would be stored in alert rule configuration
      // For now, skip actual sending if no recipient configured
      const recipient = (rule as Record<string, unknown>).recipients?.[i] as string | undefined;

      if (!recipient && channel !== 'WEBHOOK' && channel !== 'URL') {
        continue;
      }

      try {
        let success = false;
        let error: string | undefined;

        switch (channel) {
          case 'EMAIL':
            success = await this.sendEmailNotification(alert, recipient!);
            break;
          case 'WEBHOOK':
            success = await this.sendWebhookNotification(alert, recipient || (rule as Record<string, unknown>).webhookUrl as string);
            break;
          case 'URL':
            success = await this.sendURLCallbackNotification(alert, recipient || (rule as Record<string, unknown>).callbackUrl as string);
            break;
          case 'SMS':
            // SMS not implemented yet
            success = false;
            error = 'SMS notifications not implemented';
            break;
          case 'VOICE':
            success = false;
            error = 'Voice calls not implemented';
            break;
          case 'APP_PUSH':
            success = false;
            error = 'Push notifications not implemented';
            break;
          case 'DINGTALK':
          case 'WECHAT':
          case 'SLACK':
            success = await this.sendIntegrationNotification(alert, channel);
            break;
          default:
            error = `Unknown channel: ${channel}`;
        }

        results.push({ success, channel, recipient: recipient || 'N/A', error });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ success: false, channel, recipient: recipient || 'N/A', error: errorMessage });
      }
    }

    return results;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: AlertEvent, recipient: string): Promise<boolean> {
    return emailService.sendAlertEmail(
      [recipient],
      alert.taskName,
      alert.taskId,
      alert.type,
      alert.message,
      alert.severity,
      alert.type,
      process.env.DASHBOARD_URL || '#'
    );
  }

  /**
   * Send webhook notification (HTTP POST)
   */
  private async sendWebhookNotification(alert: AlertEvent, webhookUrl: string): Promise<boolean> {
    if (!webhookUrl) {
      logger.warn('Webhook URL not configured');
      return false;
    }

    try {
      const payload = {
        alert: {
          id: alert.id,
          taskId: alert.taskId,
          taskName: alert.taskName,
          type: alert.type,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp.toISOString(),
        },
        triggeredAt: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Webhook notification failed', {
          url: webhookUrl,
          status: response.status,
          alertId: alert.id,
        });
        return false;
      }

      logger.info('Webhook notification sent', { url: webhookUrl, alertId: alert.id });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook notification error', { error: errorMessage, url: webhookUrl });
      return false;
    }
  }

  /**
   * Send URL callback notification
   */
  private async sendURLCallbackNotification(alert: AlertEvent, callbackUrl: string): Promise<boolean> {
    if (!callbackUrl) {
      logger.warn('Callback URL not configured');
      return false;
    }

    try {
      // URL callback sends alert info as query parameters
      const url = new URL(callbackUrl);
      url.searchParams.set('alertId', alert.id);
      url.searchParams.set('taskId', alert.taskId);
      url.searchParams.set('type', alert.type);
      url.searchParams.set('severity', alert.severity);
      url.searchParams.set('message', alert.message);
      url.searchParams.set('timestamp', alert.timestamp.toISOString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn('URL callback notification failed', {
          url: callbackUrl,
          status: response.status,
          alertId: alert.id,
        });
        return false;
      }

      logger.info('URL callback notification sent', { url: callbackUrl, alertId: alert.id });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('URL callback notification error', { error: errorMessage, url: callbackUrl });
      return false;
    }
  }

  /**
   * Send integration notification (DingTalk, WeChat, Slack)
   */
  private async sendIntegrationNotification(
    alert: AlertEvent,
    channel: 'DINGTALK' | 'WECHAT' | 'SLACK'
  ): Promise<boolean> {
    // Integration webhooks would be configured in the database
    // For now, log that this would be sent
    logger.info(`${channel} notification queued`, { alertId: alert.id, channel });
    return true;
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(
    checkResult: CheckResult,
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const { condition } = rule;

    // Check compression window - skip if within cooldown period
    if (rule.compressionEnabled) {
      const now = Date.now();
      const lastAlert = this.lastAlertTime.get(rule.id);
      const windowMs = (rule.compressionWindow || 300) * 1000; // Convert to ms

      if (lastAlert && now - lastAlert < windowMs) {
        // Within compression window - store for later batch sending
        const suppressedAlert: AlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          taskId: checkResult.taskId,
          taskName: await this.getTaskName(checkResult.taskId),
          type: condition.type as any,
          message: `Alert suppressed (compression window active)`,
          severity: 'INFO',
          timestamp: new Date(),
          acknowledged: false,
        };

        // Store in compression buffer
        if (!this.compressedAlerts.has(rule.id)) {
          this.compressedAlerts.set(rule.id, []);
        }
        this.compressedAlerts.get(rule.id)!.push(suppressedAlert);

        logger.debug('Alert suppressed due to compression window', {
          ruleId: rule.id,
          ruleName: rule.name,
          timeSinceLastAlert: now - lastAlert,
          windowMs,
          bufferedCount: this.compressedAlerts.get(rule.id)?.length,
        });

        return { triggered: false, reason: 'Within compression window (stored for batch)' };
      } else if (lastAlert && now - lastAlert >= windowMs) {
        // Compression window expired - flush any buffered alerts
        await this.flushCompressedAlerts(rule.id, rule);
      }
    }

    switch (condition.type) {
      case 'DOWN':
        return this.evaluateDownCondition(checkResult, rule, condition);
      case 'RESPONSE_TIME':
        return this.evaluateResponseTimeCondition(checkResult, rule, condition);
      case 'SSL_EXPIRY':
        return this.evaluateSSLExpiryCondition(checkResult, rule, condition);
      case 'CHANGE':
        return this.evaluateChangeCondition(checkResult, rule, condition);
      default:
        return { triggered: false, reason: `Unknown condition type: ${(condition as { type: string }).type}` };
    }
  }

  /**
   * Evaluate DOWN condition - After N consecutive failures
   */
  private async evaluateDownCondition(
    checkResult: CheckResult,
    rule: AlertRule,
    condition: { type: 'DOWN'; threshold: number }
  ): Promise<AlertEvaluationResult> {
    const taskId = checkResult.taskId;

    if (!checkResult.success) {
      const currentFailures = (this.consecutiveFailures.get(taskId) || 0) + 1;
      this.consecutiveFailures.set(taskId, currentFailures);

      if (currentFailures >= condition.threshold) {
        const alert: AlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          taskId,
          taskName: await this.getTaskName(taskId),
          type: 'DOWN',
          message: `Service is DOWN after ${currentFailures} consecutive failure(s). ${checkResult.errorMessage || ''}`,
          severity: this.getSeverityForDown(currentFailures, condition.threshold),
          timestamp: new Date(),
          acknowledged: false,
        };

        // Reset failure count after triggering alert
        this.consecutiveFailures.set(taskId, 0);

        return { triggered: true, alert, reason: `Consecutive failures (${currentFailures}) reached threshold (${condition.threshold})` };
      }

      return { triggered: false, reason: `Consecutive failures (${currentFailures}) below threshold (${condition.threshold})` };
    } else {
      // Reset on success
      this.consecutiveFailures.set(taskId, 0);
      return { triggered: false, reason: 'Check succeeded, reset failure counter' };
    }
  }

  /**
   * Evaluate RESPONSE_TIME condition - When response time exceeds threshold
   */
  private async evaluateResponseTimeCondition(
    checkResult: CheckResult,
    rule: AlertRule,
    condition: { type: 'RESPONSE_TIME'; operator: '>' | '<'; threshold: number }
  ): Promise<AlertEvaluationResult> {
    if (checkResult.responseTime === undefined) {
      return { triggered: false, reason: 'No response time data available' };
    }

    const { operator, threshold } = condition;
    const responseTime = checkResult.responseTime;
    let triggered = false;

    if (operator === '>' && responseTime > threshold) {
      triggered = true;
    } else if (operator === '<' && responseTime < threshold) {
      triggered = true;
    }

    if (triggered) {
      const alert: AlertEvent = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        taskId: checkResult.taskId,
        taskName: await this.getTaskName(checkResult.taskId),
        type: 'RESPONSE_TIME',
        message: `Response time ${responseTime}ms ${operator === '>' ? 'exceeds' : 'is below'} threshold of ${threshold}ms`,
        severity: this.getSeverityForResponseTime(responseTime, threshold),
        timestamp: new Date(),
        acknowledged: false,
      };

      return {
        triggered: true,
        alert,
        reason: `Response time ${responseTime}ms ${operator} ${threshold}ms`,
      };
    }

    return { triggered: false, reason: `Response time ${responseTime}ms within acceptable range` };
  }

  /**
   * Evaluate SSL_EXPIRY condition - When SSL certificate is expiring soon
   */
  private async evaluateSSLExpiryCondition(
    checkResult: CheckResult,
    rule: AlertRule,
    condition: { type: 'SSL_EXPIRY'; daysBefore: number }
  ): Promise<AlertEvaluationResult> {
    // SSL expiry info should be in check details
    const sslExpiryDate = (checkResult.details as Record<string, unknown>)?.sslExpiryDate as Date | undefined;
    const sslExpiryTimestamp = (checkResult.details as Record<string, unknown>)?.sslExpiryTimestamp as number | undefined;

    if (!sslExpiryDate && !sslExpiryTimestamp) {
      return { triggered: false, reason: 'No SSL certificate information available' };
    }

    const expiryDate = sslExpiryDate || new Date(sslExpiryTimestamp!);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= condition.daysBefore && daysUntilExpiry >= 0) {
      const severity: 'INFO' | 'WARNING' | 'CRITICAL' =
        daysUntilExpiry <= 3 ? 'CRITICAL' : daysUntilExpiry <= 7 ? 'WARNING' : 'INFO';

      const alert: AlertEvent = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        taskId: checkResult.taskId,
        taskName: await this.getTaskName(checkResult.taskId),
        type: 'SSL_EXPIRY',
        message: `SSL certificate will expire in ${daysUntilExpiry} day(s) on ${expiryDate.toISOString().split('T')[0]}`,
        severity,
        timestamp: new Date(),
        acknowledged: false,
      };

      return {
        triggered: true,
        alert,
        reason: `SSL certificate expires in ${daysUntilExpiry} days (threshold: ${condition.daysBefore} days)`,
      };
    }

    if (daysUntilExpiry < 0) {
      const alert: AlertEvent = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        taskId: checkResult.taskId,
        taskName: await this.getTaskName(checkResult.taskId),
        type: 'SSL_EXPIRY',
        message: `SSL certificate has expired (expired on ${expiryDate.toISOString().split('T')[0]})`,
        severity: 'CRITICAL',
        timestamp: new Date(),
        acknowledged: false,
      };

      return {
        triggered: true,
        alert,
        reason: 'SSL certificate has expired',
      };
    }

    return { triggered: false, reason: `SSL certificate valid for ${daysUntilExpiry} days` };
  }

  /**
   * Evaluate CHANGE condition - When content changes
   */
  private async evaluateChangeCondition(
    checkResult: CheckResult,
    rule: AlertRule,
    condition: { type: 'CHANGE'; field: string }
  ): Promise<AlertEvaluationResult> {
    const taskId = checkResult.taskId;
    const previousResult = this.previousCheckResults.get(taskId);

    // Store current result for next comparison
    this.previousCheckResults.set(taskId, checkResult);

    if (!previousResult) {
      return { triggered: false, reason: 'No previous check result for comparison' };
    }

    const { field } = condition;
    let currentValue: unknown;
    let previousValue: unknown;

    // Get field values based on field type
    switch (field) {
      case 'body':
      case 'bodyContent':
        currentValue = checkResult.details?.bodySize;
        previousValue = previousResult.details?.bodySize;
        break;
      case 'statusCode':
        currentValue = checkResult.statusCode;
        previousValue = previousResult.statusCode;
        break;
      case 'headers':
        currentValue = JSON.stringify(checkResult.details?.headers);
        previousValue = JSON.stringify(previousResult.details?.headers);
        break;
      case 'content':
        currentValue = (checkResult.details as Record<string, unknown>)?.contentHash;
        previousValue = (previousResult.details as Record<string, unknown>)?.contentHash;
        break;
      default:
        currentValue = (checkResult.details as Record<string, unknown>)?.[field];
        previousValue = (previousResult.details as Record<string, unknown>)?.[field];
    }

    const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(previousValue);

    if (hasChanged) {
      const alert: AlertEvent = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        taskId,
        taskName: await this.getTaskName(taskId),
        type: 'CHANGE',
        message: `Content change detected in ${field}: previous value differs from current value`,
        severity: 'WARNING',
        timestamp: new Date(),
        acknowledged: false,
      };

      return {
        triggered: true,
        alert,
        reason: `Change detected in field '${field}'`,
      };
    }

    return { triggered: false, reason: `No change detected in field '${field}'` };
  }

  /**
   * Get task name from ID (fetch from database)
   */
  private async getTaskName(taskId: string): Promise<string> {
    try {
      const monitor = await prisma.monitor.findUnique({
        where: { id: taskId },
        select: { name: true },
      });
      return monitor?.name || `Task ${taskId}`;
    } catch (error) {
      logger.error('Failed to get task name', { taskId, error });
      return `Task ${taskId}`;
    }
  }

  /**
   * Get alert statistics from database
   */
  public async getStatistics(taskId?: string): Promise<AlertStatistics> {
    try {
      const where: Record<string, unknown> = {};
      if (taskId) {
        where.taskId = taskId;
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: this.MAX_HISTORY,
      });

      const bySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
      const byCondition: Record<string, number> = {};
      let lastTriggered: Date | undefined;

      for (const alert of alerts) {
        bySeverity[alert.severity]++;
        byCondition[alert.type] = (byCondition[alert.type] || 0) + 1;

        if (!lastTriggered || alert.triggeredAt > lastTriggered) {
          lastTriggered = alert.triggeredAt;
        }
      }

      return {
        total: alerts.length,
        bySeverity,
        byCondition,
        lastTriggered,
      };
    } catch (error) {
      logger.error('Failed to get alert statistics', { error });
      return { total: 0, bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 }, byCondition: {} };
    }
  }

  /**
   * Get all alerts from database
   */
  public async getAllAlerts(taskId?: string, limit: number = 100): Promise<AlertEvent[]> {
    try {
      const where: Record<string, unknown> = {};
      if (taskId) {
        where.taskId = taskId;
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: limit,
      });

      return alerts.map((alert) => ({
        id: alert.id,
        taskId: alert.taskId,
        taskName: this.getTaskNameSync(alert.taskId),
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.triggeredAt,
        acknowledged: alert.acknowledged,
      }));
    } catch (error) {
      logger.error('Failed to get alerts', { error });
      return [];
    }
  }

  /**
   * Get alert by ID from database
   */
  public async getAlertById(id: string): Promise<AlertEvent | null> {
    try {
      const alert = await prisma.alert.findUnique({
        where: { id },
      });

      if (!alert) {
        return null;
      }

      return {
        id: alert.id,
        taskId: alert.taskId,
        taskName: await this.getTaskName(alert.taskId),
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.triggeredAt,
        acknowledged: alert.acknowledged,
      };
    } catch (error) {
      logger.error('Failed to get alert by ID', { id, error });
      return null;
    }
  }

  /**
   * Acknowledge an alert in database
   */
  public async acknowledgeAlert(id: string): Promise<AlertEvent | null> {
    try {
      const alert = await prisma.alert.update({
        where: { id },
        data: { acknowledged: true },
      });

      return {
        id: alert.id,
        taskId: alert.taskId,
        taskName: await this.getTaskName(alert.taskId),
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.triggeredAt,
        acknowledged: alert.acknowledged,
      };
    } catch (error) {
      logger.error('Failed to acknowledge alert', { id, error });
      return null;
    }
  }

  /**
   * Flush compressed alerts - send batched summary after compression window
   */
  public async flushCompressedAlerts(ruleId: string, rule: AlertRule): Promise<void> {
    const alerts = this.compressedAlerts.get(ruleId);
    if (!alerts || alerts.length === 0) {
      return;
    }

    // Create summary alert
    const summaryAlert: AlertEvent = {
      id: `alert_summary_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      taskId: alerts[0].taskId,
      taskName: alerts[0].taskName,
      type: 'DOWN',
      message: `Summary: ${alerts.length} alerts suppressed during compression window. First: "${alerts[0].message}"`,
      severity: alerts[0].severity,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Send summary notification
    await this.sendNotifications(summaryAlert, rule);

    // Clear compressed alerts
    this.compressedAlerts.delete(ruleId);

    logger.info('Flushed compressed alerts', {
      ruleId,
      suppressedCount: alerts.length,
    });
  }

  /**
   * Reset consecutive failures for a task
   */
  public resetFailures(taskId: string): void {
    this.consecutiveFailures.set(taskId, 0);
  }

  /**
   * Get recent alert history from database
   */
  public async getHistory(taskId?: string, limit: number = 100): Promise<AlertEvent[]> {
    return this.getAllAlerts(taskId, limit);
  }

  /**
   * Get severity for DOWN condition based on failure count
   */
  private getSeverityForDown(failures: number, threshold: number): 'INFO' | 'WARNING' | 'CRITICAL' {
    if (failures >= threshold * 2) {
      return 'CRITICAL';
    }
    if (failures >= threshold * 1.5) {
      return 'WARNING';
    }
    return 'WARNING';
  }

  /**
   * Get severity for RESPONSE_TIME condition
   */
  private getSeverityForResponseTime(responseTime: number, threshold: number): 'INFO' | 'WARNING' | 'CRITICAL' {
    const ratio = responseTime / threshold;
    if (ratio >= 3) {
      return 'CRITICAL';
    }
    if (ratio >= 2) {
      return 'WARNING';
    }
    return 'INFO';
  }

  /**
   * Get task name synchronously (fallback)
   */
  private getTaskNameSync(taskId: string): string {
    return `Task ${taskId}`;
  }
}

// Singleton instance
export const alertService = new AlertService();
