import { createLogger } from '../utils/logger.js';
import { prisma } from '../database/index.js';
import { io } from '../index.js';
import { MonitorStatus, MonitorType } from '@synthetic-monitoring/shared';
import { reportService } from './report.service.js';

const logger = createLogger('scheduler');

interface ScheduledTask {
  monitorId: string;
  interval: number;
  nextRun: number;
  running: boolean;
}

/**
 * Monitor Scheduler Service
 * Distributes monitoring tasks to probes based on interval and region
 */
export class SchedulerService {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private running: boolean = false;
  private readonly CHECK_INTERVAL = 5000; // Check every 5 seconds

  // Scheduled report jobs
  private reportJobs: Array<{
    type: 'daily' | 'weekly' | 'monthly';
    lastRun: number;
    interval: number; // ms
    recipients: string[];
  }> = [];

  /**
   * Start the scheduler
   */
  public async start(): Promise<void> {
    if (this.running) {
      logger.warn('Scheduler already running');
      return;
    }

    this.running = true;
    logger.info('Scheduler starting...');

    // Load all active monitors from database
    await this.loadActiveMonitors();

    // Setup scheduled report jobs
    this.setupReportJobs();

    // Start the main scheduler loop
    this.schedulerLoop();

    logger.info('Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  public async stop(): Promise<void> {
    this.running = false;
    logger.info('Scheduler stopping...');

    // Clear all scheduled tasks
    this.scheduledTasks.clear();

    logger.info('Scheduler stopped');
  }

  /**
   * Load active monitors from database
   */
  private async loadActiveMonitors(): Promise<void> {
    try {
      const monitors = await prisma.monitor.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          type: true,
          target: true,
          interval: true,
          timeout: true,
          regions: true,
          config: true,
        },
      });

      for (const monitor of monitors) {
        this.scheduleMonitor(monitor);
      }

