import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Detail from "../Detail.vue";

describe("Websites Detail Page", () => {
  const mockRoute = {
    params: { id: "test-123" },
  };

  const mockRouter = {
    push: vi.fn(),
  };

  const mockMonitorStore = {
    getMonitorById: vi.fn().mockResolvedValue({
      id: "test-123",
      name: "Test Monitor",
      type: "HTTPS",
      target: "https://example.com",
      status: "ACTIVE",
      interval: 60,
      timeout: 5000,
      createdAt: new Date().toISOString(),
    }),
    fetchStats: vi.fn().mockResolvedValue({
      uptime: 99.9,
      avgResponseTime: 120,
      totalChecks: 1000,
      failedChecks: 1,
    }),
    fetchResults: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header", () => {
    const wrapper = mount(Detail, {
      global: {
        mocks: {
          $router: mockRouter,
          $route: mockRoute,
        },
        plugins: [],
      },
    });
    expect(wrapper.text()).toContain("网站监控详情");
  });

  it("has correct check result columns", () => {
    const wrapper = mount(Detail, {
      global: {
        mocks: {
          $router: mockRouter,
          $route: mockRoute,
        },
      },
    });
    const columns = wrapper.vm.checkResultColumns;
    expect(columns.length).toBe(6);
    expect(columns.map((c: any) => c.title)).toContain("时间");
  });

  it("getStatusStatus returns correct status", () => {
    const wrapper = mount(Detail, {
      global: {
        mocks: {
          $router: mockRouter,
          $route: mockRoute,
        },
      },
    });
    expect(wrapper.vm.getStatusStatus("ACTIVE")).toBe("success");
    expect(wrapper.vm.getStatusStatus("DOWN")).toBe("error");
  });

  it("formatTime returns formatted date", () => {
    const wrapper = mount(Detail, {
      global: {
        mocks: {
          $router: mockRouter,
          $route: mockRoute,
        },
      },
    });
    const result = wrapper.vm.formatTime(new Date().toISOString());
    expect(result).not.toBe("-");
  });
});
