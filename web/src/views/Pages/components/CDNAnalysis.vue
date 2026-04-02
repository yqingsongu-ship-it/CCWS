<template>
  <div class="cdn-analysis">
    <div v-if="!data || data.length === 0" class="empty-state">
      <a-empty description="暂无 CDN 分析数据" />
    </div>
    <div v-else class="cdn-container">
      <a-table :columns="columns" :data-source="data" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span :title="record.name">{{ truncateName(record.name) }}</span>
          </template>
          <template v-if="column.key === 'cdn'">
            <a-tag :color="getCdnColor(record.cdn)">{{ record.cdn || 'Unknown' }}</a-tag>
          </template>
          <template v-if="column.key === 'type'">
            <a-tag color="blue">{{ record.type }}</a-tag>
          </template>
          <template v-if="column.key === 'size'">
            {{ formatSize(record.size) }}
          </template>
          <template v-if="column.key === 'time'">
            {{ record.time?.toFixed(0) || '-' }}ms
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CDNItem {
  name: string;
  cdn?: string;
  type: string;
  size?: number;
  time?: number;
}

defineProps<{
  data: CDNItem[];
}>();

const columns = [
  { title: '资源名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'CDN 厂商', key: 'cdn', width: 120 },
  { title: '类型', key: 'type', width: 80 },
  { title: '大小', key: 'size', width: 90 },
  { title: '加载时间', key: 'time', width: 100, sorter: true },
];

const truncateName = (name: string) => {
  if (!name) return '';
  if (name.length <= 60) return name;
  return '...' + name.slice(-57);
};

const formatSize = (size?: number) => {
  if (!size && size !== 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getCdnColor = (cdn?: string) => {
  if (!cdn) return 'default';
  const colors: Record<string, string> = {
    Cloudflare: 'orange',
    Akamai: 'blue',
    Fastly: 'purple',
    CloudFront: 'yellow',
    Aliyun: 'green',
    Tencent: 'cyan',
  };
  return colors[cdn] || 'default';
};
</script>

<style scoped>
.cdn-analysis { padding: 16px; }
.empty-state { display: flex; justify-content: center; align-items: center; height: 200px; }
.cdn-container { overflow-x: auto; }
</style>
