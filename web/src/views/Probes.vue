<template>
  <div class="probes-page">
    <a-page-header title="探测点管理" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="showCreateModal">
            <plus-outlined />
            新建探测点
          </a-button>
          <a-button @click="fetchData">
            <reload-outlined />
            刷新
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="mb-card">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="总探测点" :value="probeStore.stats.total" suffix="个">
            <template #prefix><appstore-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="在线" :value="probeStore.stats.online" valueStyle="color: #52c41a">
            <template #prefix><check-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="离线" :value="probeStore.stats.offline" valueStyle="color: #ff4d4f">
            <template #prefix><close-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="忙碌" :value="probeStore.stats.busy" valueStyle="color: #faad14">
            <template #prefix><pause-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 探针列表 -->
    <a-card :bordered="false">
      <a-empty v-if="probeStore.probes.length === 0" description="暂无探测点">
        <template #description>
          <p>探测点用于从不同区域监测您的服务</p>
          <a-button type="primary" @click="showCreateModal">创建第一个探测点</a-button>
        </template>
      </a-empty>
      <a-row v-else :gutter="16">
        <a-col :span="8" v-for="probe in probeStore.probes" :key="probe.id">
          <a-card class="probe-card" hoverable>
            <a-card-meta>
              <template #title>
                <a-space>
                  <span :class="['status-dot', probe.status.toLowerCase()]"></span>
                  {{ probe.name }}
                </a-space>
              </template>
              <template #avatar>
                <a-avatar :style="{ backgroundColor: getStatusColor(probe.status) }">
                  <template #icon><cloud-outlined /></template>
                </a-avatar>
              </template>
              <template #description>
                <div class="probe-info">
                  <p><label>位置：</label>{{ formatLocation(probe.location) }}</p>
                  <p><label>IP：</label>{{ probe.ip || '-' }}</p>
                  <p><label>任务数：</label>{{ (probe as any).assignedTaskCount || 0 }}</p>
                  <p><label>能力：</label></p>
                  <div class="capabilities">
                    <a-tag v-for="cap in getCapabilities(probe)" :key="cap" size="small">
                      {{ cap }}
                    </a-tag>
                  </div>
                  <p><label>最后心跳：</label>{{ formatTimeLocal((probe as any).lastSeenAt || probe.lastHeartbeat) }}</p>
                </div>
              </template>
            </a-card-meta>
            <template #actions>
              <a-button size="small" @click="handleViewLogs(probe)">日志</a-button>
              <a-button size="small" danger @click="handleDelete(probe)">删除</a-button>
            </template>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- 新建探针弹窗 -->
    <a-modal
      v-model:open="createModalVisible"
      title="新建探测点"
      @ok="handleCreateProbe"
      @cancel="createModalVisible = false"
      :confirmLoading="creating"
    >
      <a-form :model="probeForm" layout="vertical">
        <a-form-item label="探测点名称" required>
          <a-input v-model:value="probeForm.name" placeholder="例如：北京联通探针" />
        </a-form-item>
        <a-form-item label="区域" required>
          <a-select v-model:value="probeForm.region" placeholder="选择区域">
            <a-select-option value="beijing">北京</a-select-option>
            <a-select-option value="shanghai">上海</a-select-option>
            <a-select-option value="guangzhou">广州</a-select-option>
            <a-select-option value="shenzhen">深圳</a-select-option>
            <a-select-option value="us-east">美东</a-select-option>
            <a-select-option value="us-west">美西</a-select-option>
            <a-select-option value="eu-west">欧洲</a-select-option>
            <a-select-option value="ap-southeast">东南亚</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="位置">
          <a-input v-model:value="probeForm.location" placeholder="例如：北京市朝阳区" />
        </a-form-item>
        <a-form-item label="服务商">
          <a-input v-model:value="probeForm.provider" placeholder="例如：中国联通" />
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="probeForm.tags"
            mode="multiple"
            placeholder="选择标签"
          >
            <a-select-option value="production">生产环境</a-select-option>
            <a-select-option value="staging">预发布环境</a-select-option>
            <a-select-option value="development">开发环境</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  CloudOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import type { Probe } from '@synthetic-monitoring/shared';
import { useProbeStore } from '../stores/probe';

const probeStore = useProbeStore();

const createModalVisible = ref(false);
const creating = ref(false);
const probeForm = reactive({
  name: '',
  region: '',
  location: '',
  provider: '',
  tags: [] as string[],
});

const showCreateModal = () => {
  probeForm.name = '';
  probeForm.region = '';
  probeForm.location = '';
  probeForm.provider = '';
  probeForm.tags = [];
  createModalVisible.value = true;
};

const handleCreateProbe = async () => {
  if (!probeForm.name || !probeForm.region) {
    message.error('请填写必填项');
    return;
  }

  try {
    creating.value = true;
    await probeStore.createProbe({
      name: probeForm.name,
      region: probeForm.region,
      location: probeForm.location ? { country: 'China', city: probeForm.location } : undefined,
      provider: probeForm.provider || 'community',
      tags: probeForm.tags,
    });
    message.success('探测点创建成功');
    createModalVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('Failed to create probe:', error);
    message.error('创建失败：' + (error?.message || '未知错误'));
  } finally {
    creating.value = false;
  }
};

// 解析探针能力（从 JSON 字符串或数组）
const getCapabilities = (probe: Probe): string[] => {
  if (Array.isArray(probe.capabilities)) {
    return probe.capabilities;
  }
  if (typeof probe.capabilities === 'string') {
    try {
      return JSON.parse(probe.capabilities);
    } catch {
      return [];
    }
  }
  return [];
};

// 格式化时间（支持 Date 或 string）
const formatTime = (date?: Date | string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const fetchData = async () => {
  try {
    await probeStore.fetchProbes();
  } catch (error: any) {
    console.error('Fetch probes failed:', error);
    message.error('加载探测点失败：' + (error?.message || '未知错误'));
  }
};

const getStatusColor = (status: Probe['status']) => {
  const map: Record<Probe['status'], string> = {
    ONLINE: '#52c41a',
    OFFLINE: '#d9d9d9',
    BUSY: '#faad14',
  };
  return map[status] || '#1890ff';
};

const handleDelete = (probe: Probe) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除探测点 "${probe.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await probeStore.deleteProbe(probe.id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
};

const handleViewLogs = (probe: Probe) => {
  // TODO: Implement logs viewer
  message.info(`查看 ${probe.name} 的日志（待实现）`);
};

const formatTimeLocal = (date?: Date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// 格式化位置对象为字符串
const formatLocation = (location: any): string => {
  if (!location) return '未知';
  if (typeof location === 'string') return location;
  if (location.city && location.country) {
    return `${location.country} - ${location.city}`;
  }
  if (location.city) return location.city;
  if (location.country) return location.country;
  return '未知';
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.probes-page {
  padding: 24px;
}

.mb-card {
  margin-bottom: 16px;
}

.probe-card {
  margin-bottom: 16px;
}

.probe-info p {
  margin: 8px 0;
  font-size: 13px;
}

.probe-info label {
  color: #666;
  font-weight: 500;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #52c41a;
}

.status-dot.offline {
  background: #d9d9d9;
}

.status-dot.busy {
  background: #faad14;
}

.capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
</style>
