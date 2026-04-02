import { createSocket } from 'dgram';
import type { UDPMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class UDPMonitorWorker {
  async execute(task: UDPMonitor): Promise<CheckResult> {
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
      const message = task.config?.message || '';
      const expectedResponse = task.config?.expectedResponse;

      if (!host || !port) {
        result.errorMessage = 'Invalid target format. Expected host:port';
        return result;
      }

      const connected = await this.testUDP(host, port, message, expectedResponse, task.timeout || 5000);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.success = connected.success;
      result.responseTime = responseTime;
      result.details = {
        port,
        connected: connected.success,
      };

      if (!connected.success) {
        result.errorMessage = connected.error || `UDP test failed for ${host}:${port}`;
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'UDP test failed';
    }

    return result;
  }

  private testUDP(
    host: string,
    port: number,
    message: string,
    expectedResponse: string | undefined,
    timeout: number
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const client = createSocket('udp4');
      let resolved = false;
      const messageBuffer = Buffer.from(message);

      const cleanup = () => {
        client.close();
      };

      // Set timeout using setTimeout since dgram Socket doesn't have setTimeout
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ success: false, error: 'UDP timeout' });
        }
      }, timeout);

      client.on('message', (data: Buffer) => {
        if (!resolved) {
          const responseStr = data.toString();

          // If expected response is specified, validate it
          if (expectedResponse && !responseStr.includes(expectedResponse)) {
            resolved = true;
            cleanup();
            clearTimeout(timeoutId);
            resolve({ success: false, error: 'Response did not match expected value' });
            return;
          }

          resolved = true;
          cleanup();
          clearTimeout(timeoutId);
          resolve({ success: true });
        }
      });

      client.on('error', (err: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          clearTimeout(timeoutId);
          resolve({ success: false, error: err.message });
        }
      });

      client.send(messageBuffer, 0, messageBuffer.length, port, host, (err: Error | null) => {
        if (err && !resolved) {
          resolved = true;
          cleanup();
          clearTimeout(timeoutId);
          resolve({ success: false, error: err.message });
        }
      });
    });
  }
}
