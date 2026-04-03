<template>
  <div class="website-detail-page">
    <a-page-header
      title="网站监控详情"
      :ghost="false"
      @back="() => $router.push('/websites')"
    >
      <template #extra>
        <a-space>
          <a-button @click="handleQuickCheck">
            <thunderbolt-outlined />
            快速检测
          </a-button>
          <a-button @click="$router.push(`/monitors/${id}/edit`)">编辑</a-button>
          <a-button danger @click="handleDelete">删除</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-row :gutter="16" class="mt-4">
      <!-- 基本信息 -->
      <a-col :span="8">
        <a-card title="基本信息" :bordered="false">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="监控名称">{{ monitor?.name }}</a-descriptions-item>
            <a-descriptions-item label="监控类型">
              <a-tag color="blue">{{ monitor?.type }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="监控目标">
              <a-typography-text copyable>{{ monitor?.target }}</a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item label="检查间隔">{{ monitor?.interval }}秒</a-descriptions-item>
            <a-descriptions-item label="超时时间">{{ monitor?.timeout }}ms</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-badge :status="getStatusStatus(monitor?.status)" :text="getStatusText(monitor?.status)" />
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatTime(monitor?.createdAt) }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- SSL 证书信息 -->
      <a-col :span="8">
        <a-card title="SSL 证书信息" :bordered="false" v-if="monitor?.type === 'HTTPS'">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="证书状态">
              <a-badge v-if="sslInfo.valid" status="success" text="有效" />
              <a-badge v-else status="error" text="无效或已过期" />
            </a-descriptions-item>
            <a-descriptions-item label="颁发机构">{{ sslInfo.issuer || '-' }}</a-descriptions-item>
            <a-descriptions-item label="有效期至">{{ sslInfo.expiryDate || '-' }}</a-descriptions-item>
            <a-descriptions-item label="剩余天数">
              <a-tag :color="sslInfo.daysLeft && sslInfo.daysLeft > 30 ? 'green' : sslInfo.daysLeft && sslInfo.daysLeft > 7 ? 'orange' : 'red'">
                {{ sslInfo.daysLeft || '-' }}天
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- 统计卡片 -->
      <a-col :span="8">
        <a-card :bordered="false">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="今日可用率" :value="stats.uptime" suffix="%" :valueStyle="stats.uptime >= 99.9 ? { color: '#52c41a' } : {}" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="平均响应时间" :value="stats.avgResponseTime" suffix="ms" />
            </a-col>
            <a-col :span="12" class="mt-4">
              <a-statistic title="总检查次数" :value="stats.totalChecks" />
            </a-col>
            <a-col :span="12" class="mt-4">
              <a-statistic title="失败次数" :value="stats.failedChecks" :valueStyle="{ color: '#ff4d4f' }" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <!-- 响应时间趋势 -->
    <a-card title="响应时间趋势" class="mt-4" :bordered="false">
      <template #extra>
        <a-radio-group v-model:value="statsPeriod" @change="loadStats">
          <a-radio-button value="1h">1 小时</a-radio-button>
          <a-radio-button value="6h">6 小时</a-radio-button>
          <a-radio-button value="24h">24 小时</a-radio-button>
          <a-radio-button value="7d">7 天</a-radio-button>
          <a-radio-button value="30d">30 天</a-radio-button>
        </a-radio-group>
      </template>
      <div class="chart-container">
        <canvas ref="responseTimeChart"></canvas>
      </div>
    </a-card>

    <!-- 历史检查记录 -->
    <a-card title="历史检查记录" class="mt-4" :bordered="false">
      <template #extra>
        <a-space>
          <a-button size="small" @click="loadCheckResults">
            <reload-outlined />
            刷新
          </a-button>
        </a-space>
      </template>
      <a-table
        :columns="checkResultColumns"
        :data-source="checkResults"
        :loading="checkResultsLoading"
        :pagination="checkResultPagination"
        @change="handleCheckResultTableChange"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'success'">
            <a-badge :status="record.success ? 'success' : 'error'" :text="record.success ? '成功' : '失败'" />
          </template>
          <template v-if="column.key === 'responseTime'">
            {{ record.responseTime || '-' }}ms
          </template>
          <template v-if="column.key === 'statusCode'">
            <a-tag :color="record.statusCode >= 200 && record.statusCode < 300 ? 'green' : 'orange'">
              {{ record.statusCode || '-' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'timestamp'">
            {{ formatTime(record.timestamp) }}
          </template>
          <template v-if="column.key === 'probe'">
            <a-tag>{{ record.probeName || '-' }}</a-tag>
          </template>
          <template v-if="column.key === 'error'">
            <a-typography-text v-if="record.errorMessage" :ellipsis="{ tooltip: record.errorMessage }" type="danger">
              {{ record.errorMessage }}
            </a-typography-text>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 告警历史 -->
    <a-card title="告警历史" class="mt-4" :bordered="false">
      <a-empty v-if="alerts.length === 0" description="暂无告警" />
      <a-timeline v-else>
        <a-timeline-item v-for="alert in alerts" :key="alert.id" :color="getAlertColor(alert.severity)">
          <template #dot>
            <a-badge :status="getAlertBadgeStatus(alert.severity)" />
          </template>
          <div class="alert-item">
            <div class="alert-header">
              <span class="alert-type">{{ alert.type }}</span>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-footer">
              <a-tag :color="getAlertColor(alert.severity)">{{ alert.severity }}</a-tag>
              <a-tag v-if="alert.acknowledged" color="blue">已确认</a-tag>
              <a-tag v-else color="default">未确认</a-tag>
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import type { MonitorTask, MonitorStatus, CheckResult, AlertEvent } from '@synthetic-monitoring/shared';
import { useMonitorStore } from '@/stores/monitor';
import Chart from 'chart.js/auto';

const router = useRouter();
const route = useRoute();
const monitorStore = useMonitorStore();

const id = ref<string>(route.params.id as string);
const monitor = ref<MonitorTask | null>(null);
const loading = ref(false);
const statsPeriod = ref('24h');

const stats = ref({
  uptime: 0,
  avgResponseTime: 0,
  totalChecks: 0,
  failedChecks: 0,
});

const sslInfo = ref({
  valid: true,
  issuer: '',
  expiryDate: '',
  daysLeft: 0,
});

const checkResults = ref<CheckResult[]>([]);
const checkResultsLoading = ref(false);
const checkResultPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
});

