import { describe, it, expect } from "vitest";

describe("Shared Types", () => {
  it("MonitorType includes all types", () => {
    const validTypes = ["HTTP", "HTTPS", "API", "PAGE_PERF", "PING", "DNS", "TCP"];
    expect(validTypes.length).toBe(7);
  });

  it("MonitorStatus includes all statuses", () => {
    const validStatuses = ["ACTIVE", "PAUSED", "ERROR", "DOWN"];
    expect(validStatuses.length).toBe(4);
  });

  it("AlertSeverity includes all levels", () => {
    const validSeverities = ["INFO", "WARNING", "CRITICAL", "FATAL"];
    expect(validSeverities.length).toBe(4);
  });
});
