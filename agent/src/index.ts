import { io, Socket } from 'socket.io-client';
import { createLogger } from './utils/logger.js';
import { MonitorManager } from './monitors/monitor.manager.js';
import type { MonitorTask, CheckResult, Probe } from '@synthetic-monitoring/shared';
import os from 'os';

const logger = createLogger('agent');

interface AgentConfig {
  serverUrl: string;
  probeName?: string;
  location?: string;
}

export class Agent {
  private socket: Socket | null = null;
  private monitorManager: MonitorManager;
  private config: AgentConfig;
  private probeId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.monitorManager = new MonitorManager();
  }

  async start(): Promise<void> {
    logger.info('Starting agent...');

    const PROBE_KEY = process.env.PROBE_KEY || 'quick-check';

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: {
          probeKey: PROBE_KEY,
        },
      });

      this.socket.on('connect', () => {
        logger.info('Connected to server');
        this.registerProbe();
        resolve();
      });

      this.socket.on('disconnect', () => {
        logger.warn('Disconnected from server');
        this.stopHeartbeat();
      });

      this.socket.on('connect_error', (error) => {
        logger.error('Connection error:', error.message);
        reject(error);
      });

      // Task assignments from server
      this.socket.on('monitor:assign', (task: MonitorTask) => {
        logger.info(`Assigned monitor task: ${task.id} (${task.type})`);
        this.monitorManager.addTask(task);
      });

      this.socket.on('monitor:remove', (taskId: string) => {
        logger.info(`Removing monitor task: ${taskId}`);
        this.monitorManager.removeTask(taskId);
      });

      this.socket.on('monitor:update', (task: MonitorTask) => {
        logger.info(`Updating monitor task: ${task.id}`);
        this.monitorManager.updateTask(task);
      });

      // Handle monitor results
      this.monitorManager.setOnResult((result: CheckResult) => {
        this.sendResult(result);
      });
    });
  }

  private registerProbe(): void {
    if (!this.socket) return;

    const probeInfo: Omit<Probe, 'id' | 'status'> = {
      name: this.config.probeName || `probe-${os.hostname()}`,
      location: this.config.location || 'Unknown',
      ip: undefined,
      lastHeartbeat: new Date(),
      capabilities: ['HTTP', 'HTTPS', 'PING', 'DNS', 'TCP', 'TRACEROUTE'],
      currentTasks: [],
    };

    this.socket.emit('probe:register', probeInfo);

    this.socket.once('probe:registered', (data: { id: string }) => {
      this.probeId = data.id;
      logger.info(`Probe registered with ID: ${this.probeId}`);
      this.startHeartbeat();
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.probeId) {
        this.socket.emit('probe:heartbeat', { probeId: this.probeId });
      }
    }, 30000); // 30 seconds

    logger.info('Heartbeat started');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Heartbeat stopped');
    }
  }

  private sendResult(result: CheckResult): void {
    if (this.socket) {
      this.socket.emit('monitor:result', {
        taskId: result.taskId,
        result,
      });
      logger.debug(`Sent result for task: ${result.taskId}`);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping agent...');

    this.stopHeartbeat();
    this.monitorManager.stop();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    logger.info('Agent stopped');
  }
}

// CLI entry point
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const PROBE_NAME = process.env.PROBE_NAME;
const LOCATION = process.env.LOCATION;

const agent = new Agent({
  serverUrl: SERVER_URL,
  probeName: PROBE_NAME,
  location: LOCATION,
});

agent.start().catch((err) => {
  logger.error('Failed to start agent:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await agent.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await agent.stop();
  process.exit(0);
});
