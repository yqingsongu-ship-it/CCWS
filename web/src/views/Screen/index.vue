<template>
  <div class="screen-page">
    <div class="screen-header">
      <h1>监控大屏 - DEM 用户体验监控</h1>
      <div class="header-actions">
        <span class="current-time">{{ currentTime }}</span>
        <a-button size="small" @click="toggleFullScreen"><fullscreen-outlined />全屏</a-button>
      </div>
    </div>

    <div class="screen-content">
      <!-- 第一行：统计卡片 -->
      <a-row :gutter="16" class="mb-4">
        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic title="总算数" :value="stats.totalMonitors" :valueStyle="{ color: '#1890ff' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic title="运行中" :value="stats.active" :valueStyle="{ color: '#52c41a' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic title="异常" :value="stats.abnormal" :valueStyle="{ color: '#ff4d4f' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic title="整体可用率" :value="stats.uptime" suffix="%" :valueStyle="{ color: stats.uptime >= 99.9 ? '#52c41a' : '#faad14' }" />
          </a-card>
        </a-col>
      </a-row>

      <!-- 第二行：图表 -->
      <a-row :gutter="16" class="mb-4">
        <a-col :span="12">
          <a-card title="响应时间趋势" class="chart-card">
            <div class="chart-container">
              <canvas ref="responseTimeChart"></canvas>
            </div>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="告警分布" class="chart-card">
            <div class="chart-container">
              <canvas ref="alertChart"></canvas>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 第三行：监控列表和告警 -->
      <a-row :gutter="16">
        <a-col :span="16">
          <a-card title="监控状态" class="monitor-card">
            <a-table :columns="columns" :data-source="monitors" :pagination="false" size="small" :scroll="{ y: 300 }">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-badge :status="getStatusStatus(record.status)" :text="getStatusText(record.status)" />
                </template>
                <template v-if="column.key === 'uptime'">
                  <a-progress :percent="record.uptime" :strokeColor="getUptimeColor(record.uptime)" :showInfo="false" size="small" />
                  <span :style="{ color: getUptimeColor(record.uptime) }">{{ record.uptime.toFixed(2) }}%</span>
                </template>
                <template v-if="column.key === 'responseTime'">{{ record.responseTime }}ms</template>
              </template>
            </a-table>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="最近告警" class="alert-card">
            <a-timeline class="alert-timeline">
              <a-timeline-item v-for="alert in alerts" :key="alert.id" :color="getAlertColor(alert.severity)">
                <div class="alert-item">
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { FullscreenOutlined } from '@ant-design/icons-vue';
import Chart from 'chart.js/auto';

interface Monitor {
  id: string;
  name: string;
  type: string;
  status: string;
  uptime: number;
  responseTime: number;
}

interface Alert {
  id: string;
  message: string;
  severity: string;
  timestamp: string;
}

const currentTime = ref(new Date().toLocaleString('zh-CN'));
const stats = reactive({ totalMonitors: 0, active: 0, abnormal: 0, uptime: 0 });
const monitors = ref<Monitor[]>([]);
const alerts = ref<Alert[]>([]);
const responseTimeChart = ref<HTMLCanvasElement | null>(null);
const alertChart = ref<HTMLCanvasElement | null>(null);
let responseTimeChartInstance: Chart | null = null;
let alertChartInstance: Chart | null = null;
let timer: any = null;

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
  { title: '状态', key: 'status', width: 90 },
  { title: '可用率', key: 'uptime', width: 150 },
  { title: '响应时间', key: 'responseTime', width: 100 },
];

const getStatusStatus = (status?: string) => {
  const map: Record<string, 'success' | 'error' | 'default' | 'processing'> = { ACTIVE: 'success', PAUSED: 'default', ERROR: 'error', DOWN: 'error' };
  return map[status || 'PAUSED'] || 'default';
};

const getStatusText = (status?: string) => {
  const map: Record<string, string> = { ACTIVE: '运行中', PAUSED: '已暂停', ERROR: '错误', DOWN: '已下线' };
  return map[status || 'PAUSED'] || status;
};

const getUptimeColor = (uptime: number) => { if (uptime >= 99.9) return '#52c41a'; if (uptime >= 99) return '#faad14'; return '#ff4d4f'; };
const getAlertColor = (severity: string) => { const colors: Record<string, string> = { INFO: 'blue', WARNING: 'orange', CRITICAL: 'red', FATAL: 'purple' }; return colors[severity] || 'gray'; };
const formatTime = (time?: string) => { if (!time) return '-'; return new Date(time).toLocaleString('zh-CN'); };

