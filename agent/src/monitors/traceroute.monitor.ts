import { exec } from 'child_process';
import { promisify } from 'util';
import type { TraceRouteMonitor, CheckResult, HopInfo } from '@synthetic-monitoring/shared';

const execAsync = promisify(exec);

export class TraceRouteMonitorWorker {
  async execute(task: TraceRouteMonitor): Promise<CheckResult> {
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    try {
      const target = task.target;
      const maxHops = task.config?.maxHops || 30;
      const timeout = task.timeout || 5000;

      const isWindows = process.platform === 'win32';
      const hops: HopInfo[] = [];

      if (isWindows) {
        // Windows: use tracert
        // -d: Don't resolve addresses to hostnames (faster)
        // -h: Maximum number of hops
        // -w: Timeout in milliseconds
        const command = `tracert -d -h ${maxHops} -w ${timeout} "${target}"`;
        const { stdout } = await execAsync(command, {
          timeout: timeout * maxHops, // Total timeout for all hops
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        });
        hops.push(...this.parseTracertOutput(stdout));
      } else {
        // Unix/Linux/macOS: use traceroute
        // -n: Don't resolve IP addresses to hostnames
        // -m: Maximum number of hops
        // -w: Timeout in seconds
        const timeoutSeconds = Math.ceil(timeout / 1000);
        const command = `traceroute -n -m ${maxHops} -w ${timeoutSeconds} "${target}"`;
        const { stdout } = await execAsync(command, {
          timeout: timeout * maxHops,
          maxBuffer: 10 * 1024 * 1024,
        });
        hops.push(...this.parseTracerouteOutput(stdout));
      }

      result.success = hops.length > 0;
      result.details = {
        hops,
      };

      // Calculate total response time as sum of all RTTs
      let totalRtt = 0;
      let hopCount = 0;
      for (const hop of hops) {
        if (hop.rtt1) {
          totalRtt += hop.rtt1;
          hopCount++;
        }
        if (hop.rtt2) {
          totalRtt += hop.rtt2;
          hopCount++;
        }
        if (hop.rtt3) {
          totalRtt += hop.rtt3;
          hopCount++;
        }
      }
      result.responseTime = hopCount > 0 ? totalRtt / hopCount : 0;
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'Traceroute failed';
    }

    return result;
  }

  /**
   * Parse Windows tracert output
   * Example:
   *   1    <1 ms    <1 ms    <1 ms  192.168.1.1
   *   2     5 ms     4 ms     5 ms  10.0.0.1
   *   3     *        *        *     Request timed out.
   */
  private parseTracertOutput(output: string): HopInfo[] {
    const hops: HopInfo[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Skip header lines
      if (line.includes('Tracing route') || line.includes('over a maximum') || line.trim() === '') {
        continue;
      }

      // Match hop line: number followed by three RTT values and IP
      // Format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
      // Or: "  3     *        *        *     Request timed out."
      const hopMatch = line.match(/^\s*(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)?$/);

      if (hopMatch) {
        const ttl = parseInt(hopMatch[1], 10);
        const rtt1 = this.parseRtt(hopMatch[2]);
        const rtt2 = this.parseRtt(hopMatch[3]);
        const rtt3 = this.parseRtt(hopMatch[4]);
        const remainder = hopMatch[5] || '';

        // Extract IP and hostname from remainder
        const ipMatch = remainder.match(/(?:\d{1,3}\.){3}\d{1,3}/);
        const ip = ipMatch ? ipMatch[0] : undefined;

        // Hostname is usually before the IP in brackets
        const hostnameMatch = remainder.match(/\[([^\]]+)\]/);
        const hostname = hostnameMatch ? hostnameMatch[1] : undefined;

        hops.push({
          ttl,
          ip,
          hostname,
          rtt1,
          rtt2,
          rtt3,
        });
      }
    }

    return hops;
  }

  /**
   * Parse Unix traceroute output
   * Example:
   *  1  192.168.1.1 (192.168.1.1)  1.234 ms  1.123 ms  1.456 ms
   *  2  10.0.0.1 (10.0.0.1)  5.678 ms  5.432 ms  5.789 ms
   *  3  * * *
   */
  private parseTracerouteOutput(output: string): HopInfo[] {
    const hops: HopInfo[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Skip header lines
      if (line.includes('traceroute to') || line.trim() === '') {
        continue;
      }

      // Match hop line: number followed by host info and RTT values
      // Format: " 1  192.168.1.1 (192.168.1.1)  1.234 ms  1.123 ms  1.456 ms"
      // Or: " 3  * * *"
      const parts = line.trim().split(/\s+/);

      if (parts.length >= 2) {
        const ttl = parseInt(parts[0], 10);

        if (isNaN(ttl) || ttl <= 0) {
          continue;
        }

        let ip: string | undefined;
        let hostname: string | undefined;
        const rtts: (number | undefined)[] = [];

        // Parse remaining parts
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];

          // Check if it's an IP address
          if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(part)) {
            ip = part;
          }
          // Check if it's a hostname in parentheses
          else if (part.startsWith('(') && part.endsWith(')')) {
            hostname = part.slice(1, -1);
          }
          // Check if it's an RTT value
          else if (part === '*') {
            rtts.push(undefined);
          }
          else if (!isNaN(parseFloat(part))) {
            rtts.push(parseFloat(part));
          }
        }

        hops.push({
          ttl,
          ip,
          hostname,
          rtt1: rtts[0],
          rtt2: rtts[1],
          rtt3: rtts[2],
        });
      }
    }

    return hops;
  }

  /**
   * Parse individual RTT value
   * Handles formats like: "1ms", "<1ms", "*", "5.234"
   */
  private parseRtt(value: string): number | undefined {
    if (value === '*' || value === '') {
      return undefined;
    }

    // Remove '<' prefix if present (e.g., "<1ms" -> "1ms")
    const cleaned = value.replace(/</g, '').replace(/ms/g, '').trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
}
