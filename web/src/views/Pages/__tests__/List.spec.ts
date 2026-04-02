import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import List from "../List.vue";

describe("Pages List Page", () => {
  it("renders the page header", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.text()).toContain("页面性能监控");
  });

  it("has Core Web Vitals columns", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    const columns = wrapper.vm.columns;
    const titles = columns.map((c: any) => c.title);
    expect(titles).toContain("LCP");
    expect(titles).toContain("CLS");
    expect(titles).toContain("FCP");
  });

  it("getLcpColor returns correct color", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.vm.getLcpColor(2000)).toBe("green");
    expect(wrapper.vm.getLcpColor(3000)).toBe("orange");
    expect(wrapper.vm.getLcpColor(5000)).toBe("red");
  });
});
