<template>
  <a-layout class="app-layout">
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible theme="dark" :width="220">
      <div class="logo">
        <h1 v-if="!collapsed">DEM 监控</h1>
        <h1 v-else>D</h1>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-menu-item key="Dashboard">
          <dashboard-outlined />
          <span>仪表板</span>
        </a-menu-item>

        <a-sub-menu key="monitors">
          <template #icon><appstore-outlined /></template>
          <template #title>监控管理</template>
          <a-menu-item key="Monitors">全部监控</a-menu-item>
          <a-menu-item key="Websites">网站监控</a-menu-item>
          <a-menu-item key="APIs">API 监控</a-menu-item>
          <a-menu-item key="Pages">页面性能</a-menu-item>
        </a-sub-menu>

        <a-menu-item key="Probes">
          <cloud-outlined />
          <span>探测点</span>
        </a-menu-item>

        <a-menu-item key="Alerts">
          <bell-outlined />
          <span>告警管理</span>
        </a-menu-item>

        <a-sub-menu key="reports">
          <template #icon><bar-chart-outlined /></template>
          <template #title>数据报表</template>
          <a-menu-item key="Reports">报表列表</a-menu-item>
          <a-menu-item key="ReportDaily">日报</a-menu-item>
          <a-menu-item key="ReportWeekly">周报</a-menu-item>
          <a-menu-item key="ReportMonthly">月报</a-menu-item>
          <a-menu-item key="ReportCompare">对比分析</a-menu-item>
          <a-menu-item key="ReportTrend">趋势分析</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="users">
          <template #icon><user-outlined /></template>
          <template #title>用户管理</template>
          <a-menu-item key="Users">用户列表</a-menu-item>
          <a-menu-item key="RoleList">角色管理</a-menu-item>
          <a-menu-item key="DepartmentList">部门管理</a-menu-item>
        </a-sub-menu>

        <a-menu-item key="Screen">
          <fullscreen-outlined />
          <span>监控大屏</span>
        </a-menu-item>

        <a-menu-item key="Settings">
          <setting-outlined />
          <span>系统设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="app-header">
        <span class="header-title">DEM 业务体验监控系统</span>
        <div class="header-actions">
          <a-space>
            <a-tooltip title="刷新数据">
              <reload-outlined class="action-icon" @click="handleRefresh" />
            </a-tooltip>
            <a-tooltip title="监控大屏">
              <fullscreen-outlined class="action-icon" @click="() => $router.push('/screen')" />
            </a-tooltip>
            <a-dropdown>
              <span class="user-info">
                <a-avatar :size="24" :style="{ backgroundColor: '#1890ff' }">A</a-avatar>
                Admin
              </span>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile" @click="() => $router.push('/account/profile')">个人中心</a-menu-item>
                  <a-menu-item key="settings" @click="() => $router.push('/settings')">系统设置</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </div>
      </a-layout-header>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  DashboardOutlined,
  AppstoreOutlined,
  CloudOutlined,
  BellOutlined,
  BarChartOutlined,
  UserOutlined,
  FullscreenOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const selectedKeys = ref<string[]>(['Dashboard']);
const openKeys = ref<string[]>([]);

// Sync selected menu item with current route
watch(
  () => route.name,
  (name) => {
    if (name) {
      selectedKeys.value = [name as string];
    }
  },
  { immediate: true }
);

const handleMenuClick = ({ key }: { key: string }) => {
  const routeMap: Record<string, string> = {
    Dashboard: '/',
    Monitors: '/monitors',
    Websites: '/websites',
    APIs: '/apis',
    Pages: '/pages',
    Probes: '/probes',
    Alerts: '/alerts',
    Reports: '/reports',
    ReportDaily: '/reports/daily',
    ReportWeekly: '/reports/weekly',
    ReportMonthly: '/reports/monthly',
    ReportCompare: '/reports/compare',
    ReportTrend: '/reports/trend',
    Users: '/users',
    RoleList: '/users/roles',
    DepartmentList: '/users/departments',
    Screen: '/screen',
    Settings: '/settings',
  };
  const path = routeMap[key];
  if (path) {
    router.push(path);
  }
};

const handleRefresh = () => {
  window.location.reload();
};

const handleLogout = () => {
  localStorage.removeItem('token');
  message.success('已退出登录');
  router.push('/auth/login');
};
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px;
  border-radius: 4px;
}

.logo h1 {
  color: #fff;
  margin: 0;
  font-size: 18px;
  transition: opacity 0.2s;
}

.app-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-size: 16px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}

.action-icon:hover {
  color: #1890ff;
}

.app-content {
  margin: 24px 16px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
}
</style>
