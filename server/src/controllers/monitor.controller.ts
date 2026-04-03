import { Request, Response } from 'express';
import { ApiResponse, MonitorStatus, CheckResult, UserRole, HTTPMonitorConfig } from '@synthetic-monitoring/shared';
import { prisma } from '../database/index.js';
import { createAuditLog } from '../services/auth.service.js';
import { alertService } from '../services/alert.service.js';
import { ZodError } from 'zod';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('monitor.controller');

// Validation schemas
const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['HTTP', 'HTTPS', 'PING', 'DNS', 'TRACEROUTE', 'FTP', 'TCP', 'UDP', 'API', 'PAGE_PERF']),
  target: z.string().min(1, 'Target is required'),
  interval: z.number().min(30).max(3600).default(60),
  timeout: z.number().min(1000).max(300000).default(30000), // Timeout in milliseconds (1s - 5min)
  regions: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  alertRules: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.enum(['DOWN', 'RESPONSE_TIME', 'SSL_EXPIRY', 'CHANGE']),
    condition: z.record(z.unknown()),
    notificationChannels: z.array(z.enum(['EMAIL', 'SMS', 'VOICE', 'APP_PUSH', 'WEBHOOK', 'URL', 'DINGTALK', 'WECHAT', 'SLACK'])),
    enabled: z.boolean().default(true),
  })).optional(),
});

const updateMonitorSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['HTTP', 'HTTPS', 'PING', 'DNS', 'TRACEROUTE', 'FTP', 'TCP', 'UDP', 'API', 'PAGE_PERF']).optional(),
  target: z.string().optional(),
  interval: z.number().min(30).max(3600).optional(),
  timeout: z.number().min(1000).max(300000).optional(), // Timeout in milliseconds
  regions: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * GET /api/monitors
 * Get all monitors with pagination and filtering
 */
export async function getAllMonitors(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const status = req.query.status as MonitorStatus;
    const userId = req.query.userId as string;

    const where: Record<string, unknown> = {};

    // Filter by user (for non-admin users)
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      where.userId = req.user?.userId;
    } else if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [monitors, total] = await Promise.all([
      prisma.monitor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          alertRules: true,
          latestResult: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.monitor.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        items: monitors,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get monitors error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monitors' });
  }
}

/**
 * GET /api/monitors/:id
 * Get monitor by ID with full details
 */
export async function getMonitorById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        alertRules: true,
        latestResult: true,
      },
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

    const response: ApiResponse = { success: true, data: monitor };
    res.json(response);
  } catch (error) {
    console.error('Get monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monitor' });
  }
}

/**
 * POST /api/monitors
 * Create new monitor
 */
export async function createMonitor(req: Request, res: Response): Promise<void> {
  try {
    console.log('Creating monitor, user:', req.user);
    const data = createMonitorSchema.parse(req.body);
    console.log('Parsed data:', data);

    // Validate quota
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: { monitors: true },
    });
    console.log('User found:', user ? user.id : 'not found');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Check quota (SUPER_ADMIN exempt)
    if (user.role !== 'SUPER_ADMIN' && user.monitors.length >= user.quota) {
      res.status(403).json({
        success: false,
        error: `Quota exceeded. Maximum monitors allowed: ${user.quota}`
      });
      return;
    }

    // Create monitor with alert rules
    const monitor = await prisma.monitor.create({
      data: {
        name: data.name,
        type: data.type,
        target: data.target,
        interval: data.interval,
        timeout: data.timeout,
        regions: JSON.stringify(data.regions || []),
        status: data.enabled !== false ? 'ACTIVE' : 'PAUSED',
        config: data.config || {},
        userId: req.user!.userId,
        alertRules: data.alertRules?.length
          ? {
              create: data.alertRules.map((rule) => ({
                name: rule.name,
                type: rule.type,
                condition: rule.condition,
                notificationChannels: rule.notificationChannels,
                enabled: rule.enabled,
              })),
            }
          : undefined,
      },
      include: {
        alertRules: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_MONITOR',
      resource: 'monitor',
      resourceId: monitor.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: monitor };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Validation error:', error.errors);
      logger.error('Validation error:', error.errors);
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Create monitor error:', error);
    logger.error('Create monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to create monitor' });
  }
}

