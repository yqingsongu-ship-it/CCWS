<template>
  <a-card class="monitor-card" :bordered="bordered" hoverable>
    <template #title>
      <div class="card-header">
        <span :class="['status-dot', status]"></span>
        <span class="card-title">{{ title }}</span>
        <a-tag :color="getTypeColor(type)">{{ type }}</a-tag>
      </div>
    </template>

    <div class="card-content">
      <div class="metric-row">
        <span class="metric-label">可用率</span>
        <span :class="['metric-value', getUptimeClass(uptime)]">{{ uptime }}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">响应时间</span>
        <span :class="['metric-value', getResponseTimeClass(responseTime)]">{{ responseTime }}ms</span>
      </div>
      <div class="metric-row" v-if="showLastCheck">
        <span class="metric-label">最后检查</span>
        <span class="metric-value time">{{ lastCheck }}</span>
      </div>
    </div>

    <template #actions>
      <a @click="$emit('view')">详情</a>
      <a @click="$emit('edit')">编辑</a>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MonitorType, MonitorStatus } from '@synthetic-monitoring/shared';

const props = withDefaults(defineProps<{
  title: string;
  type: MonitorType;
  status: MonitorStatus;
  uptime: number;
  responseTime: number;
  lastCheck?: string;
  showLastCheck?: boolean;
  bordered?: boolean;
}>(), {
  showLastCheck: true,
  bordered: true,
});

defineEmits(['view', 'edit']);

const getTypeColor = (type: MonitorType): string => {
  const colors: Record<MonitorType, string> = {
    HTTP: 'blue',
    HTTPS: 'green',
    API: 'volcano',
    PING: 'cyan',
    DNS: 'purple',
    TRACEROUTE: 'orange',
    TCP: 'lime',
    UDP: 'magenta',
    FTP: 'gold',
    PAGE_PERF: 'pink',
  };
  return colors[type] || 'default';
};

const getUptimeClass = (uptime: number): string => {
  if (uptime >= 99.9) return 'good';
  if (uptime >= 99) return 'warning';
  return 'poor';
};

const getResponseTimeClass = (time: number): string => {
  if (time < 200) return 'good';
  if (time < 500) return 'warning';
  return 'poor';
};
</script>

<style scoped>
.monitor-card {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.active { background: #52c41a; }
.status-dot.paused { background: #faad14; }
.status-dot.error,
.status-dot.down { background: #ff4d4f; }

.card-title {
  flex: 1;
  font-weight: 500;
}

.card-content {
  padding: 8px 0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.metric-label {
  color: #666;
  font-size: 13px;
}

.metric-value {
  font-weight: 500;
}

.metric-value.good { color: #52c41a; }
.metric-value.warning { color: #faad14; }
.metric-value.poor { color: #ff4d4f; }
.metric-value.time { color: #999; font-weight: normal; font-size: 12px; }
</style>
