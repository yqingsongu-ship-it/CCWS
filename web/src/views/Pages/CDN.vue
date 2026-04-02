<template>
  <div class="cdn-page">
    <a-page-header
      title="CDN 分析"
      :ghost="false"
      @back="() => $router.push('/pages')"
    />

    <a-row :gutter="16">
      <a-col :span="12">
        <!-- CDN Provider Distribution -->
        <a-card title="CDN 提供商分布" class="mb-card" :bordered="false">
          <div ref="providerChartRef" style="height: 300px;"></div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <!-- Regional Performance -->
        <a-card title="区域响应性能" class="mb-card" :bordered="false">
          <div ref="regionChartRef" style="height: 300px;"></div>
        </a-card>
      </a-col>

      <a-col :span="24">
        <!-- Cache Performance -->
        <a-card title="缓存性能分析" class="mb-card" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic title="缓存命中率" :value="cacheHitRate" suffix="%" :precision="2" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="缓存命中数" :value="cacheHits" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="缓存未命中数" :value="cacheMisses" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="平均缓存延迟" :value="avgCacheLatency" suffix="ms" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>

      <a-col :span="24">
        <!-- CDN Nodes Table -->
        <a-card title="CDN 节点详情" :bordered="false">
          <a-table :columns="columns" :data-source="cdnNodes" :pagination="false" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'provider'">
                <a-tag :color="record.providerColor">{{ record.provider }}</a-tag>
              </template>
              <template v-if="column.key === 'status'">
                <a-badge :status="record.status === 'normal' ? 'success' : 'error'" :text="record.status === 'normal' ? '正常' : '异常'" />
              </template>
              <template v-if="column.key === 'hitRate'">
                <a-progress
                  :percent="record.hitRate"
                  :strokeColor="record.hitRate >= 90 ? '#52c41a' : record.hitRate >= 70 ? '#faad14' : '#ff4d4f'"
                  size="small"
                />
              </template>
              <template v-if="column.key === 'responseTime'">
                <span :style="{ color: getResponseTimeColor(record.responseTime) }">{{ record.responseTime }}ms</span>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const cacheHitRate = ref(94.5);
const cacheHits = ref(12580);
const cacheMisses = ref(725);
const avgCacheLatency = ref(12);

const cdnNodes = ref([
  { id: '1', provider: 'CloudFlare', providerColor: 'orange', region: '华北', city: '北京', status: 'normal', hitRate: 95, responseTime: 25, requests: 4520 },
  { id: '2', provider: 'CloudFlare', providerColor: 'orange', region: '华东', city: '上海', status: 'normal', hitRate: 93, responseTime: 28, requests: 3850 },
  { id: '3', provider: 'Akamai', providerColor: 'blue', region: '华南', city: '广州', status: 'normal', hitRate: 91, responseTime: 32, requests: 2950 },
  { id: '4', provider: 'Akamai', providerColor: 'blue', region: '西南', city: '成都', status: 'normal', hitRate: 89, responseTime: 45, requests: 1820 },
  { id: '5', provider: '网宿', providerColor: 'green', region: '华北', city: '天津', status: 'normal', hitRate: 96, responseTime: 22, requests: 2150 },
  { id: '6', provider: '网宿', providerColor: 'green', region: '华中', city: '武汉', status: 'warning', hitRate: 85, responseTime: 58, requests: 1450 },
]);

const columns = [
  { title: 'CDN 提供商', dataIndex: 'provider', key: 'provider', width: 120 },
  { title: '区域', dataIndex: 'region', key: 'region', width: 80 },
  { title: '城市', dataIndex: 'city', key: 'city', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '缓存命中率', key: 'hitRate', width: 150 },
  { title: '响应时间', key: 'responseTime', width: 100 },
  { title: '请求数', dataIndex: 'requests', key: 'requests', width: 100 },
];

const getResponseTimeColor = (time: number) => {
  if (time < 30) return '#52c41a';
  if (time < 50) return '#faad14';
  return '#ff4d4f';
};
</script>

<style scoped>
.cdn-page {
  padding: 24px;
}

.mb-card {
  margin-bottom: 16px;
}
</style>
