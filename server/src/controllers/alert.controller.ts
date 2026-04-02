import { Request, Response } from 'express';
import { ApiResponse, AlertEvent } from '@synthetic-monitoring/shared';
import { prisma } from '../database/index.js';
import { alertService } from '../services/alert.service.js';
import { createAuditLog } from '../services/auth.service.js';
import { ZodError } from 'zod';
import { z } from 'zod';

// Validation schemas
const createAlertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['DOWN', 'RESPONSE_TIME', 'SSL_EXPIRY', 'CHANGE']),
  condition: z.record(z.unknown()),
  notificationChannels: z.array(z.enum(['EMAIL', 'SMS', 'VOICE', 'APP_PUSH', 'WEBHOOK', 'URL', 'DINGTALK', 'WECHAT', 'SLACK'])),
  recipients: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

const updateAlertRuleSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['DOWN', 'RESPONSE_TIME', 'SSL_EXPIRY', 'CHANGE']).optional(),
  condition: z.record(z.unknown()).optional(),
  notificationChannels: z.array(z.enum(['EMAIL', 'SMS', 'VOICE', 'APP_PUSH', 'WEBHOOK', 'URL', 'DINGTALK', 'WECHAT', 'SLACK'])).optional(),
  recipients: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/alerts
 * Get all alerts with pagination and filtering
 */
export async function getAllAlerts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    const acknowledged = req.query.acknowledged;
    const taskId = req.query.taskId as string;

    const where: Record<string, unknown> = {};

    // Filter by monitor ownership
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      const userMonitors = await prisma.monitor.findMany({
        where: { userId: req.user?.userId },
        select: { id: true },
      });
      where.taskId = { in: userMonitors.map((m) => m.id) };
    }

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    if (acknowledged !== undefined) {
      where.acknowledged = acknowledged === 'true';
    }

    if (taskId) {
      where.taskId = taskId;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          monitor: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { triggeredAt: 'desc' },
      }),
      prisma.alert.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        items: alerts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alerts' });
  }
}

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
export async function getAlertStats(req: Request, res: Response): Promise<void> {
  try {
    const taskId = req.query.taskId as string | undefined;
    const stats = await alertService.getStatistics(taskId);

    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alert statistics' });
  }
}

/**
 * GET /api/alerts/:id
 * Get alert by ID
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        monitor: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      const monitor = await prisma.monitor.findUnique({
        where: { id: alert.taskId },
      });
      if (monitor?.userId !== req.user?.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
    }

    const response: ApiResponse = { success: true, data: alert };
    res.json(response);
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alert' });
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      const monitor = await prisma.monitor.findUnique({
        where: { id: alert.taskId },
      });
      if (monitor?.userId !== req.user?.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'ACKNOWLEDGE_ALERT',
      resource: 'alert',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: updatedAlert };
    res.json(response);
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
}

/**
 * GET /api/alerts/rules
 * Get all alert rules (global view for admin)
 */
