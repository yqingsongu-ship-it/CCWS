import { MonitorTask, CheckResult, HTTPMonitor, PingMonitor, DNSMonitor, TCPMonitor, TraceRouteMonitor, UDPMonitor, FTPMonitor } from '@synthetic-monitoring/shared';
import { createLogger } from '../utils/logger.js';
import { HTTPMonitorWorker } from './http.monitor.js';
import { PingMonitorWorker } from './ping.monitor.js';
import { DNSMonitorWorker } from './dns.monitor.js';
import { TCPMonitorWorker } from './tcp.monitor.js';
import { TraceRouteMonitorWorker } from './traceroute.monitor.js';
import { UDPMonitorWorker } from './udp.monitor.js';
import { FTPMonitorWorker } from './ftp.monitor.js';

const logger = createLogger('monitor-manager');

type ResultCallback = (result: CheckResult) => void;

export class MonitorManager {
  private tasks: Map<string, MonitorTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private resultCallback: ResultCallback | null = null;

  // Monitor workers
  private httpWorker: HTTPMonitorWorker;
  private pingWorker: PingMonitorWorker;
  private dnsWorker: DNSMonitorWorker;
  private tcpWorker: TCPMonitorWorker;
  private tracerouteWorker: TraceRouteMonitorWorker;
  private udpWorker: UDPMonitorWorker;
  private ftpWorker: FTPMonitorWorker;

  constructor() {
    this.httpWorker = new HTTPMonitorWorker();
    this.pingWorker = new PingMonitorWorker();
    this.dnsWorker = new DNSMonitorWorker();
    this.tcpWorker = new TCPMonitorWorker();
    this.tracerouteWorker = new TraceRouteMonitorWorker();
    this.udpWorker = new UDPMonitorWorker();
    this.ftpWorker = new FTPMonitorWorker();
  }

  setOnResult(callback: ResultCallback) {
    this.resultCallback = callback;
  }

  addTask(task: MonitorTask): void {
    logger.info(`Adding task: ${task.id} (${task.type})`);
    this.tasks.set(task.id, task);
    this.startTask(task);
  }

  removeTask(taskId: string): void {
    logger.info(`Removing task: ${taskId}`);
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }

  updateTask(task: MonitorTask): void {
    logger.info(`Updating task: ${task.id}`);
    this.stopTask(task.id);
    this.tasks.set(task.id, task);
    this.startTask(task);
  }

  private startTask(task: MonitorTask): void {
    if (task.status === 'PAUSED') {
      logger.debug(`Task ${task.id} is paused, not starting`);
      return;
    }

    const intervalMs = (task.interval || 60) * 1000; // Default 60 seconds

    // Execute immediately
    this.executeTask(task);

    // Then schedule periodic execution
    const intervalId = setInterval(() => {
      this.executeTask(task);
    }, intervalMs);

    this.intervals.set(task.id, intervalId);
    logger.debug(`Task ${task.id} scheduled every ${intervalMs}ms`);
  }

  private stopTask(taskId: string): void {
    const intervalId = this.intervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(taskId);
      logger.debug(`Task ${taskId} stopped`);
    }
  }

  private async executeTask(task: MonitorTask): Promise<void> {
    try {
      let result: CheckResult;

      switch (task.type) {
        case 'HTTP':
        case 'HTTPS':
        case 'API':
          result = await this.httpWorker.execute(task as HTTPMonitor);
          break;
        case 'PING':
          result = await this.pingWorker.execute(task as PingMonitor);
          break;
        case 'DNS':
          result = await this.dnsWorker.execute(task as DNSMonitor);
          break;
        case 'TCP':
          result = await this.tcpWorker.execute(task as TCPMonitor);
          break;
        case 'TRACEROUTE':
          result = await this.tracerouteWorker.execute(task as TraceRouteMonitor);
          break;
        case 'UDP':
          result = await this.udpWorker.execute(task as UDPMonitor);
          break;
        case 'FTP':
          result = await this.ftpWorker.execute(task as FTPMonitor);
          break;
        default:
          logger.warn(`Unsupported monitor type: ${task.type}`);
          return;
      }

      if (this.resultCallback) {
        this.resultCallback(result);
      }
    } catch (error) {
      logger.error(`Task ${task.id} execution failed:`, error);

      const errorResult: CheckResult = {
        id: `result_${Date.now()}`,
        taskId: task.id,
        probeId: 'unknown',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      if (this.resultCallback) {
        this.resultCallback(errorResult);
      }
    }
  }

  stop(): void {
    logger.info('Stopping all tasks...');

    for (const [taskId] of this.intervals) {
      this.stopTask(taskId);
    }

    this.tasks.clear();
    this.intervals.clear();
  }
}
