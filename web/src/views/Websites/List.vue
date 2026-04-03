<template>
  <div class="websites-page">
    <a-page-header title="网站监控" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData">
            <reload-outlined />
            刷新
          </a-button>
          <a-button type="primary" @click="showCreateModal">
            <plus-outlined />
            新建网站监控
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card :bordered="false">
      <!-- 筛选区 -->
      <a-form layout="inline" :model="filterForm" class="mb-4">
        <a-form-item label="搜索">
          <a-input v-model:value="filterForm.search" placeholder="输入名称或 URL 搜索" style="width: 200px" @pressEnter="fetchData">
            <template #suffix>
              <search-outlined @click="fetchData" style="cursor: pointer" />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="filterForm.status" placeholder="全部状态" allowClear style="width: 120px">
            <a-select-option value="ACTIVE">运行中</a-select-option>
            <a-select-option value="PAUSED">已暂停</a-select-option>
            <a-select-option value="ERROR">错误</a-select-option>
            <a-select-option value="DOWN">已下线</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="监控类型">
          <a-select v-model:value="filterForm.type" placeholder="全部类型" allowClear style="width: 100px">
            <a-select-option value="HTTP">HTTP</a-select-option>
            <a-select-option value="HTTPS">HTTPS</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="fetchData">查询</a-button>
            <a-button @click="resetFilter">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="websites"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-space>
              <span :class="['status-dot', record.status.toLowerCase()]"></span>
              <a @click="goToDetail(record.id)">{{ record.name }}</a>
            </a-space>
          </template>
          <template v-if="column.key === 'url'">
            <a-typography-text copyable :ellipsis="{ tooltip: record.target }">{{ record.target }}</a-typography-text>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge :status="getStatusStatus(record.status)" :text="getStatusText(record.status)" />
          </template>
          <template v-if="column.key === 'uptime'">
            <a-progress
              :percent="record.uptime || 0"
              :strokeColor="getUptimeColor(record.uptime || 0)"
              :showInfo="false"
              size="small"
            />
            <span :style="{ color: getUptimeColor(record.uptime || 0) }">{{ (record.uptime || 0).toFixed(2) }}%</span>
          </template>
          <template v-if="column.key === 'responseTime'">
            {{ record.responseTime || '-' }}ms
          </template>
          <template v-if="column.key === 'lastCheck'">
            {{ formatTime(record.lastCheckAt) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="handleQuickCheck(record)">
                <thunderbolt-outlined /> 快速检测
              </a-button>
              <a-button size="small" @click="handleToggle(record)">
                {{ record.status === 'ACTIVE' ? '暂停' : '启用' }}
              </a-button>
              <a-button size="small" @click="goToDetail(record.id)">详情</a-button>
              <a-button size="small" @click="showEditModal(record)">编辑</a-button>
              <a-button size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新建/编辑弹窗 -->
    <website-monitor-modal
      v-model:open="modalVisible"
      :editData="editData"
      @success="handleModalSuccess"
      @close="modalVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, ReloadOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';
import type { MonitorTask, MonitorStatus } from '@synthetic-monitoring/shared';
import { useMonitorStore } from '@/stores/monitor';
import WebsiteMonitorModal from './WebsiteMonitorModal.vue';

const router = useRouter();
const monitorStore = useMonitorStore();

const websites = ref<MonitorTask[]>([]);
const loading = ref(false);

// 弹窗相关
const modalVisible = ref(false);
const editData = ref<any>(null);

const filterForm = reactive({
  search: '',
  status: '',
  type: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 200, sorter: true },
  { title: 'URL', dataIndex: 'target', key: 'url', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '可用率', key: 'uptime', width: 120 },
  { title: '响应时间', key: 'responseTime', width: 100, sorter: true },
  { title: '最后检查', key: 'lastCheck', width: 180 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' as const },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const filters: Record<string, string> = {};
    if (filterForm.search) filters.search = filterForm.search;
    if (filterForm.status) filters.status = filterForm.status;
    if (filterForm.type) filters.type = filterForm.type;

    const result = await monitorStore.fetchMonitors(
      pagination.current,
      pagination.pageSize,
      filters
    );

    // 过滤出 HTTP/HTTPS 类型的监控
    const websiteMonitors = result.items.filter((item: MonitorTask) =>
      item.type === 'HTTP' || item.type === 'HTTPS'
    );

    websites.value = websiteMonitors.map((item: MonitorTask) => ({
      ...item,
      uptime: calculateUptime(item),
      responseTime: getAvgResponseTime(item),
    }));
    pagination.total = websiteMonitors.length;
  } catch (error: any) {
    message.error('加载失败：' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const calculateUptime = (monitor: MonitorTask): number => {
  // 从监控结果的 latestResult 获取可用率
  return monitor.uptime || 99.9;
};

const getAvgResponseTime = (monitor: MonitorTask): number => {
  // 从监控结果获取平均响应时间
  if (monitor.latestResult?.responseTime) {
    return monitor.latestResult.responseTime;
  }
  return monitor.avgResponseTime || 0;
};

const handleTableChange = (pag: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchData();
};

const resetFilter = () => {
  filterForm.search = '';
  filterForm.status = '';
  filterForm.type = '';
  pagination.current = 1;
  fetchData();
};

const showCreateModal = () => {
  editData.value = null;
  modalVisible.value = false;
  setTimeout(() => {
    modalVisible.value = true;
  }, 10);
};

const showEditModal = (record: MonitorTask) => {
  editData.value = record;
  modalVisible.value = true;
};

const handleModalSuccess = () => {
  modalVisible.value = false;
  fetchData();
};

const goToDetail = (id: string) => {
  router.push(`/websites/${id}`);
};

const handleQuickCheck = async (record: MonitorTask) => {
  try {
    const result = await monitorStore.quickCheck(record.id);
    message.success('快速检测完成');
    console.log('Quick check result:', result);
    fetchData();
  } catch (error: any) {
    message.error('快速检测失败：' + (error.message || '未知错误'));
  }
};

const handleToggle = async (record: MonitorTask) => {
  try {
    await monitorStore.toggleMonitor(record.id);
    message.success('操作成功');
    fetchData();
  } catch (error: any) {
    message.error('操作失败：' + (error.message || '未知错误'));
  }
};

const handleDelete = (record: MonitorTask) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除网站监控 "${record.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await monitorStore.deleteMonitor(record.id);
        message.success('删除成功');
        fetchData();
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

const getUptimeColor = (uptime: number) => {
  if (uptime >= 99.9) return '#52c41a';
  if (uptime >= 99) return '#faad14';
  return '#ff4d4f';
};

const formatTime = (time?: Date | string | null) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.websites-page {
  padding: 24px;
}

.mb-4 {
  margin-bottom: 16px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.active {
  background: #52c41a;
}

.status-dot.paused {
  background: #faad14;
}

.status-dot.error,
.status-dot.down {
  background: #ff4d4f;
}
</style>
