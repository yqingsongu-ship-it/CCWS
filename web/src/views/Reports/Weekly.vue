<template>
  <div class="weekly-report-page">
    <a-page-header title="周报表" :ghost="false" @back="() => $router.push('/reports')">
      <template #extra>
        <a-space>
          <a-button @click="exportReport"><download-outlined />导出 PDF</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-row :gutter="16" class="mt-4">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="监控任务数" :value="report.totalMonitors" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="运行中" :value="report.activeMonitors" :valueStyle="{ color: '#52c41a' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="总检查次数" :value="report.totalChecks" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="可用性" :value="report.uptimePercent" :suffix="'%'" :valueStyle="report.uptimePercent >= 99.9 ? { color: '#52c41a' } : {}" />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="本周趋势" class="mt-4" :bordered="false">
      <div class="chart-container">
        <canvas ref="trendChart"></canvas>
      </div>
    </a-card>

    <a-card title="监控任务详情" class="mt-4" :bordered="false">
      <a-table :columns="columns" :data-source="report.monitors" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'uptime'">
            <a-progress :percent="record.uptimePercent" :strokeColor="getUptimeColor(record.uptimePercent)" :showInfo="false" size="small" />
            <span :style="{ color: getUptimeColor(record.uptimePercent) }">{{ record.uptimePercent.toFixed(2) }}%</span>
          </template>
          <template v-if="column.key === 'responseTime'">{{ record.avgResponseTime.toFixed(0) }}ms</template>
          <template v-if="column.key === 'alerts'">
            <a-tag :color="record.alertsCount > 0 ? 'red' : 'green'">{{ record.alertsCount }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import Chart from 'chart.js/auto';

interface MonitorReport {
  id: string;
  name: string;
  type: string;
  totalChecks: number;
  uptimePercent: number;
  avgResponseTime: number;
  alertsCount: number;
}

interface ReportData {
  totalMonitors: number;
  activeMonitors: number;
  totalChecks: number;
  uptimePercent: number;
  monitors: MonitorReport[];
}

const report = ref<ReportData>({ totalMonitors: 0, activeMonitors: 0, totalChecks: 0, uptimePercent: 0, monitors: [] });
const trendChart = ref<HTMLCanvasElement | null>(null);

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '检查次数', dataIndex: 'totalChecks', key: 'totalChecks', width: 100 },
  { title: '可用性', key: 'uptime', width: 150 },
  { title: '平均响应', key: 'responseTime', width: 100 },
  { title: '告警数', key: 'alerts', width: 80 },
];

const getUptimeColor = (uptime: number) => { if (uptime >= 99.9) return '#52c41a'; if (uptime >= 99) return '#faad14'; return '#ff4d4f'; };
const exportReport = () => { message.info('导出 PDF 功能需要后端报表服务支持'); };

const loadTrendChart = () => {
  if (!trendChart.value) return;
  const data = { labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], datasets: [{ label: '可用性 (%)', data: [99.9, 99.8, 99.95, 99.85, 99.92, 99.88, 99.93], borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.1)', fill: true, tension: 0.4 }] };
  new Chart(trendChart.value, { type: 'line', data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: false, min: 98 } } } });
};

onMounted(() => {
  report.value = { totalMonitors: 25, activeMonitors: 23, totalChecks: 87500, uptimePercent: 99.92, monitors: Array.from({ length: 10 }, (_, i) => ({ id: `m-${i}`, name: `监控任务 ${i + 1}`, type: i % 2 === 0 ? 'HTTP' : 'API', totalChecks: Math.floor(Math.random() * 7000) + 700, uptimePercent: 99 + Math.random(), avgResponseTime: Math.floor(Math.random() * 200) + 50, alertsCount: Math.floor(Math.random() * 20) })) };
  loadTrendChart();
});
</script>

<style scoped>
.weekly-report-page { padding: 24px; }
.mt-4 { margin-top: 16px; }
.chart-container { height: 300px; }
</style>