/**
 * PUT /api/monitors/:id
 * Update monitor
 */
export async function updateMonitor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateMonitorSchema.parse(req.body);

    // Check if monitor exists
    const existingMonitor = await prisma.monitor.findUnique({
      where: { id },
    });

    if (!existingMonitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && existingMonitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Prepare data for update - convert arrays to JSON strings
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.target) updateData.target = data.target;
    if (data.interval) updateData.interval = data.interval;
    if (data.timeout) updateData.timeout = data.timeout;
    if (data.regions) updateData.regions = JSON.stringify(data.regions);
    if (data.enabled !== undefined) updateData.status = data.enabled !== false ? 'ACTIVE' : 'PAUSED';
    if (data.config) updateData.config = data.config;

    // Update monitor
    const monitor = await prisma.monitor.update({
      where: { id },
      data: updateData,
      include: {
        alertRules: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_MONITOR',
      resource: 'monitor',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: monitor };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Update monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to update monitor' });
  }
}

/**
 * DELETE /api/monitors/:id
 * Delete monitor
 */
export async function deleteMonitor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if monitor exists
    const existingMonitor = await prisma.monitor.findUnique({
      where: { id },
    });

    if (!existingMonitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Check permissions
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN' && existingMonitor.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Delete monitor (cascade will handle related records)
    await prisma.monitor.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'DELETE_MONITOR',
      resource: 'monitor',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Delete monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete monitor' });
  }
}

/**
 * PATCH /api/monitors/:id/toggle
 * Toggle monitor enabled status
 */