const alerts = ref<AlertEvent[]>([]);
const responseTimeChart = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const checkResultColumns = [
  { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180, sorter: true },
  { title: '状态', dataIndex: 'success', key: 'success', width: 80 },
  { title: '响应时间', key: 'responseTime', width: 100, sorter: true },
  { title: '状态码', key: 'statusCode', width: 80 },
  { title: '探针', key: 'probe', width: 100 },
  { title: '错误信息', key: 'error', ellipsis: true },
];

const loadMonitor = async () => {
  loading.value = true;
  try {
    const result = await monitorStore.getMonitorById(id.value);
    monitor.value = result;
    loadSslInfo();
  } catch (error: any) {
    message.error('加载监控详情失败：' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const loadSslInfo = async () => {
  if (monitor.value?.type !== 'HTTPS') return;
  try {
    // 从最近的检查结果中获取 SSL 信息
    const result = await monitorStore.fetchResults(id.value, 1, 1);
    if (result.items && result.items.length > 0) {
      const latestCheck = result.items[0];
      if (latestCheck.sslInfo) {
        sslInfo.value = {
          valid: latestCheck.sslInfo.valid ?? true,
          issuer: latestCheck.sslInfo.issuer || '-',
          expiryDate: latestCheck.sslInfo.validTo ? new Date(latestCheck.sslInfo.validTo).toLocaleDateString('zh-CN') : '-',
          daysLeft: latestCheck.sslInfo.daysLeft || 0,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load SSL info:', error);
  }
};

const loadStats = async () => {
  try {
    const result = await monitorStore.fetchStats(id.value, statsPeriod.value);
    if (result) {
      stats.value = {
        uptime: parseFloat(result.uptime) || 0,
        avgResponseTime: parseFloat(result.avgResponseTime) || 0,
        totalChecks: result.totalChecks || 0,
        failedChecks: result.failedChecks || 0,
      };
    }
    loadResponseTimeChart();
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
};

const loadResponseTimeChart = async () => {
  try {
    // 获取响应时间数据
    const statsResult = await monitorStore.fetchStats(id.value, statsPeriod.value);
    const resultsResult = await monitorStore.fetchResults(id.value, 1, 50);

    let chartData = {
      labels: [] as string[],
      datasets: [{
        label: '响应时间 (ms)',
        data: [] as number[],
        borderColor: '#1890ff',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
        fill: true,
        tension: 0.4,
      }],
    };

    // 如果有检查结果数据，使用真实数据
    if (resultsResult.items && resultsResult.items.length > 0) {
      // 反转数组使其按时间正序排列
      const items = [...resultsResult.items].reverse();
      items.forEach((item: any) => {
        chartData.labels.push(new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        chartData.datasets[0].data.push(item.responseTime || 0);
      });
    } else {
      // 否则使用统计数据生成模拟数据
      const hours = statsPeriod.value === '1h' ? 6 : statsPeriod.value === '6h' ? 6 : statsPeriod.value === '24h' ? 24 : statsPeriod.value === '7d' ? 7 : 30;
      const avgTime = statsResult ? parseFloat(statsResult.avgResponseTime) || 100 : 100;
      for (let i = 0; i < hours; i++) {
        chartData.labels.push(`${i}:00`);
        chartData.datasets[0].data.push(Math.floor(avgTime * (0.8 + Math.random() * 0.4)));
      }
    }

    if (chartInstance) {
      chartInstance.destroy();
    }

    if (responseTimeChart.value) {
      chartInstance = new Chart(responseTimeChart.value, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  } catch (error) {
    console.error('Failed to load chart data:', error);
  }
};

const loadCheckResults = async () => {
  checkResultsLoading.value = true;
  try {
    const result = await monitorStore.fetchResults(
      id.value,
      checkResultPagination.current,
      checkResultPagination.pageSize
    );
    checkResults.value = result.items || [];
    checkResultPagination.total = result.total || 0;
  } catch (error: any) {
    message.error('加载检查记录失败：' + (error.message || '未知错误'));
  } finally {
    checkResultsLoading.value = false;
  }
};

const handleCheckResultTableChange = (pag: any) => {
  checkResultPagination.current = pag.current;
  checkResultPagination.pageSize = pag.pageSize;
  loadCheckResults();
};

const loadAlerts = async () => {
  // 加载告警历史 - 需要从后端 API 获取
  try {
    // 此处需要后端提供告警历史 API
    // 暂时使用空数组
    alerts.value = [];
  } catch (error) {
    console.error('加载告警历史失败:', error);
  }
};

const handleQuickCheck = async () => {
  try {
    const result = await monitorStore.quickCheck(id.value);
    message.success('快速检测完成');
    console.log('Quick check result:', result);
    loadCheckResults();
  } catch (error: any) {
    message.error('快速检测失败：' + (error.message || '未知错误'));
  }
};

const handleDelete = () => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除网站监控 "${monitor.value?.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await monitorStore.deleteMonitor(id.value);
        message.success('删除成功');
        router.push('/websites');
      } catch (error: any) {
        message.error('删除失败：' + (error.message || '未知错误'));
      }
    },
  });
};

const getStatusStatus = (status?: MonitorStatus) => {
  const map: Record<MonitorStatus, 'success' | 'error' | 'default' | 'processing'> = {
    ACTIVE: 'success',
    PAUSED: 'default',
    ERROR: 'error',
    DOWN: 'error',
  };
  return map[status || 'PAUSED'] || 'default';
};

const getStatusText = (status?: MonitorStatus) => {
  const map: Record<MonitorStatus, string> = {
    ACTIVE: '运行中',
    PAUSED: '已暂停',
    ERROR: '错误',
    DOWN: '已下线',
  };
  return map[status || 'PAUSED'] || status;
};

const getAlertColor = (severity: string) => {
  const colors: Record<string, string> = {
    INFO: '#1890ff',
    WARNING: '#faad14',
    CRITICAL: '#ff4d4f',
    FATAL: '#722ed1',
  };
  return colors[severity] || 'gray';
};

const getAlertBadgeStatus = (severity: string) => {
  const status: Record<string, 'success' | 'processing' | 'error' | 'warning' | 'default'> = {
    INFO: 'success',
    WARNING: 'processing',
    CRITICAL: 'error',
    FATAL: 'error',
  };
  return status[severity] || 'default';
};

const formatTime = (time?: Date | string | null) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

onMounted(() => {
  loadMonitor();
  loadStats();
  loadCheckResults();
  loadAlerts();
});
</script>

<style scoped>
.website-detail-page {
  padding: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.chart-container {
  height: 300px;
}

.alert-item {
  margin-left: 16px;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.alert-type {
  font-weight: 600;
}

.alert-time {
  color: #999;
  font-size: 12px;
}

.alert-message {
  margin-bottom: 8px;
}

.alert-footer {
  display: flex;
  gap: 8px;
}
</style>
