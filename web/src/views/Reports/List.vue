<template>
  <div class="reports-page">
    <a-page-header title="数据报表" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData"><reload-outlined />刷新</a-button>
          <a-dropdown>
            <a-button type="primary">导出报表<a-down-outlined /></a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="pdf">导出 PDF</a-menu-item>
                <a-menu-item key="csv">导出 CSV</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </a-page-header>

    <a-card :bordered="false">
      <a-form layout="inline" :model="filterForm" class="mb-4">
        <a-form-item label="报表类型">
          <a-select v-model:value="filterForm.type" placeholder="全部类型" allowClear style="width: 120px">
            <a-select-option value="daily">日报</a-select-option>
            <a-select-option value="weekly">周报</a-select-option>
            <a-select-option value="monthly">月报</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期">
          <a-range-picker v-model:value="filterForm.dateRange" />
        </a-form-item>
        <a-form-item>
          <a-space><a-button type="primary" @click="fetchData">查询</a-button><a-button @click="resetFilter">重置</a-button></a-space>
        </a-form-item>
      </a-form>

      <a-table :columns="columns" :data-source="reports" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="getTypeColor(record.type)">{{ getTypeLabel(record.type) }}</a-tag>
          </template>
          <template v-if="column.key === 'uptime'">
            <a-progress :percent="record.uptime" :strokeColor="getUptimeColor(record.uptime)" :showInfo="false" size="small" />
            <span :style="{ color: getUptimeColor(record.uptime) }">{{ record.uptime.toFixed(2) }}%</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="viewReport(record)">查看</a-button>
              <a-button size="small" @click="downloadReport(record)">下载</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { ReloadOutlined, DownOutlined } from '@ant-design/icons-vue';
import dayjs from 'dayjs';

interface Report {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  uptime: number;
  totalChecks: number;
  totalAlerts: number;
  createdAt: string;
}

const reports = ref<Report[]>([]);
const loading = ref(false);

const filterForm = reactive({ type: '', dateRange: [] as any[] });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` });

const columns = [
  { title: '报表类型', key: 'type', width: 100 },
  { title: '统计周期', dataIndex: 'periodStart', key: 'periodStart', width: 200 },
  { title: '可用性', key: 'uptime', width: 150 },
  { title: '总检查次数', dataIndex: 'totalChecks', key: 'totalChecks', width: 120 },
  { title: '告警次数', dataIndex: 'totalAlerts', key: 'totalAlerts', width: 100 },
  { title: '生成时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 150, fixed: 'right' as const },
];

const fetchData = async () => {
  loading.value = true;
  try {
    // TODO: 调用 API 获取报表列表
    reports.value = generateMockReports();
  } catch (error: any) {
    message.error('加载失败：' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const generateMockReports = (): Report[] => {
  const mock: Report[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const type = i % 3 === 0 ? 'daily' : i % 3 === 1 ? 'weekly' : 'monthly';
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    mock.push({
      id: `report-${i}`,
      type,
      periodStart: date.toISOString().split('T')[0],
      periodEnd: date.toISOString().split('T')[0],
      uptime: 99.5 + Math.random() * 0.5,
      totalChecks: Math.floor(Math.random() * 10000) + 1000,
      totalAlerts: Math.floor(Math.random() * 50),
      createdAt: date.toISOString(),
    });
  }
  return mock;
};

const handleTableChange = (pag: any) => { pagination.current = pag.current; pagination.pageSize = pag.pageSize; };
const resetFilter = () => { filterForm.type = ''; filterForm.dateRange = []; fetchData(); };

const viewReport = (record: Report) => {
  // 根据报表类型跳转到对应详情页
  const routeMap: Record<string, string> = {
    daily: '/reports/daily',
    weekly: '/reports/weekly',
    monthly: '/reports/monthly',
  };
  const route = routeMap[record.type];
  if (route) {
    router.push(route);
  } else {
    message.info('报表类型暂不支持');
  }
};

const downloadReport = (record: Report) => { message.info('下载报表功能需要后端 API 支持'); };

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = { daily: 'blue', weekly: 'green', monthly: 'purple' };
  return colors[type] || 'default';
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = { daily: '日报', weekly: '周报', monthly: '月报' };
  return labels[type] || type;
};

const getUptimeColor = (uptime: number) => { if (uptime >= 99.9) return '#52c41a'; if (uptime >= 99) return '#faad14'; return '#ff4d4f'; };

onMounted(() => { fetchData(); });
</script>

<style scoped>
.reports-page { padding: 24px; }
.mb-4 { margin-bottom: 16px; }
</style>