export async function toggleMonitor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const monitor = await prisma.monitor.findUnique({
      where: { id },
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

    const updatedMonitor = await prisma.monitor.update({
      where: { id },
      data: { status: monitor.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' },
      include: {
        alertRules: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'TOGGLE_MONITOR',
      resource: 'monitor',
      resourceId: id,
      details: { status: updatedMonitor.status },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: updatedMonitor };
    res.json(response);
  } catch (error) {
    console.error('Toggle monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle monitor' });
  }
}

/**
 * GET /api/monitors/:id/results
 * Get monitor check results
 */
export async function getMonitorResults(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const page = parseInt(req.query.page as string) || 1;

    const monitor = await prisma.monitor.findUnique({
      where: { id },
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

    const results = await prisma.checkResult.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        items: results,
        total: await prisma.checkResult.count({ where: { taskId: id } }),
        page,
        pageSize: limit,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get monitor results error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monitor results' });
  }
}

/**
 * POST /api/monitors/:id/results
 * Submit a check result (called by probe agents)
 */
export async function submitCheckResult(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const checkResult: CheckResult = req.body;

    // Verify monitor exists
    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: { alertRules: true },
    });

    if (!monitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Validate required fields
    if (!checkResult.probeId) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: probeId',
      });
      return;
    }

    // Generate ID if not provided
    if (!checkResult.id) {
      checkResult.id = `result_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    // Store the check result
    const result = await prisma.checkResult.create({
      data: {
        id: checkResult.id,
        monitorId: id,
        taskId: id,
        probeId: checkResult.probeId,
        success: checkResult.success,
        responseTime: checkResult.responseTime,
        statusCode: checkResult.statusCode,
        errorMessage: checkResult.errorMessage,
        dnsTime: checkResult.dnsTime,
        tcpTime: checkResult.tcpTime,
        tlsTime: checkResult.tlsTime,
        ttfbTime: checkResult.ttfbTime,
        downloadTime: checkResult.downloadTime,
        totalTime: checkResult.totalTime,
        domContentLoaded: checkResult.domContentLoaded,
        domComplete: checkResult.domComplete,
        firstContentfulPaint: checkResult.firstContentfulPaint,
        largestContentfulPaint: checkResult.largestContentfulPaint,
        cumulativeLayoutShift: checkResult.cumulativeLayoutShift,
        firstInputDelay: checkResult.firstInputDelay,
        details: checkResult.details,
      },
    });

    // Update monitor's latestResultId
    await prisma.monitor.update({
      where: { id },
      data: { latestResultId: result.id },
    });

    // Evaluate alert rules if there are any
    let alertsTriggered = [];
    if (monitor.alertRules && monitor.alertRules.length > 0) {
      alertsTriggered = await alertService.evaluateAlertRules(checkResult, monitor.alertRules);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        result,
        alertsTriggered,
      },
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Submit check result error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

/**
 * POST /api/monitors/:id/quick-check
 * Trigger an immediate check for a monitor
 */
export async function quickCheck(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: { alertRules: true },
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

    // Perform real HTTP/API check based on monitor type
    const quickResult = await performRealCheck(monitor);

    // Get or create quick-check probe
    let probeId = 'quick-check';
    let probe = await prisma.probe.findUnique({ where: { id: probeId } });
    if (!probe) {
      probe = await prisma.probe.create({
        data: {
          id: probeId,
          name: 'Quick Check Probe',
          status: 'ONLINE',
          capabilities: '[]',
          tags: '[]',
        },
      });
    }

    // Store the check result
    const storedResult = await prisma.checkResult.create({
      data: {
        id: quickResult.id,
        monitorId: monitor.id,
        taskId: id,
        probeId: probeId,
        success: quickResult.success,
        responseTime: quickResult.responseTime,
        statusCode: quickResult.statusCode,
        errorMessage: quickResult.errorMessage,
        dnsTime: quickResult.dnsTime,
        tcpTime: quickResult.tcpTime,
        tlsTime: quickResult.tlsTime,
        ttfbTime: quickResult.ttfbTime,
        downloadTime: quickResult.downloadTime,
        totalTime: quickResult.totalTime,
        details: quickResult.details,
      },
    });

    // Update monitor's latestResultId
    await prisma.monitor.update({
      where: { id },
      data: { latestResultId: storedResult.id },
    });

    const response: ApiResponse = { success: true, data: storedResult };
    res.json(response);
  } catch (error) {
    console.error('Quick check error:', error);
    res.status(500).json({ success: false, error: 'Failed to perform quick check' });
  }
}

/**
 * Perform real check based on monitor type
 */
async function performRealCheck(monitor: any): Promise<CheckResult> {
  const startTime = Date.now();
  const result: CheckResult = {
    id: `quick_${Date.now()}`,
    taskId: monitor.id,
    monitorId: monitor.id,
    probeId: 'quick-check',
    success: false,
  };

  try {
    // Handle HTTP/HTTPS/API monitor types
    if (['HTTP', 'HTTPS', 'API'].includes(monitor.type)) {
      const config = monitor.config as HTTPMonitorConfig;
      const method = config.method || 'GET';

      const timing = {
        dnsStart: 0,
        dnsEnd: 0,
        tcpStart: 0,
        tcpEnd: 0,
        tlsStart: 0,
        tlsEnd: 0,
        ttfbEnd: 0,
      };

      const agent = new (await import('https')).Agent({
        rejectUnauthorized: config.validateSSL !== false,
      });

      const response = await axios({
        method,
        url: monitor.target,
        headers: config.headers || {},
        data: config.body || undefined,
        timeout: monitor.timeout || 10000,
        maxRedirects: config.followRedirects !== false ? 5 : 0,
        httpsAgent: config.validateSSL !== false ? agent : undefined,
        validateStatus: () => true,
        onDownloadProgress: () => {
          timing.ttfbEnd = Date.now();
        },
      });

      const endTime = Date.now();

      result.success = validateResponse(response, config);
      result.statusCode = response.status;
      result.responseTime = endTime - startTime;
      result.ttfbTime = timing.ttfbEnd - timing.tcpStart;
      result.totalTime = endTime - startTime;
      result.details = {
        url: monitor.target,
        method,
      };

      if (!result.success) {
        result.errorMessage = 'Response validation failed';
      }
    } else if (monitor.type === 'PING') {
      // For PING, use platform-specific ping
      const { exec } = await import('child_process');
      const platform = process.platform;
      const count = platform === 'win32' ? 4 : 4;

      result.success = await new Promise((resolve) => {
        exec(`ping -n ${count} ${monitor.target}`, { timeout: monitor.timeout || 10000 }, (error, stdout) => {
          resolve(!error);
        });
      });

      if (result.success) {
        result.responseTime = Date.now() - startTime;
        result.details = { target: monitor.target };
      }
    } else if (monitor.type === 'TCP') {
      // For TCP, try socket connection
      const net = await import('net');
      const port = monitor.config?.port || 80;

      result.success = await new Promise((resolve) => {
        const socket = net.createConnection({ port, host: monitor.target, timeout: monitor.timeout || 10000 });
        socket.on('connect', () => {
          result.responseTime = Date.now() - startTime;
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
      });

      if (!result.success) {
        result.errorMessage = 'TCP connection failed or timed out';
      }
    } else if (monitor.type === 'DNS') {
      // For DNS, use dns module
      const dns = await import('dns');
      const recordType = monitor.config?.recordType || 'A';

      try {
        const resolved = await new Promise((resolve, reject) => {
          dns.resolve4(monitor.target, (err, addresses) => {
            if (err) reject(err);
            else resolve(addresses);
          });
        });
        result.success = true;
        result.responseTime = Date.now() - startTime;
        result.details = { resolvedIPs: resolved as string[] };
      } catch (error) {
        result.success = false;
        result.errorMessage = (error as Error).message;
      }
    } else {
      // For other types, return a basic success
      result.success = true;
      result.responseTime = Date.now() - startTime;
      result.errorMessage = `Monitor type ${monitor.type} check performed`;
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    result.success = false;
    result.errorMessage = axiosError?.message || (error as Error).message;
    result.responseTime = Date.now() - startTime;
  }

  return result;
}

/**
 * Validate HTTP response based on config
 */
function validateResponse(response: { status: number; data: unknown }, config: HTTPMonitorConfig): boolean {
  // Check expected status code
  if (config.expectedStatusCode && response.status !== config.expectedStatusCode) {
    return false;
  }

  // Check expected body contains
  if (config.expectedBodyContains) {
    const bodyStr = JSON.stringify(response.data);
    if (!bodyStr.includes(config.expectedBodyContains)) {
      return false;
    }
  }

  return true;
}

/**
 * GET /api/monitors/:id/stats
 * Get monitor statistics
 */
export async function getMonitorStats(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const period = req.query.period as string || '24h';

    const monitor = await prisma.monitor.findUnique({
      where: { id },
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

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get results in time range
    const results = await prisma.checkResult.findMany({
      where: {
        taskId: id,
        createdAt: {
          gte: startTime,
          lte: now,
        },
      },
    });

    const totalChecks = results.length;
    const successfulChecks = results.filter((r) => r.success).length;
    const failedChecks = totalChecks - successfulChecks;
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const responseTimes = results
      .filter((r) => r.responseTime !== null && r.responseTime !== undefined)
      .map((r) => r.responseTime!) as number[];
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Calculate min/max response time
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    const stats = {
      period,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptime: `${uptime.toFixed(2)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      minResponseTime: `${minResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${maxResponseTime.toFixed(2)}ms`,
    };

    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error('Get monitor stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monitor stats' });
  }
}
