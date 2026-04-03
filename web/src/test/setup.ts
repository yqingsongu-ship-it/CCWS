import { config } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Setup Pinia for tests
beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    go: vi.fn(),
    forward: vi.fn(),
  }),
  useRoute: () => ({
    params: { id: 'test-id' },
    query: {},
    path: '/',
    name: '',
    matched: [],
  }),
  RouterLink: { template: '<a><slot /></a>' },
}));

// Stub Ant Design Vue components with proper prop handling
const antdStubs = {
  AButton: { template: '<button><slot /></button>' },
  ASpace: { template: '<div style="display:flex;gap:8px;"><slot /></div>' },
  APageHeader: {
    props: ['title'],
    template: '<div class="page-header"><h2>{{ title }}</h2><slot name="extra" /></div>'
  },
  AInput: { template: '<input />' },
  AFormItem: { props: ['label'], template: '<div><slot /></div>' },
  ASelect: { template: '<select><slot /></select>' },
  ASelectOption: { template: '<option><slot /></option>' },
  AForm: { template: '<form><slot /></form>' },
  ARow: { template: '<div><slot /></div>' },
  ACol: { template: '<div><slot /></div>' },
  ACard: { props: ['title'], template: '<div class="card"><slot /></div>' },
  ATable: { props: ['columns', 'dataSource'], template: '<table><slot /></table>' },
  ATag: { props: ['color'], template: '<span><slot /></span>' },
  ASwitch: { props: ['checked'], template: '<button><slot /></button>' },
  APopconfirm: { template: '<span><slot /></span>' },
  ADropdown: { template: '<div><slot /></div>' },
  AMenu: { template: '<ul><slot /></ul>' },
  AMenuItem: { template: '<li><slot /></li>' },
  AStatistic: { props: ['title', 'value'], template: '<div><slot /></div>' },
  AProgress: { props: ['percent', 'status'], template: '<div class="progress"></div>' },
  ARangePicker: { template: '<input type="text" />' },
  ADescriptions: { template: '<div><slot /></div>' },
  ADescriptionsItem: { props: ['label'], template: '<div><slot /></div>' },
  ATypographyText: { template: '<span><slot /></span>' },
  ABadge: { props: ['status', 'text'], template: '<span><slot /></span>' },
};

config.global.components = { ...antdStubs };

// Global mocks (fallback)
config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  $route: {
    params: { id: 'test-id' },
    query: {},
  },
};
