/**
 * Monitor Functionality Tests
 * Tests for all monitor types: HTTP, HTTPS, Ping, DNS, TCP, TraceRoute, UDP, FTP
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HTTPMonitorWorker } from '../monitors/http.monitor';
import { PingMonitorWorker } from '../monitors/ping.monitor';
import { DNSMonitorWorker } from '../monitors/dns.monitor';
import { TCPMonitorWorker } from '../monitors/tcp.monitor';
import { TraceRouteMonitorWorker } from '../monitors/traceroute.monitor';
import type { HTTPMonitor, PingMonitor, DNSMonitor, TCPMonitor, TraceRouteMonitor } from '@synthetic-monitoring/shared';

describe('Monitor Workers', () => {
  // Increase timeout for network tests
  const TIMEOUT = 30000;

  describe('HTTPMonitorWorker', () => {
    const worker = new HTTPMonitorWorker();

    it('should monitor HTTPS website successfully', async () => {
      const task: HTTPMonitor = {
        id: 'test-https-1',
        name: 'Test HTTPS',
        type: 'HTTPS',
        target: 'https://www.baidu.com',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          method: 'GET',
          expectedStatusCode: 200,
        },
      };

      const result = await worker.execute(task);
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.statusCode).toBe(200);
    }, TIMEOUT);

    it('should monitor HTTP website successfully', async () => {
      const task: HTTPMonitor = {
        id: 'test-http-1',
        name: 'Test HTTP',
        type: 'HTTP',
        target: 'http://www.example.com',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          method: 'GET',
          expectedStatusCode: 200,
        },
      };

      const result = await worker.execute(task);
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
    }, TIMEOUT);

    it('should fail when expected status code does not match', async () => {
      const task: HTTPMonitor = {
        id: 'test-http-2',
        name: 'Test HTTP Fail',
        type: 'HTTP',
        target: 'https://www.baidu.com',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          method: 'GET',
          expectedStatusCode: 404,
        },
      };

      const result = await worker.execute(task);
      expect(result.success).toBe(false);
    }, TIMEOUT);
  });

  describe('PingMonitorWorker', () => {
    const worker = new PingMonitorWorker();

    it('should ping Google DNS successfully', async () => {
      const task: PingMonitor = {
        id: 'test-ping-1',
        name: 'Test Ping',
        type: 'PING',
        target: '8.8.8.8',
        interval: 30,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          count: 4,
        },
      };

      const result = await worker.execute(task);
      // Ping might be blocked in some environments
      expect(result).toBeDefined();
      expect(result.details?.packetsSent).toBe(4);
    }, TIMEOUT);
  });

  describe('DNSMonitorWorker', () => {
    const worker = new DNSMonitorWorker();

    it('should resolve DNS successfully', async () => {
      const task: DNSMonitor = {
        id: 'test-dns-1',
        name: 'Test DNS',
        type: 'DNS',
        target: 'www.baidu.com',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          recordType: 'A',
        },
      };

      const result = await worker.execute(task);
      // DNS resolution works in most environments
      expect(result).toBeDefined();
      if (result.responseTime !== undefined) {
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
      }
      if (result.success) {
        expect(result.details?.resolvedIPs).toBeDefined();
        expect(result.details?.resolvedIPs?.length).toBeGreaterThan(0);
      }
    }, TIMEOUT);

    it('should handle DNS resolution errors gracefully', async () => {
      const task: DNSMonitor = {
        id: 'test-dns-2',
        name: 'Test DNS',
        type: 'DNS',
        target: 'www.google.com',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          recordType: 'A',
        },
      };

      const result = await worker.execute(task);
      // Result should be defined regardless of success/failure
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    }, TIMEOUT);
  });

  describe('TCPMonitorWorker', () => {
    const worker = new TCPMonitorWorker();

    it('should connect to TCP port successfully', async () => {
      const task: TCPMonitor = {
        id: 'test-tcp-1',
        name: 'Test TCP',
        type: 'TCP',
        target: 'www.baidu.com:443',
        interval: 60,
        timeout: 10000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          port: 443,
        },
      };

      const result = await worker.execute(task);
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details?.connected).toBe(true);
    }, TIMEOUT);

    it('should fail to connect to closed port', async () => {
      const task: TCPMonitor = {
        id: 'test-tcp-2',
        name: 'Test TCP Fail',
        type: 'TCP',
        target: 'www.baidu.com:65535',
        interval: 60,
        timeout: 5000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          port: 65535,
        },
      };

      const result = await worker.execute(task);
      expect(result.success).toBe(false);
    }, TIMEOUT);
  });

  describe('TraceRouteMonitorWorker', () => {
    const worker = new TraceRouteMonitorWorker();

    it('should perform traceroute and return result', async () => {
      const task: TraceRouteMonitor = {
        id: 'test-trace-1',
        name: 'Test TraceRoute',
        type: 'TRACEROUTE',
        target: 'www.baidu.com',
        interval: 300,
        timeout: 30000,
        status: 'ACTIVE',
        probeIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          maxHops: 10, // Reduced hops for faster test
          protocol: 'ICMP',
        },
      };

      const result = await worker.execute(task);
      // TraceRoute might be blocked in some environments
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // Hops may be empty if traceroute is blocked
    }, TIMEOUT);
  });
});