      logger.info(`Loaded ${monitors.length} active monitors`);
    } catch (error) {
      logger.error('Failed to load active monitors:', error);
    }
  }

  /**
   * Setup scheduled report jobs
   */
  private setupReportJobs(): void {
    // Default report recipients - in production, load from user preferences
    const defaultRecipients = [process.env.REPORT_EMAIL || 'admin@example.com'];

    // Daily report - every day at 6 AM
    this.reportJobs.push({
      type: 'daily',
      lastRun: 0,
      interval: 24 * 60 * 60 * 1000, // 24 hours
      recipients: defaultRecipients,
    });

    // Weekly report - every Monday at 7 AM
    this.reportJobs.push({
      type: 'weekly',
      lastRun: 0,
      interval: 7 * 24 * 60 * 60 * 1000, // 7 days
      recipients: defaultRecipients,
    });

    // Monthly report - 1st of each month at 8 AM
    this.reportJobs.push({
      type: 'monthly',
      lastRun: 0,
      interval: 30 * 24 * 60 * 60 * 1000, // ~30 days
      recipients: defaultRecipients,
    });

    logger.info(`Setup ${this.reportJobs.length} scheduled report jobs`);
  }

  /**
   * Check and run scheduled report jobs
   */
  private async checkReportJobs(): Promise<void> {
    const now = Date.now();
    const nowDate = new Date();

    for (const job of this.reportJobs) {
      // Check if enough time has passed since last run
      if (now - job.lastRun < job.interval) {
        continue;
      }

      // Check if it's the right time to run
      const shouldRun = this.shouldRunReport(job.type, nowDate);
      if (!shouldRun) {
        continue;
      }

      // Run the report job
      logger.info(`Running scheduled ${job.type} report`);
      await this.runReportJob(job);
      job.lastRun = now;
    }
  }

  /**
   * Check if a report should run at the given time
   */
  private shouldRunReport(type: string, date: Date): boolean {
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday
    const dayOfMonth = date.getDate();

    switch (type) {
      case 'daily':
        // Run at 6 AM
        return hour === 6;
      case 'weekly':
        // Run at 7 AM on Monday
        return dayOfWeek === 1 && hour === 7;
      case 'monthly':
        // Run at 8 AM on 1st of month
        return dayOfMonth === 1 && hour === 8;
      default:
        return false;
    }
  }

  /**
   * Run a report job
   */
  private async runReportJob(job: {
    type: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  }): Promise<void> {
    try {
      let report;

      switch (job.type) {
        case 'daily':
          report = await reportService.generateAndSendDailyReport(job.recipients);
          break;
        case 'weekly':
          report = await reportService.generateAndSendWeeklyReport(job.recipients);
          break;
        case 'monthly':
          report = await reportService.generateAndSendMonthlyReport(job.recipients);
          break;
      }

      if (report) {
        logger.info(`${job.type} report generated and sent`, {
          monitors: report.totalMonitors,
          checks: report.totalChecks,
          uptime: report.uptimePercent.toFixed(2),
        });
      }
    } catch (error) {
      logger.error(`Failed to run ${job.type} report:`, error);
    }
  }

  /**
   * Schedule a monitor for execution
   */
  private scheduleMonitor(monitor: {
    id: string;
    interval: number;
    [key: string]: unknown;
  }): void {
    const task: ScheduledTask = {
      monitorId: monitor.id,
      interval: monitor.interval * 1000, // Convert to ms
      nextRun: Date.now(),
      running: false,
    };

    this.scheduledTasks.set(monitor.id, task);
    logger.debug(`Scheduled monitor: ${monitor.id} (interval: ${monitor.interval}s)`);
  }

  /**
   * Main scheduler loop
   */
  private async schedulerLoop(): Promise<void> {
    const loop = async () => {
      if (!this.running) return;

      try {
        // Check report jobs
        await this.checkReportJobs();

        const now = Date.now();
        const promises: Promise<void>[] = [];

        for (const [monitorId, task] of this.scheduledTasks.entries()) {
          // Skip if currently running
          if (task.running) continue;

          // Check if it's time to run
          if (now >= task.nextRun) {
            task.running = true;
            promises.push(this.executeMonitor(monitorId));
          }
        }

        await Promise.all(promises);
      } catch (error) {
        logger.error('Scheduler loop error:', error);
      }

      // Schedule next check
      setTimeout(loop, this.CHECK_INTERVAL);
    };

    loop();
  }

  /**
   * Execute a monitor task - distribute to probes
   */
  private async executeMonitor(monitorId: string): Promise<void> {
    try {
      // Get monitor details
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: {
          id: true,
          name: true,
          type: true,
          target: true,
          timeout: true,
          regions: true,
          config: true,
          userId: true,
        },
      });

      if (!monitor) {
        this.scheduledTasks.delete(monitorId);
        return;
      }

      // Parse regions from JSON string
      const regions = JSON.parse(monitor.regions as string || '[]') as string[];

      // Get available probes for the target regions
      const probes = await prisma.probe.findMany({
        where: {
          status: 'ONLINE',
          ...(regions && regions.length > 0
            ? { region: { in: regions } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          region: true,
        },
      });

      if (probes.length === 0) {
        logger.warn(`No available probes for monitor: ${monitorId}`);
        // Mark as error if no probes available
        await this.updateMonitorStatus(monitorId, 'ERROR');
        this.completeTask(monitorId);
        return;
      }

      // Create task payload
      const taskPayload = {
        taskId: monitor.id,
        taskType: monitor.type,
        target: monitor.target,
        timeout: monitor.timeout,
        config: monitor.config,
        timestamp: new Date().toISOString(),
      };

      // Distribute task to probes
      const emitPromises = probes.map((probe) => {
        return new Promise<void>((resolve) => {
          const probeSocket = io.sockets.sockets.get(
            Array.from(io.sockets.sockets.values()).find(
              (s) => s.data?.probeId === probe.id
            )?.id || ''
          );

          if (probeSocket && probeSocket.connected) {
            probeSocket.emit('probe:task', taskPayload, (ack: unknown) => {
              logger.debug(`Task ack from probe ${probe.name}:`, ack);
              resolve();
            });
          } else {
            // Probe not connected via WebSocket, task will be picked up on reconnect
            logger.debug(`Probe ${probe.name} not connected, task queued`);
            resolve();
          }
        });
      });

      await Promise.all(emitPromises);
      logger.debug(`Task ${monitorId} distributed to ${probes.length} probes`);

      // Update last check time
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastCheckAt: new Date() },
      });

      this.completeTask(monitorId);
    } catch (error) {
      logger.error(`Failed to execute monitor ${monitorId}:`, error);
      this.completeTask(monitorId);
    }
  }

  /**
   * Mark a task as complete and schedule next run
   */
  private completeTask(monitorId: string): void {
    const task = this.scheduledTasks.get(monitorId);
    if (task) {
      task.running = false;
      task.nextRun = Date.now() + task.interval;
    }
  }

  /**
   * Update monitor status
   */
  private async updateMonitorStatus(
    monitorId: string,
    status: MonitorStatus
  ): Promise<void> {
    try {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { status },
      });
    } catch (error) {
      logger.error(`Failed to update monitor status: ${monitorId}`, error);
    }
  }

  /**
   * Add a new monitor to the scheduler
   */
  public async addMonitor(monitorId: string): Promise<void> {
    try {
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: {
          id: true,
          interval: true,
          enabled: true,
          status: true,
        },
      });

      if (
        monitor &&
        monitor.enabled &&
        monitor.status === 'ACTIVE' &&
        !this.scheduledTasks.has(monitorId)
      ) {
        this.scheduleMonitor(monitor);
        logger.info(`Added monitor to scheduler: ${monitorId}`);
      }
    } catch (error) {
      logger.error(`Failed to add monitor: ${monitorId}`, error);
    }
  }

  /**
   * Remove a monitor from the scheduler
   */
  public async removeMonitor(monitorId: string): Promise<void> {
    this.scheduledTasks.delete(monitorId);
    logger.info(`Removed monitor from scheduler: ${monitorId}`);
  }

  /**
   * Reschedule a monitor (e.g., after update)
   */
  public async rescheduleMonitor(monitorId: string): Promise<void> {
    this.scheduledTasks.delete(monitorId);
    await this.addMonitor(monitorId);
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    totalTasks: number;
    runningTasks: number;
    pendingTasks: number;
  } {
    const tasks = Array.from(this.scheduledTasks.values());
    return {
      totalTasks: tasks.length,
      runningTasks: tasks.filter((t) => t.running).length,
      pendingTasks: tasks.filter((t) => !t.running).length,
    };
  }
}

// Singleton instance
export const schedulerService = new SchedulerService();