const loadStats = () => {
  stats.totalMonitors = 25;
  stats.active = 23;
  stats.abnormal = 2;
  stats.uptime = 99.95;
};

const loadMonitors = () => {
  monitors.value = Array.from({ length: 10 }, (_, i) => ({
    id: `m-${i}`,
    name: `监控任务 ${i + 1}`,
    type: i % 3 === 0 ? 'HTTP' : i % 3 === 1 ? 'API' : 'PAGE',
    status: i < 8 ? 'ACTIVE' : i < 9 ? 'ERROR' : 'DOWN',
    uptime: 99 + Math.random(),
    responseTime: Math.floor(Math.random() * 200) + 50,
  }));
};

const loadAlerts = () => {
  alerts.value = Array.from({ length: 5 }, (_, i) => ({
    id: `a-${i}`,
    message: `告警信息 ${i + 1}: 监控任务响应时间异常`,
    severity: i % 3 === 0 ? 'INFO' : i % 3 === 1 ? 'WARNING' : 'CRITICAL',
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  }));
};

const initCharts = () => {
  if (responseTimeChart.value) {
    responseTimeChartInstance = new Chart(responseTimeChart.value, {
      type: 'line',
      data: { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'], datasets: [{ label: '响应时间 (ms)', data: [120, 132, 101, 134, 90, 230], borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true }, y: { beginAtZero: true } } },
    });
  }
  if (alertChart.value) {
    alertChartInstance = new Chart(alertChart.value, {
      type: 'doughnut',
      data: { labels: ['INFO', 'WARNING', 'CRITICAL'], datasets: [{ data: [12, 8, 3], backgroundColor: ['#1890ff', '#faad14', '#ff4d4f'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }
};

const toggleFullScreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); };

onMounted(() => {
  loadStats();
  loadMonitors();
  loadAlerts();
  setTimeout(() => initCharts(), 100);
  timer = setInterval(() => { currentTime.value = new Date().toLocaleString('zh-CN'); loadStats(); loadMonitors(); }, 30000);
});

onUnmounted(() => { if (timer) clearInterval(timer); if (responseTimeChartInstance) responseTimeChartInstance.destroy(); if (alertChartInstance) alertChartInstance.destroy(); });
</script>

<style scoped>
.screen-page { min-height: 100vh; background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); color: #fff; padding: 24px; }
.screen-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.screen-header h1 { font-size: 32px; margin: 0; background: linear-gradient(90deg, #1890ff, #52c41a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.header-actions { display: flex; align-items: center; gap: 16px; }
.current-time { font-size: 18px; color: rgba(255, 255, 255, 0.8); }
.screen-content { background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; backdrop-filter: blur(10px); }
.mb-4 { margin-bottom: 16px; }
.stat-card { background: rgba(255, 255, 255, 0.1); border-radius: 12px; }
.stat-card :deep(.ant-statistic-title) { color: rgba(255, 255, 255, 0.65); font-size: 16px; }
.stat-card :deep(.ant-statistic-content) { color: #fff; font-size: 28px; font-weight: 600; }
.chart-card { background: rgba(255, 255, 255, 0.1); }
.chart-card :deep(.ant-card-head) { border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #fff; }
.chart-card :deep(.ant-card-head-title) { font-weight: 600; }
.chart-container { height: 250px; }
.monitor-card { background: rgba(255, 255, 255, 0.1); }
.monitor-card :deep(.ant-card-head) { border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #fff; }
.alert-card { background: rgba(255, 255, 255, 0.1); }
.alert-card :deep(.ant-card-head) { border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #fff; }
.alert-timeline { max-height: 400px; overflow-y: auto; }
.alert-item { color: #fff; }
.alert-message { margin-bottom: 4px; }
.alert-time { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
:deep(.ant-table) { background: transparent; color: #fff; }
:deep(.ant-table thead th) { background: rgba(255, 255, 255, 0.1); color: #fff; }
:deep(.ant-table tbody tr) { background: rgba(255, 255, 255, 0.05); }
:deep(.ant-table-tbody > tr:hover) { background: rgba(255, 255, 255, 0.1); }
</style>
