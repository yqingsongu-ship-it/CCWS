import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import List from "../List.vue";

describe("APIs List Page", () => {
  it("renders the page header", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.text()).toContain("API 监控");
  });

  it("has method filter option", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    const columns = wrapper.vm.columns;
    expect(columns.map((c: any) => c.title)).toContain("方法");
  });

  it("getMethodColor returns correct color", () => {
    const wrapper = mount(List, {
      global: {
        mocks: {
          $router: { push: vi.fn() },
          $route: { params: {}, query: {} },
        },
      },
    });
    expect(wrapper.vm.getMethodColor("GET")).toBe("green");
    expect(wrapper.vm.getMethodColor("POST")).toBe("blue");
    expect(wrapper.vm.getMethodColor("DELETE")).toBe("red");
  });
});