export async function getAllAlertRules(req: Request, res: Response): Promise<void> {
  try {
    const where: Record<string, unknown> = {};

    // Filter by user (for non-admin users)
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      const userMonitors = await prisma.monitor.findMany({
        where: { userId: req.user?.userId },
        select: { id: true },
      });
      where.monitorId = { in: userMonitors.map((m) => m.id) };
    }

    const rules = await prisma.alertRule.findMany({
      where,
      include: {
        monitor: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = { success: true, data: rules };
    res.json(response);
  } catch (error) {
    console.error('Get all alert rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to get all alert rules' });
  }
}

/**
 * POST /api/alerts/rules
 * Create a new global alert rule (admin only)
 */
export async function createGlobalAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const data = createAlertRuleSchema.parse(req.body);

    // For global rules, we associate with all user's monitors
    const userMonitors = await prisma.monitor.findMany({
      where: { userId: req.user?.userId },
      select: { id: true },
    });

    if (userMonitors.length === 0) {
      res.status(400).json({ success: false, error: 'No monitors available to associate with this rule' });
      return;
    }

    // Create rule for the first monitor (or create a system-wide rule)
    const rule = await prisma.alertRule.create({
      data: {
        monitorId: userMonitors[0].id,
        name: data.name,
        type: data.type,
        condition: data.condition,
        notificationChannels: data.notificationChannels,
        recipients: data.recipients || [],
        enabled: data.enabled,
      },
      include: {
        monitor: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_GLOBAL_ALERT_RULE',
      resource: 'alertRule',
      resourceId: rule.id,
      details: { ruleName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: rule };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Create global alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create global alert rule' });
  }
}

/**
 * GET /api/monitors/:monitorId/alert-rules
 * Get alert rules for a specific monitor
 */
export async function getAlertRulesByMonitorId(req: Request, res: Response): Promise<void> {
  try {
    const { monitorId } = req.params;

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const rules = await prisma.alertRule.findMany({
      where: { monitorId },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = { success: true, data: rules };
    res.json(response);
  } catch (error) {
    console.error('Get alert rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alert rules' });
  }
}

/**
 * POST /api/monitors/:monitorId/alert-rules
 * Create a new alert rule for a monitor
 */
export async function createAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const { monitorId } = req.params;
    const data = createAlertRuleSchema.parse(req.body);

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const rule = await prisma.alertRule.create({
      data: {
        monitorId,
        name: data.name,
        type: data.type,
        condition: data.condition,
        notificationChannels: data.notificationChannels,
        recipients: data.recipients || [],
        enabled: data.enabled,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_ALERT_RULE',
      resource: 'alertRule',
      resourceId: rule.id,
      details: { monitorId, ruleName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: rule };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Create alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert rule' });
  }
}

/**
 * PUT /api/alert-rules/:id
 * Update an alert rule
 */
export async function updateAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateAlertRuleSchema.parse(req.body);

    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!existingRule) {
      res.status(404).json({ success: false, error: 'Alert rule not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && existingRule.monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data,
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_ALERT_RULE',
      resource: 'alertRule',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: rule };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Update alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to update alert rule' });
  }
}

/**
 * DELETE /api/alert-rules/:id
 * Delete an alert rule
 */
export async function deleteAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!existingRule) {
      res.status(404).json({ success: false, error: 'Alert rule not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && existingRule.monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await prisma.alertRule.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'DELETE_ALERT_RULE',
      resource: 'alertRule',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Delete alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' });
  }
}

/**
 * PATCH /api/alert-rules/:id/toggle
 * Toggle alert rule enabled status
 */
export async function toggleAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!existingRule) {
      res.status(404).json({ success: false, error: 'Alert rule not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && existingRule.monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data: { enabled: !existingRule.enabled },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'TOGGLE_ALERT_RULE',
      resource: 'alertRule',
      resourceId: id,
      details: { enabled: rule.enabled },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: rule };
    res.json(response);
  } catch (error) {
    console.error('Toggle alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle alert rule' });
  }
}

/**
 * POST /api/alert-rules/:id/test
 * Test an alert rule by sending a test notification
 */
export async function testAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!rule) {
      res.status(404).json({ success: false, error: 'Alert rule not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && rule.monitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Create a test alert event
    const testAlert: AlertEvent = {
      id: `test_${Date.now()}`,
      taskId: rule.monitorId,
      taskName: rule.monitor.name,
      type: 'TEST',
      message: `Test notification for alert rule: ${rule.name}`,
      severity: 'INFO',
      timestamp: new Date(),
      acknowledged: false,
    };

    // Convert database rule to AlertRule type for the service
    const alertRule = {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      condition: rule.condition as Record<string, unknown>,
      notificationChannels: rule.notificationChannels,
      recipients: rule.recipients || [],
      enabled: true,
    };

    // Send test notification (without storing the alert)
    const results = await alertService['sendNotifications'](testAlert, alertRule);

    const response: ApiResponse = {
      success: true,
      data: {
        alert: testAlert,
        notificationResults: results,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Test alert rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to test alert rule' });
  }
}
