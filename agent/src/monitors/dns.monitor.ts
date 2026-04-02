import { promises as dns } from 'dns';
import type { DNSMonitor, CheckResult } from '@synthetic-monitoring/shared';

export class DNSMonitorWorker {
  async execute(task: DNSMonitor): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      id: `result_${Date.now()}`,
      taskId: task.id,
      probeId: 'local',
      timestamp: new Date(),
      success: false,
    };

    try {
      const domain = task.target;
      const recordType = task.config?.recordType || 'A';
      const nameserver = task.config?.nameserver;
      const expectedIP = task.config?.expectedIP;

      let records: string[];

      if (nameserver) {
        // Use custom nameserver
        const resolver = new dns.Resolver();
        resolver.setServers([nameserver]);
        records = await this.resolveRecords(resolver, domain, recordType);
      } else {
        records = await this.resolveRecords(dns, domain, recordType);
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.success = true;
      result.responseTime = responseTime;
      result.details = {
        resolvedIPs: records,
        nameserver: nameserver || 'default',
        recordType,
      };

      // Validate expected IP
      if (expectedIP && !records.includes(expectedIP)) {
        result.success = false;
        result.errorMessage = `Expected IP ${expectedIP} not found in resolved records`;
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : 'DNS resolution failed';
    }

    return result;
  }

  private async resolveRecords(
    resolver: { resolve4: Function; resolve6: Function; resolveCname: Function; resolveMx: Function; resolveNs: Function; resolveTxt: Function; resolveSoa: Function },
    domain: string,
    recordType: string
  ): Promise<string[]> {
    switch (recordType) {
      case 'A':
        return await resolver.resolve4(domain);
      case 'AAAA':
        return await resolver.resolve6(domain);
      case 'CNAME':
        return await resolver.resolveCname(domain);
      case 'MX':
        const mx = await resolver.resolveMx(domain);
        return mx.map((r: { exchange: string }) => r.exchange);
      case 'NS':
        return await resolver.resolveNs(domain);
      case 'TXT':
        const txt = await resolver.resolveTxt(domain);
        return txt.flat();
      case 'SOA':
        const soa = await resolver.resolveSoa(domain);
        return [soa.mname];
      default:
        throw new Error(`Unsupported record type: ${recordType}`);
    }
  }
}
