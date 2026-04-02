import axios, { AxiosError } from 'axios';
import type { HTTPMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class HTTPMonitorWorker {
  async execute(task: HTTPMonitor): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    try {
      const config = task.config;
      const url = task.target;

      const response = await axios({
        method: config.method,
        url,
        headers: config.headers,
        data: config.body,
        timeout: task.timeout || 10000,
        maxRedirects: config.followRedirects !== false ? 5 : 0,
        httpsAgent: config.validateSSL === false ? undefined : undefined,
        validateStatus: () => true, // Don't throw on any status code
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.success = this.validateResponse(response, config);
      result.statusCode = response.status;
      result.responseTime = responseTime;
      result.details = {
        url,
        method: config.method,
      };

      if (!result.success) {
        result.errorMessage = 'Response validation failed';
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      result.success = false;
      result.errorMessage = axiosError.message;
      result.responseTime = Date.now() - startTime;
    }

    return result;
  }

  private validateResponse(
    response: { status: number; data: unknown },
    config: HTTPMonitor['config']
  ): boolean {
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
}
