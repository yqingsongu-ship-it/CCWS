import { Socket } from 'net';
import type { TCPMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class TCPMonitorWorker {
  async execute(task: TCPMonitor): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    try {
      const [host, portStr] = task.target.split(':');
      const port = parseInt(portStr || String(task.config?.port || 0));

      if (!host || !port) {
        result.errorMessage = 'Invalid target format. Expected host:port';
        return result;
      }

      const connected = await this.testConnection(host, port, task.timeout || 5000);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.success = connected;
      result.responseTime = responseTime;
      result.details = {
        port,
        connected,
      };

      if (!connected) {
        result.errorMessage = `Failed to connect to ${host}:${port}`;
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'TCP connection failed';
    }

    return result;
  }

  private testConnection(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new Socket();
      let resolved = false;

      const cleanup = () => {
        socket.destroy();
      };

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(true);
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      });

      socket.connect(port, host);
    });
  }
}
