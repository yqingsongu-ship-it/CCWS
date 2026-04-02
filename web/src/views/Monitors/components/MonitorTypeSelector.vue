<template>
  <div class="monitor-type-selector">
    <a-row :gutter="16">
      <a-col :span="8" v-for="type in monitorTypes" :key="type.value">
        <div
          class="type-card"
          :class="{ active: modelValue === type.value }"
          @click="$emit('update:modelValue', type.value)"
        >
          <component :is="type.icon" class="type-icon" />
          <h3>{{ type.label }}</h3>
          <p>{{ type.description }}</p>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import type { MonitorType } from '@synthetic-monitoring/shared';
import {
  GlobalOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  EthernetOutlined,
  WifiOutlined,
  FolderOutlined,
  DashboardOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue';

interface MonitorTypeOption {
  value: MonitorType;
  label: string;
  description: string;
  icon: any;
}

defineProps<{
  modelValue?: MonitorType;
}>();

defineEmits<{
  'update:modelValue': [value: MonitorType];
}>();

const monitorTypes: MonitorTypeOption[] = [
  {
    value: 'HTTPS' as MonitorType,
    label: '网站监控',
    description: '监控网站可用性和加载性能',
    icon: GlobalOutlined,
  },
  {
    value: 'HTTP' as MonitorType,
    label: 'HTTP 监控',
    description: '监控 HTTP 端点可用性',
    icon: GlobalOutlined,
  },
  {
    value: 'API' as MonitorType,
    label: 'API 监控',
    description: '监控 REST/SOAP API',
    icon: ApiOutlined,
  },
  {
    value: 'PING' as MonitorType,
    label: 'PING 监控',
    description: '监控主机连通性',
    icon: ThunderboltOutlined,
  },
  {
    value: 'DNS' as MonitorType,
    label: 'DNS 监控',
    description: '监控 DNS 解析',
    icon: RocketOutlined,
  },
  {
    value: 'TCP' as MonitorType,
    label: 'TCP 端口监控',
    description: '监控 TCP 端口可用性',
    icon: EthernetOutlined,
  },
  {
    value: 'UDP' as MonitorType,
    label: 'UDP 监控',
    description: '监控 UDP 服务',
    icon: WifiOutlined,
  },
  {
    value: 'FTP' as MonitorType,
    label: 'FTP 监控',
    description: '监控 FTP 服务',
    icon: FolderOutlined,
  },
  {
    value: 'PAGE_PERF' as MonitorType,
    label: '页面性能',
    description: '监控页面加载性能',
    icon: DashboardOutlined,
  },
];
</script>

<style scoped>
.monitor-type-selector {
  margin: 16px 0;
}

.type-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  margin-bottom: 16px;
}

.type-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  transform: translateY(-2px);
}

.type-card.active {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.type-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 12px;
}

.type-card h3 {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.type-card p {
  margin: 0;
  font-size: 12px;
  color: #666;
}
</style>
