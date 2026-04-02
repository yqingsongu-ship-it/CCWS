<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card class="stat-card" :bordered="false">
          <a-statistic title="总监控数" :value="monitorStore.stats.total" suffix="个">
            <template #prefix><appstore-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card" :bordered="false">
          <a-statistic title="运行中" :value="monitorStore.stats.active" suffix="个" valueStyle="color: #52c41a">
            <template #prefix><check-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card" :bordered="false">
          <a-statistic title="已暂停" :value="monitorStore.stats.paused" suffix="个" valueStyle="color: #faad14">
            <template #prefix><pause-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card" :bordered="false">
          <a-statistic title="异常" :value="monitorStore.stats.error" suffix="个" valueStyle="color: #ff4d4f">
            <template #prefix><close-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 监控任务列表 -->
    <a-card title="监控任务" class="mt-card" :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData">
            <reload-outlined />
            刷新
          </a-button>
          <a-button type="primary" @click="$router.push('/monitors/create')">
            <plus-outlined />
            新建监控
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="monitorStore.monitors"
        :loading="monitorStore.loading"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        size="middle"
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
            <a-typography-text copyable>{{ record.target }}</a-typography-text>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge :status="getStatusStatus(record.status)" :text="getStatusText(record.status)" />
          </template>
          <template v-if="column.key === 'interval'">
            {{ record.interval }}秒
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
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

    <!-- 最近告警 -->
    <a-row :gutter="16" class="mt-card">
      <a-col :span="12">
        <a-card title="最近告警" :bordered="false">
          <a-empty v-if="alerts.length === 0" description="暂无告警" />
          <a-list v-else :data-source="alerts" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :description="item.message">
                  <template #title>
                    <a-space>
                      <a-badge :status="getAlertSeverityStatus(item.severity)" />
                      <span>{{ item.taskName }}</span>
                      <span class="time-text">{{ formatTime(item.timestamp) }}</span>
                    </a-space>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="监控类型分布" :bordered="false">
          <div class="type-distribution">
            <a-tag v-for="(count, type) in typeDistribution" :key="type" :color="getTypeColor(type as any)">
              {{ type }}: {{ count }}
            </a-tag>
            <a-empty v-if="Object.keys(typeDistribution).length === 0" description="暂无数据" style="width: 100%" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 响应时间趋势 -->
    <a-card title="响应时间趋势" class="mt-card" :bordered="false">
      <div class="chart-placeholder">
        <a-empty description="响应时间趋势图（待接入数据）" />
      </div>
    </a-card>

    <!-- 探针状态 -->
    <a-card title="探针状态" class="mt-card" :bordered="false">
      <a-table
        :columns="probeColumns"
        :data-source="probeStore.probes"
        :loading="probeStore.loading"
        :pagination="{ pageSize: 5 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-space>
              <span :class="['status-dot', record.status?.toLowerCase()]"></span>
              <span>{{ record.name }}</span>
            </a-space>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge :status="record.status === 'ONLINE' ? 'success' : 'default'" :text="record.status === 'ONLINE' ? '在线' : '离线'" />
          </template>
          <template v-if="column.key === 'region'">
            <a-tag>{{ getRegionName(record.region) }}</a-tag>
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
import { ref, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import type { MonitorTask, MonitorStatus, MonitorType, CheckResult, AlertEvent } from '@synthetic-monitoring/shared';
import { useMonitorStore } from '../stores/monitor';
import { useProbeStore } from '../stores/probe';

const monitorStore = useMonitorStore();
const probeStore = useProbeStore();

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '目标', dataIndex: 'target', key: 'target', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '间隔', dataIndex: 'interval', key: 'interval', width: 80 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
];

const probeColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '区域', dataIndex: 'region', key: 'region', width: 120 },
  { title: '版本', dataIndex: 'version', key: 'version', width: 100 },
  { title: '最后活跃', dataIndex: 'lastSeen', key: 'lastSeen', width: 180 },
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
const alerts = ref<AlertEvent[]>([]);

// 监控类型分布
const typeDistribution = computed(() => {
  const dist: Record<string, number> = {};
  monitorStore.monitors.forEach(m => {
    dist[m.type] = (dist[m.type] || 0) + 1;
  });
  return dist;
});

const fetchData = async () => {
  await monitorStore.fetchMonitors();
  await probeStore.fetchProbes();
  // 加载告警数据（待实现）
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

const getRegionName = (region?: string) => {
  const map: Record<string, string> = {
    beijing: '北京',
    shanghai: '上海',
    guangzhou: '广州',
    shenzhen: '深圳',
    'us-east': '美东',
    'us-west': '美西',
    'eu-west': '欧洲',
    'ap-southeast': '东南亚',
  };
  return map[region || ''] || region;
};

const getAlertSeverityStatus = (severity?: string) => {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    INFO: 'success',
    WARNING: 'warning',
    CRITICAL: 'error',
  };
  return map[severity || 'INFO'] || 'success';
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
.dashboard-page {
  padding: 0;
}

.stat-card {
  margin-bottom: 16px;
}

.mt-card {
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

.time-text {
  color: #999;
  font-size: 12px;
}

.type-distribution {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}
</style>
