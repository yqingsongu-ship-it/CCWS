import { describe, it, expect, beforeEach, vi } from "vitest";
import { PagePerfService } from "../page-perf.service";

describe("PagePerfService", () => {
  let service: PagePerfService;

  beforeEach(() => {
    service = new PagePerfService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should calculate performance score", () => {
    const metrics = {
      fcp: 1500,
      lcp: 2000,
      cls: 0.1,
      fid: 80,
    };
    const score = service.calculateScore(metrics);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should parse resource timing", () => {
    const entries = [
      { name: "https://example.com/app.js", initiatorType: "script", duration: 100, transferSize: 50000 },
      { name: "https://example.com/style.css", initiatorType: "link", duration: 50, transferSize: 20000 },
    ];
    const resources = service.parseResourceTiming(entries as any);
    expect(resources.length).toBe(2);
    expect(resources[0].type).toBe("script");
  });
});
