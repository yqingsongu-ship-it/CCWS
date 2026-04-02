import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from './layouts/MainLayout.vue';
import Dashboard from './views/Dashboard.vue';
import Monitors from './views/Monitors.vue';
import Probes from './views/Probes.vue';
import Alerts from './views/Alerts.vue';
import Settings from './views/Settings.vue';

// Website Monitor pages
import WebsiteList from './views/Websites/List.vue';
import WebsiteDetail from './views/Websites/Detail.vue';
import WebsitePerformance from './views/Websites/Performance.vue';

// API Monitor pages
import APIList from './views/APIs/List.vue';
import APIDetail from './views/APIs/Detail.vue';
import APIImport from './views/APIs/Import.vue';

// Page Performance pages
import PageList from './views/Pages/List.vue';
import PageDetail from './views/Pages/Detail.vue';
import PageWaterfall from './views/Pages/Waterfall.vue';
import PageCDN from './views/Pages/CDN.vue';

// Report pages
import ReportList from './views/Reports/List.vue';
import ReportDaily from './views/Reports/Daily.vue';
import ReportWeekly from './views/Reports/Weekly.vue';
import ReportMonthly from './views/Reports/Monthly.vue';
import ReportCompare from './views/Reports/Compare.vue';
import ReportTrend from './views/Reports/Trend.vue';

// User Management pages
import UserList from './views/Users/List.vue';
import UserDetail from './views/Users/Detail.vue';
import UserCreate from './views/Users/Create.vue';
import RoleList from './views/Users/Roles.vue';
import DepartmentList from './views/Users/Departments.vue';

// Screen pages
import ScreenHome from './views/Screen/index.vue';
import ScreenDetail from './views/Screen/Detail.vue';

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      // Dashboard
      { path: '', name: 'Dashboard', component: Dashboard },

      // Monitors (General)
      { path: 'monitors', name: 'Monitors', component: Monitors },
      { path: 'monitors/create', name: 'MonitorCreate', component: () => import('./views/Monitors/Create.vue') },
      { path: 'monitors/:id', name: 'MonitorDetail', component: Monitors },
      { path: 'monitors/:id/edit', name: 'MonitorEdit', component: () => import('./views/Monitors/Edit.vue') },

      // Websites
      { path: 'websites', name: 'Websites', component: WebsiteList },
      { path: 'websites/:id', name: 'WebsiteDetail', component: WebsiteDetail },
      { path: 'websites/:id/performance', name: 'WebsitePerformance', component: WebsitePerformance },

      // APIs
      { path: 'apis', name: 'APIs', component: APIList },
      { path: 'apis/:id', name: 'APIDetail', component: APIDetail },
      { path: 'apis/import', name: 'APIImport', component: APIImport },

      // Pages (Page Performance)
      { path: 'pages', name: 'Pages', component: PageList },
      { path: 'pages/:id', name: 'PageDetail', component: PageDetail },
      { path: 'pages/:id/waterfall', name: 'PageWaterfall', component: PageWaterfall },
      { path: 'pages/:id/cdn', name: 'PageCDN', component: PageCDN },

      // Probes
      { path: 'probes', name: 'Probes', component: Probes },

      // Alerts
      { path: 'alerts', name: 'Alerts', component: Alerts },
      { path: 'alerts/rules', name: 'AlertRules', component: Alerts },

      // Reports
      { path: 'reports', name: 'Reports', component: ReportList },
      { path: 'reports/daily', name: 'ReportDaily', component: ReportDaily },
      { path: 'reports/weekly', name: 'ReportWeekly', component: ReportWeekly },
      { path: 'reports/monthly', name: 'ReportMonthly', component: ReportMonthly },
      { path: 'reports/compare', name: 'ReportCompare', component: ReportCompare },
      { path: 'reports/trend', name: 'ReportTrend', component: ReportTrend },

      // Users
      { path: 'users', name: 'Users', component: UserList },
      { path: 'users/create', name: 'UserCreate', component: UserCreate },
      { path: 'users/:id', name: 'UserDetail', component: UserDetail },
      { path: 'users/roles', name: 'RoleList', component: RoleList },
      { path: 'users/departments', name: 'DepartmentList', component: DepartmentList },

      // Screen (Fullscreen Dashboard)
      { path: 'screen', name: 'Screen', component: ScreenHome },
      { path: 'screen/:id', name: 'ScreenDetail', component: ScreenDetail },

      // Settings
      { path: 'settings', name: 'Settings', component: Settings },
    ],
  },
  // Auth routes (no layout)
  {
    path: '/auth',
    component: () => import('./layouts/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'Login', component: () => import('./views/Auth/Login.vue') },
      { path: 'register', name: 'Register', component: () => import('./views/Auth/Register.vue') },
      { path: 'forgot-password', name: 'ForgotPassword', component: () => import('./views/Auth/ForgotPassword.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guard for authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('accessToken');
  const publicPages = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const authRequired = !publicPages.some(page => to.path.startsWith(page));

  if (authRequired && !isAuthenticated) {
    next('/auth/login');
  } else {
    next();
  }
});

export default router;
