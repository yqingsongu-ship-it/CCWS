import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import List from "../List.vue";

describe("Websites List Page", () => {
  it("renders the page header", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.text()).toContain("网站监控");
  });

  it("has correct columns", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    const columns = wrapper.vm.columns;
    expect(columns.length).toBeGreaterThan(0);
    expect(columns.map((c: any) => c.title)).toContain("名称");
  });

  it("getStatusStatus returns correct status", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.vm.getStatusStatus("ACTIVE")).toBe("success");
    expect(wrapper.vm.getStatusStatus("PAUSED")).toBe("default");
    expect(wrapper.vm.getStatusStatus("ERROR")).toBe("error");
  });

  it("getUptimeColor returns correct color", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.vm.getUptimeColor(99.9)).toBe("#52c41a");
    expect(wrapper.vm.getUptimeColor(99.5)).toBe("#faad14");
    expect(wrapper.vm.getUptimeColor(98)).toBe("#ff4d4f");
  });
});
