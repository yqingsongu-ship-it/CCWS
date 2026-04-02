import ping from 'ping';
import type { PingMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class PingMonitorWorker {
  async execute(task: PingMonitor): Promise<CheckResult> {
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    try {
      const host = task.target;
      const count = task.config?.count || 4;
      const packetSize = task.config?.packetSize || 56;

      const response = await ping.promise.probe(host, {
        min_reply: count,
        timeout: task.timeout || 5000,
        packetSize,
      });

      result.success = response.alive;
      result.responseTime = response.avg ?? 0;
      result.details = {
        packetsSent: count,
        packetsReceived: response.alive ? count : 0,
        packetLoss: response.alive ? 0 : 100,
        minRtt: response.min ?? 0,
        avgRtt: response.avg ?? 0,
        maxRtt: response.max ?? 0,
      };

      if (!result.success) {
        result.errorMessage = 'Host unreachable';
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'Ping failed';
    }

    return result;
  }
}
