<template>
  <div class="screen-detail-page" :class="{ fullscreen: isFullscreen }">
    <div class="screen-header" v-if="!isFullscreen">
      <a-page-header
        :title="screen?.name"
        @back="() => $router.push('/screen')"
      >
        <template #extra>
          <a-space>
            <a-button @click="handleEdit">
              <edit-outlined />
              编辑
            </a-button>
            <a-button @click="toggleFullscreen">
              <fullscreen-outlined />
              全屏
            </a-button>
          </a-space>
        </template>
      </a-page-header>
    </div>

    <div class="screen-content">
      <a-row :gutter="16">
        <!-- Row 1: Stats -->
        <a-col :span="6" v-for="stat in stats" :key="stat.title">
          <a-card class="stat-card">
            <a-statistic :title="stat.title" :value="stat.value" :suffix="stat.suffix" :valueStyle="stat.color" />
          </a-card>
        </a-col>
      </a-row>

      <!-- Row 2: Charts -->
      <a-row :gutter="16" class="mt-row">
        <a-col :span="12">
          <a-card title="可用率趋势" class="chart-card">
            <div ref="uptimeChartRef" style="height: 300px;"></div>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="响应时间趋势" class="chart-card">
            <div ref="responseChartRef" style="height: 300px;"></div>
          </a-card>
        </a-col>
      </a-row>

      <!-- Row 3: Alerts & Monitors -->
      <a-row :gutter="16" class="mt-row">
        <a-col :span="8">
          <a-card title="最近告警" class="list-card">
            <a-list :data-source="recentAlerts" size="small">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :title="item.taskName" :description="item.message">
                    <template #avatar>
                      <a-badge :status="getSeverityStatus(item.severity)" />
                    </template>
                  </a-list-item-meta>
                  <span class="time-text">{{ formatTime(item.timestamp) }}</span>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>
        <a-col :span="16">
          <a-card title="监控状态" class="list-card">
            <a-table :columns="monitorColumns" :data-source="monitors" :pagination="false" size="small">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-badge :status="record.status === 'ACTIVE' ? 'success' : 'error'" :text="record.statusText" />
                </template>
                <template v-if="column.key === 'uptime'">
                  <span :style="{ color: getUptimeColor(record.uptime) }">{{ record.uptime }}%</span>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- Fullscreen control bar -->
    <div class="fullscreen-bar" v-if="isFullscreen">
      <a-button @click="toggleFullscreen" shape="circle">
        <fullscreen-exit-outlined />
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  EditOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons-vue';

const isFullscreen = ref(false);
const screen = ref({ name: '核心业务监控大屏', refreshInterval: 30 });

const stats = ref([
  { title: '总监控数', value: 15, suffix: '个', color: { color: '#1890ff' } },
  { title: '运行中', value: 14, suffix: '个', color: { color: '#52c41a' } },
  { title: '异常', value: 1, suffix: '个', color: { color: '#ff4d4f' } },
  { title: '平均可用率', value: 99.92, suffix: '%', color: { color: '#722ed1' } },
]);

const recentAlerts = ref([
  { id: '1', taskName: '登录接口', message: '连续 3 次检测失败', severity: 'CRITICAL', timestamp: new Date() },
  { id: '2', taskName: '支付接口', message: '响应时间超过阈值', severity: 'WARNING', timestamp: new Date(Date.now() - 300000) },
]);

const monitors = ref([
  { id: '1', name: '主页监控', status: 'ACTIVE', statusText: '运行中', uptime: 99.98, responseTime: 45 },
  { id: '2', name: 'API 网关', status: 'ACTIVE', statusText: '运行中', uptime: 99.95, responseTime: 32 },
  { id: '3', name: '登录接口', status: 'DOWN', statusText: '已下线', uptime: 99.85, responseTime: 58 },
  { id: '4', name: '支付接口', status: 'ACTIVE', statusText: '运行中', uptime: 99.99, responseTime: 28 },
]);

const monitorColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', key: 'status', width: 100 },
  { title: '可用率', key: 'uptime', width: 100 },
  { title: '响应时间', key: 'responseTime', width: 100 },
];

const uptimeChartRef = ref<HTMLElement>();
const responseChartRef = ref<HTMLElement>();

const getSeverityStatus = (severity: string) => {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    INFO: 'success',
    WARNING: 'warning',
    CRITICAL: 'error',
  };
  return map[severity] || 'success';
};

const getUptimeColor = (uptime: number) => {
  if (uptime >= 99.9) return '#52c41a';
  if (uptime >= 99) return '#faad14';
  return '#ff4d4f';
};

const formatTime = (time: Date) => {
  return new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const handleEdit = () => {
  // TODO
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

onMounted(() => {
  // TODO: Initialize charts
  // Auto refresh based on refreshInterval
});
</script>

<style scoped>
.screen-detail-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.screen-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.screen-content {
  padding: 24px;
}

.mt-row {
  margin-top: 16px;
}

.stat-card {
  text-align: center;
}

.chart-card,
.list-card {
  height: 100%;
}

.fullscreen-bar {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s;
}

.screen-detail-page:hover .fullscreen-bar {
  opacity: 1;
}

.time-text {
  color: #999;
  font-size: 12px;
}

/* Fullscreen styles */
.screen-detail-page.fullscreen {
  background: #000;
}

.screen-detail-page.fullscreen .screen-header {
  display: none;
}

.screen-detail-page.fullscreen .stat-card {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.screen-detail-page.fullscreen :deep(.ant-card) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>
