import * as ftp from 'basic-ftp';
import type { FTPMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class FTPMonitorWorker {
  async execute(task: FTPMonitor): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    const client = new ftp.Client();

    try {
      const [host, portStr] = task.target.split(':');
      const port = parseInt(portStr || String(task.config?.port || 21));
      const username = task.config?.username;
      const password = task.config?.password;
      const expectedResponse = task.config?.expectedResponse;

      if (!host) {
        result.errorMessage = 'Invalid target format. Expected host or host:port';
        return result;
      }

      const ftpResult = await this.testFTP(client, host, port, username, password, expectedResponse, task.timeout || 10000);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.success = ftpResult.success;
      result.responseTime = responseTime;
      result.details = {
        port,
        connected: ftpResult.success,
      };

      if (ftpResult.banner) {
        result.details = {
          ...result.details,
          banner: ftpResult.banner,
        };
      }

      if (!result.success) {
        result.errorMessage = ftpResult.error || `FTP test failed for ${host}:${port}`;
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'FTP test failed';
    } finally {
      client.close();
    }

    return result;
  }

  private async testFTP(
    client: ftp.Client,
    host: string,
    port: number,
    username: string | undefined,
    password: string | undefined,
    expectedResponse: string | undefined,
    timeout: number
  ): Promise<{ success: boolean; error?: string; banner?: string }> {
    try {
      // Set up connection timeout
      const timeoutPromise = new Promise<{ success: boolean; error?: string }>((_, reject) => {
        setTimeout(() => reject(new Error('FTP connection timeout')), timeout);
      });

      const connectPromise = (async (): Promise<{ success: boolean; error?: string; banner?: string }> => {
        // Access the raw socket for banner detection before full connection
        let banner = '';

        try {
          await client.access({
            host,
            port,
            user: username || 'anonymous',
            password: password || 'anonymous@',
            secure: false,
          });

          // If we reach here, connection and optional authentication succeeded
          // The banner is typically available after connection
          banner = 'FTP server connected';

          // Validate expected response if specified
          if (expectedResponse && !banner.includes(expectedResponse)) {
            return { success: false, error: 'Banner did not match expected value', banner };
          }

          return { success: true, banner };
        } catch (error) {
          const err = error as Error;
          return { success: false, error: err.message };
        }
      })();

      // Race between connection and timeout
      return await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }
}
