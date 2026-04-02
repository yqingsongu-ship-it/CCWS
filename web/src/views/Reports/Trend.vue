<template>
  <div class="trend-report-page">
    <a-page-header title="同期对比" :ghost="false" @back="() => $router.push('/reports')">
      <template #extra>
        <a-space>
          <a-button @click="exportReport"><download-outlined />导出 PDF</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card class="mt-4" :bordered="false">
      <a-form layout="inline" :model="filterForm">
        <a-form-item label="选择项目">
          <a-select v-model:value="filterForm.project" placeholder="选择项目" style="width: 200px">
            <a-select-option value="p1">项目 A</a-select-option>
            <a-select-option value="p2">项目 B</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间范围">
          <a-range-picker v-model:value="filterForm.dateRange" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadTrend">对比</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="趋势对比" class="mt-4" :bordered="false" v-if="showChart">
      <div class="chart-container">
        <canvas ref="trendChart"></canvas>
      </div>
    </a-card>

    <a-card title="数据对比" class="mt-4" :bordered="false" v-if="showChart">
      <a-table :columns="columns" :data-source="trendData" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'uptime'">
            <a-progress :percent="record.uptime" :strokeColor="getUptimeColor(record.uptime)" :showInfo="false" size="small" />
            <span :style="{ color: getUptimeColor(record.uptime) }">{{ record.uptime.toFixed(2) }}%</span>
          </template>
          <template v-if="column.key === 'change'">
            <a-tag :color="record.change >= 0 ? 'green' : 'red'">{{ record.change >= 0 ? '+' : '' }}{{ record.change }}%</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import Chart from 'chart.js/auto';

const filterForm = reactive({ project: '', dateRange: [] as any[] });
const showChart = ref(false);
const trendChart = ref<HTMLCanvasElement | null>(null);
const trendData = ref<any[]>([]);

const columns = [
  { title: '周期', dataIndex: 'period', key: 'period' },
  { title: '可用性', key: 'uptime', width: 180 },
  { title: '平均响应时间', dataIndex: 'responseTime', key: 'responseTime', width: 140 },
  { title: '变化幅度', key: 'change', width: 120 },
];

const getUptimeColor = (uptime: number) => { if (uptime >= 99.9) return '#52c41a'; if (uptime >= 99) return '#faad14'; return '#ff4d4f'; };
const exportReport = () => { message.info('导出 PDF 功能开发中...'); };

const loadTrend = () => {
  showChart.value = true;
  trendData.value = [
    { period: '本周', uptime: 99.95, responseTime: 120, change: 0.05 },
    { period: '上周', uptime: 99.90, responseTime: 125, change: -0.02 },
    { period: '两周前', uptime: 99.92, responseTime: 118, change: 0.03 },
    { period: '三周前', uptime: 99.89, responseTime: 130, change: -0.01 },
  ];
  loadChart();
};

const loadChart = () => {
  if (!trendChart.value) return;
  const data = { labels: ['本周', '上周', '两周前', '三周前'], datasets: [{ label: '可用性 (%)', data: [99.95, 99.90, 99.92, 99.89], borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.1)', fill: true, tension: 0.4 }] };
  new Chart(trendChart.value, { type: 'line', data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: false, min: 98 } } } });
};
</script>

<style scoped>
.trend-report-page { padding: 24px; }
.mt-4 { margin-top: 16px; }
.chart-container { height: 300px; }
</style>
