import { prisma } from '../database/index.js';
import { createLogger } from '../utils/logger.js';
import { emailService } from './email.service.js';

const logger = createLogger('report-service');

export interface ReportData {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;

  // Summary statistics
  totalMonitors: number;
  activeMonitors: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercent: number;
  avgResponseTime: number;

  // Monitor breakdown
  monitors: MonitorReportData[];

  // Alerts summary
  totalAlerts: number;
  alertsBySeverity: {
    INFO: number;
    WARNING: number;
    CRITICAL: number;
  };

  // Probe statistics
  probeStats: ProbeReportData[];
}

export interface MonitorReportData {
  id: string;
  name: string;
  type: string;
  totalChecks: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  uptimePercent: number;
  downtimeMinutes: number;
  alertsCount: number;
}

export interface ProbeReportData {
  id: string;
  name: string;
  region: string;
  checksExecuted: number;
  successRate: number;
  avgResponseTime: number;
  uptimePercent: number;
}

export interface ReportConfig {
  period: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  enabled: boolean;
  timezone?: string;
}

/**
 * Report Service - Generates periodic monitoring reports
 */
export class ReportService {
  /**
   * Generate a report for a specific period
   */
  public async generateReport(
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<ReportData> {
    logger.info('Generating report', { period, startDate, endDate });

    // Calculate time range
    const periodStart = this.normalizeDate(startDate, period);
    const periodEnd = this.normalizeDate(endDate, period);

    // Get all monitors
    const monitors = await prisma.monitor.findMany({
      where: {
        enabled: true,
      },
      include: {
        user: true,
      },
    });

    // Get all check results in period
    const checkResults = await prisma.checkResult.findMany({
      where: {
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Get all alerts in period
    const alerts = await prisma.alert.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Get all probes
    const probes = await prisma.probe.findMany();

    // Calculate overall statistics
    const totalChecks = checkResults.length;
    const successfulChecks = checkResults.filter(r => r.success).length;
    const failedChecks = totalChecks - successfulChecks;
    const uptimePercent = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const responseTimes = checkResults
      .filter(r => r.responseTime !== null && r.responseTime !== undefined)
      .map(r => r.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Generate per-monitor data
    const monitorReports: MonitorReportData[] = [];
    for (const monitor of monitors) {
      const monitorResults = checkResults.filter(r => r.monitorId === monitor.id);
      const monitorAlerts = alerts.filter(a => a.monitorId === monitor.id);

      const report = this.calculateMonitorStats(monitor, monitorResults, monitorAlerts);
      monitorReports.push(report);
    }

    // Generate probe statistics
    const probeReports: ProbeReportData[] = [];
    for (const probe of probes) {
      const probeResults = checkResults.filter(r => r.probeId === probe.id);
      const report = this.calculateProbeStats(probe, probeResults);
      probeReports.push(report);
    }

    // Calculate alerts by severity
    const alertsBySeverity = {
      INFO: alerts.filter(a => a.severity === 'INFO').length,
      WARNING: alerts.filter(a => a.severity === 'WARNING').length,
      CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    };

    const reportData: ReportData = {
      period,
      periodStart,
      periodEnd,
      generatedAt: new Date(),
      totalMonitors: monitors.length,
      activeMonitors: monitors.filter(m => m.status === 'ACTIVE').length,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercent,
      avgResponseTime,
      monitors: monitorReports,
      totalAlerts: alerts.length,
      alertsBySeverity,
      probeStats: probeReports,
    };

    // Save snapshot for each monitor
    await this.saveSnapshots(monitorReports, period, periodStart, periodEnd);

    logger.info('Report generated successfully', {
      period,
      totalMonitors: reportData.totalMonitors,
      totalChecks: reportData.totalChecks,
      uptimePercent: reportData.uptimePercent.toFixed(2),
    });

    return reportData;
  }

  /**
   * Calculate statistics for a single monitor
   */
  private calculateMonitorStats(
    monitor: any,
    results: any[],
    alerts: any[]
  ): MonitorReportData {
    const totalChecks = results.length;
    const successfulChecks = results.filter(r => r.success).length;
    const failedChecks = totalChecks - successfulChecks;
    const uptimePercent = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    const responseTimes = results
      .filter(r => r.responseTime !== null && r.responseTime !== undefined)
      .map(r => r.responseTime!);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // Calculate downtime minutes (estimate based on failed checks)
    const downtimeMinutes = failedChecks * (monitor.interval / 60);

    return {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      totalChecks,
      successRate: uptimePercent,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      uptimePercent,
      downtimeMinutes,
      alertsCount: alerts.length,
    };
  }

  /**
   * Calculate statistics for a probe
   */
  private calculateProbeStats(
    probe: any,
    results: any[]
  ): ProbeReportData {
    const checksExecuted = results.length;
    const successfulChecks = results.filter(r => r.success).length;
    const successRate = checksExecuted > 0 ? (successfulChecks / checksExecuted) * 100 : 0;

    const responseTimes = results
      .filter(r => r.responseTime !== null && r.responseTime !== undefined)
      .map(r => r.responseTime!);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Probe uptime is based on whether it was online during the period
    const uptimePercent = successRate; // Simplified - assumes probe online if checks succeeded

    return {
      id: probe.id,
      name: probe.name,
      region: probe.region || 'Unknown',
      checksExecuted,
      successRate,
      avgResponseTime,
      uptimePercent,
    };
  }

  /**
   * Normalize date to period boundary
   */
  private normalizeDate(date: Date, period: string): Date {
    const normalized = new Date(date);

    if (period === 'daily') {
      normalized.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      // Set to start of week (Monday)
      const day = normalized.getDay();
      const diff = normalized.getDate() - day + (day === 0 ? -6 : 1);
      normalized.setDate(diff);
      normalized.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      normalized.setDate(1);
      normalized.setHours(0, 0, 0, 0);
    }

    return normalized;
  }

  /**
   * Save report snapshots to database
   */
  private async saveSnapshots(
    monitorReports: MonitorReportData[],
    period: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    try {
      for (const report of monitorReports) {
        await prisma.monitorSnapshot.upsert({
          where: {
            monitorId_period_periodStart: {
              monitorId: report.id,
              period,
              periodStart,
            },
          },
          update: {
            totalChecks: report.totalChecks,
            successCount: Math.round(report.totalChecks * report.successRate / 100),
            failureCount: report.totalChecks - Math.round(report.totalChecks * report.successRate / 100),
            avgResponseTime: report.avgResponseTime,
            minResponseTime: report.minResponseTime,
            maxResponseTime: report.maxResponseTime,
            uptimePercent: report.uptimePercent,
          },
          create: {
            monitorId: report.id,
            period,
            periodStart,
            periodEnd,
            totalChecks: report.totalChecks,
            successCount: Math.round(report.totalChecks * report.successRate / 100),
            failureCount: report.totalChecks - Math.round(report.totalChecks * report.successRate / 100),
            avgResponseTime: report.avgResponseTime,
            minResponseTime: report.minResponseTime,
            maxResponseTime: report.maxResponseTime,
            uptimePercent: report.uptimePercent,
          },
        });
      }
      logger.debug('Snapshots saved successfully');
    } catch (error) {
      logger.error('Failed to save snapshots', { error });
    }
  }

  /**
   * Generate and send daily report via email
   */
  public async generateAndSendDailyReport(recipients: string[]): Promise<ReportData | null> {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const report = await this.generateReport('daily', yesterday, now);

      if (recipients.length > 0) {
        await this.sendReportEmail(report, recipients);
      }

      return report;
    } catch (error) {
      logger.error('Failed to generate daily report', { error });
      return null;
    }
  }

  /**
   * Generate and send weekly report via email
   */
  public async generateAndSendWeeklyReport(recipients: string[]): Promise<ReportData | null> {
    try {
      const now = new Date();
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const report = await this.generateReport('weekly', lastWeek, now);

      if (recipients.length > 0) {
        await this.sendReportEmail(report, recipients);
      }

      return report;
    } catch (error) {
      logger.error('Failed to generate weekly report', { error });
      return null;
    }
  }

  /**
   * Generate and send monthly report via email
   */
  public async generateAndSendMonthlyReport(recipients: string[]): Promise<ReportData | null> {
    try {
      const now = new Date();
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const report = await this.generateReport('monthly', lastMonth, now);

      if (recipients.length > 0) {
        await this.sendReportEmail(report, recipients);
      }

      return report;
    } catch (error) {
      logger.error('Failed to generate monthly report', { error });
      return null;
    }
  }

  /**
   * Send report via email
   */
  private async sendReportEmail(report: ReportData, recipients: string[]): Promise<boolean> {
    try {
      const subject = `监控报告 - ${report.period} (${this.formatDate(report.periodStart)} - ${this.formatDate(report.periodEnd)})`;

      const htmlContent = this.generateReportHTML(report);

      return await emailService.sendHTMLEmail(
        recipients,
        subject,
        htmlContent,
        true // isHtml
      );
    } catch (error) {
      logger.error('Failed to send report email', { error });
      return false;
    }
  }

  /**
   * Generate HTML email content for report
   */
  private generateReportHTML(report: ReportData): string {
    const periodLabels: Record<string, string> = {
      daily: '日报',
      weekly: '周报',
      monthly: '月报',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1890ff; color: white; padding: 20px; text-align: center; }
    .summary { display: flex; flex-wrap: wrap; margin: 20px 0; }
    .stat-card { background: #f5f5f5; padding: 15px; margin: 10px; border-radius: 8px; min-width: 150px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1890ff; }
    .stat-label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .uptime-good { color: #52c41a; }
    .uptime-warning { color: #faad14; }
    .uptime-bad { color: #ff4d4f; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>监控${periodLabels[report.period] || '报告'}</h1>
    <p>${this.formatDate(report.periodStart)} - ${this.formatDate(report.periodEnd)}</p>
  </div>

  <h2>总体概览</h2>
  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${report.totalMonitors}</div>
      <div class="stat-label">监控任务数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.activeMonitors}</div>
      <div class="stat-label">运行中</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.totalChecks.toLocaleString()}</div>
      <div class="stat-label">总检查次数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value ${report.uptimePercent >= 99 ? 'uptime-good' : report.uptimePercent >= 95 ? 'uptime-warning' : 'uptime-bad'}">${report.uptimePercent.toFixed(2)}%</div>
      <div class="stat-label">整体可用性</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.avgResponseTime.toFixed(0)}ms</div>
      <div class="stat-label">平均响应时间</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.totalAlerts}</div>
      <div class="stat-label">告警次数</div>
    </div>
  </div>

  <h2>告警统计</h2>
  <table>
    <tr>
      <th>INFO</th>
      <th>WARNING</th>
      <th>CRITICAL</th>
    </tr>
    <tr>
      <td>${report.alertsBySeverity.INFO}</td>
      <td>${report.alertsBySeverity.WARNING}</td>
      <td>${report.alertsBySeverity.CRITICAL}</td>
    </tr>
  </table>

  <h2>监控任务详情</h2>
  <table>
    <tr>
      <th>名称</th>
      <th>类型</th>
      <th>检查次数</th>
      <th>可用性</th>
      <th>平均响应</th>
      <th>告警数</th>
    </tr>
    ${report.monitors.slice(0, 20).map(m => `
    <tr>
      <td>${m.name}</td>
      <td>${m.type}</td>
      <td>${m.totalChecks}</td>
      <td class="${m.uptimePercent >= 99 ? 'uptime-good' : m.uptimePercent >= 95 ? 'uptime-warning' : 'uptime-bad'}">${m.uptimePercent.toFixed(2)}%</td>
      <td>${m.avgResponseTime.toFixed(0)}ms</td>
      <td>${m.alertsCount}</td>
    </tr>
    `).join('')}
  </table>
  ${report.monitors.length > 20 ? `<p>... 还有 ${report.monitors.length - 20} 个监控任务，请登录系统查看详情</p>` : ''}

  <div class="footer">
    <p>此报告由 DEM 用户体验监控系统自动生成</p>
    <p>发送时间：${this.formatDateTime(report.generatedAt)}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date with time
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN');
  }

  /**
   * Get report data for API response
   */
  public async getReportData(
    monitorId: string,
    period: 'daily' | 'weekly' | 'monthly',
    date: Date
  ): Promise<MonitorReportData | null> {
    try {
      const periodStart = this.normalizeDate(date, period);
      const periodEnd = new Date(periodStart);

      if (period === 'daily') {
        periodEnd.setDate(periodEnd.getDate() + 1);
      } else if (period === 'weekly') {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
      });

      if (!monitor) {
        return null;
      }

      const results = await prisma.checkResult.findMany({
        where: {
          monitorId,
          timestamp: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      const alerts = await prisma.alert.findMany({
        where: {
          monitorId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      return this.calculateMonitorStats(monitor, results, alerts);
    } catch (error) {
      logger.error('Failed to get report data', { error });
      return null;
    }
  }
}

// Singleton instance
export const reportService = new ReportService();
