<template>
  <div class="monitors-page">
    <a-page-header title="监控任务管理" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData">
            <reload-outlined />
            刷新
          </a-button>
          <a-button type="primary" @click="handleCreateMonitor">
            <plus-outlined />
            新建监控
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card class="mt-4" :bordered="false">
      <a-table
        :columns="columns"
        :data-source="monitorStore.monitors"
        :loading="monitorStore.loading"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-space>
              <span :class="['status-dot', record.status.toLowerCase()]"></span>
              <span>{{ record.name }}</span>
            </a-space>
          </template>
          <template v-if="column.key === 'type'">
            <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
          </template>
          <template v-if="column.key === 'target'">
            <a-typography-text copyable :ellipsis="{ tooltip: record.target }">{{ record.target }}</a-typography-text>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge :status="getStatusStatus(record.status)" :text="getStatusText(record.status)" />
          </template>
          <template v-if="column.key === 'interval'">
            {{ record.interval }}秒
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="handleQuickCheck(record)">
                <thunderbolt-outlined /> 快速检测
              </a-button>
              <a-button size="small" @click="handleToggle(record)">
                {{ record.status === 'ACTIVE' ? '暂停' : '启用' }}
              </a-button>
              <a-button size="small" @click="$router.push(`/monitors/${record.id}/edit`)">编辑</a-button>
              <a-button size="small" @click="handleViewResults(record)">详情</a-button>
              <a-button size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 结果详情弹窗 -->
    <a-modal
      v-model:open="resultsVisible"
      title="监控结果详情"
      :footer="null"
      width="800px"
    >
      <a-descriptions bordered :column="2" v-if="selectedMonitor">
        <a-descriptions-item label="监控名称">{{ selectedMonitor.name }}</a-descriptions-item>
        <a-descriptions-item label="监控类型">
          <a-tag :color="getTypeColor(selectedMonitor.type)">{{ selectedMonitor.type }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="监控目标" :span="2">{{ selectedMonitor.target }}</a-descriptions-item>
        <a-descriptions-item label="检查间隔">{{ selectedMonitor.interval }}秒</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-badge :status="getStatusStatus(selectedMonitor.status)" :text="getStatusText(selectedMonitor.status)" />
        </a-descriptions-item>
      </a-descriptions>

      <a-divider />

      <a-table
        :columns="resultColumns"
        :data-source="monitorResults"
        :pagination="{ pageSize: 5 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'success'">
            <a-badge :status="record.success ? 'success' : 'error'" :text="record.success ? '成功' : '失败'" />
          </template>
          <template v-if="column.key === 'responseTime'">
            {{ record.responseTime || '-' }}ms
          </template>
          <template v-if="column.key === 'timestamp'">
            {{ formatTime(record.timestamp) }}
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';
import type { MonitorTask, MonitorStatus, MonitorType, CheckResult } from '@synthetic-monitoring/shared';
import { useMonitorStore } from '../stores/monitor';

const router = useRouter();
const monitorStore = useMonitorStore();

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '目标', dataIndex: 'target', key: 'target', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '间隔', dataIndex: 'interval', key: 'interval', width: 80 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
];

const resultColumns = [
  { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180 },
  { title: '状态', dataIndex: 'success', key: 'success', width: 80 },
  { title: '响应时间', dataIndex: 'responseTime', key: 'responseTime', width: 100 },
  { title: '状态码', dataIndex: 'statusCode', key: 'statusCode', width: 80 },
  { title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage', ellipsis: true },
];

const resultsVisible = ref(false);
const selectedMonitor = ref<MonitorTask | null>(null);
const monitorResults = ref<CheckResult[]>([]);

const fetchData = async () => {
  await monitorStore.fetchMonitors();
};

const handleToggle = async (record: MonitorTask) => {
  try {
    await monitorStore.toggleMonitor(record.id);
    message.success('操作成功');
  } catch (error) {
    message.error('操作失败');
  }
};

const handleViewResults = async (record: MonitorTask) => {
  selectedMonitor.value = record;
  monitorResults.value = await monitorStore.fetchResults(record.id);
  resultsVisible.value = true;
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

const handleDelete = (record: MonitorTask) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除监控任务 "${record.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await monitorStore.deleteMonitor(record.id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
};

const handleCreateMonitor = () => {
  router.push('/monitors/create');
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

const getTypeColor = (type?: MonitorType) => {
  const map: Record<MonitorType, string> = {
    HTTP: 'blue',
    HTTPS: 'green',
    PING: 'cyan',
    DNS: 'purple',
    TRACEROUTE: 'orange',
    FTP: 'gold',
    TCP: 'lime',
    UDP: 'magenta',
    API: 'volcano',
  };
  return map[type || 'HTTP'] || 'default';
};

const formatTime = (time?: Date | string) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.monitors-page {
  padding: 24px;
}

.mt-4 {
  margin-top: 16px;
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
