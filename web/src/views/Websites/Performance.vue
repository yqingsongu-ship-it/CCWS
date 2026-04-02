<template>
  <div class="website-performance-page">
    <a-page-header
      title="性能分析"
      :ghost="false"
      @back="() => $router.push('/websites')"
    />

    <a-row :gutter="16">
      <a-col :span="24">
        <!-- Core Web Vitals -->
        <a-card title="Core Web Vitals" class="mb-card" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-card size="small" class="metric-card">
                <a-statistic title="LCP (最大内容绘制)" :value="lcp" suffix="ms">
                  <template #suffix>
                    <check-circle-outlined :style="{ color: '#52c41a' }" v-if="lcp < 2500" />
                    <exclamation-circle-outlined :style="{ color: '#faad14' }" v-else />
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card size="small" class="metric-card">
                <a-statistic title="FID (首次输入延迟)" :value="fid" suffix="ms">
                  <template #suffix>
                    <check-circle-outlined :style="{ color: '#52c41a' }" v-if="fid < 100" />
                    <exclamation-circle-outlined :style="{ color: '#faad14' }" v-else />
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card size="small" class="metric-card">
                <a-statistic title="CLS (累计布局偏移)" :value="cls" :precision="3">
                  <template #suffix>
                    <check-circle-outlined :style="{ color: '#52c41a' }" v-if="cls < 0.1" />
                    <exclamation-circle-outlined :style="{ color: '#faad14' }" v-else />
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
          </a-row>
        </a-card>

        <!-- 瀑布图 -->
        <a-card title="元素瀑布图" class="mb-card" :bordered="false">
          <div class="waterfall-container">
            <a-empty v-if="waterfallData.length === 0" description="暂无数据" />
            <template v-else>
              <div v-for="(item, index) in waterfallData" :key="index" class="waterfall-item">
                <div class="waterfall-item-name">
                  <a-typography-text :ellipsis="{ tooltip: item.name }">{{ item.name }}</a-typography-text>
                  <a-tag size="small" v-if="item.type">{{ item.type }}</a-tag>
                </div>
                <div class="waterfall-item-bar">
                  <div class="waterfall-bar-bg">
                    <div
                      class="waterfall-bar"
                      :style="{
                        left: (item.startTime / totalTime) * 100 + '%',
                        width: (item.duration / totalTime) * 100 + '%',
                        backgroundColor: getBarColor(item.type)
                      }"
                    ></div>
                  </div>
                  <span class="waterfall-item-time">{{ item.duration }}ms</span>
                </div>
              </div>
            </template>
          </div>
        </a-card>

        <!-- 资源统计 -->
        <a-card title="资源加载统计" :bordered="false">
          <a-table :columns="resourceColumns" :data-source="resources" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'time'">
                {{ record.duration }}ms
              </template>
              <template v-if="column.key === 'size'">
                {{ formatSize(record.transferSize) }}
              </template>
              <template v-if="column.key === 'cache'">
                <a-tag :color="record.cache === 'hit' ? 'green' : 'blue'">{{ record.cache || '-' }}</a-tag>
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
import { useRoute } from 'vue-router';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue';

const route = useRoute();

const lcp = ref(1820);
const fid = ref(45);
const cls = ref(0.05);

const totalTime = ref(3000);

const waterfallData = ref([
  { name: 'HTML', type: 'document', startTime: 0, duration: 150 },
  { name: 'styles.css', type: 'css', startTime: 160, duration: 80 },
  { name: 'app.js', type: 'script', startTime: 160, duration: 250 },
  { name: 'vendor.js', type: 'script', startTime: 250, duration: 380 },
  { name: 'logo.png', type: 'image', startTime: 420, duration: 120 },
  { name: 'banner.jpg', type: 'image', startTime: 550, duration: 280 },
  { name: 'api/users', type: 'xhr', startTime: 600, duration: 95 },
  { name: 'fonts/roboto.woff2', type: 'font', startTime: 200, duration: 65 },
]);

const resources = ref([
  { type: 'document', count: 1, size: 45000, avgTime: 150 },
  { type: 'script', count: 5, size: 580000, avgTime: 280 },
  { type: 'css', count: 3, size: 125000, avgTime: 95 },
  { type: 'image', count: 12, size: 1250000, avgTime: 185 },
  { type: 'font', count: 4, size: 185000, avgTime: 75 },
  { type: 'xhr', count: 8, size: 45000, avgTime: 120 },
]);

const resourceColumns = [
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '数量', dataIndex: 'count', key: 'count', width: 80 },
  { title: '总大小', key: 'size', width: 120 },
  { title: '平均时间', key: 'time', width: 100 },
];

const getBarColor = (type: string) => {
  const colors: Record<string, string> = {
    document: '#1890ff',
    script: '#722ed1',
    css: '#fa8c16',
    image: '#52c41a',
    font: '#eb2f96',
    xhr: '#13c2c2',
    fetch: '#13c2c2',
  };
  return colors[type] || '#d9d9d9';
};

const formatSize = (bytes: number) => {
  if (bytes < 1000) return bytes + ' B';
  if (bytes < 1000000) return (bytes / 1000).toFixed(1) + ' KB';
  return (bytes / 1000000).toFixed(2) + ' MB';
};
</script>

<style scoped>
.website-performance-page {
  padding: 24px;
}

.mb-card {
  margin-bottom: 16px;
}

.metric-card {
  text-align: center;
}

.waterfall-container {
  max-height: 500px;
  overflow-y: auto;
}

.waterfall-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.waterfall-item-name {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.waterfall-item-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.waterfall-bar-bg {
  flex: 1;
  height: 20px;
  background: #f5f5f5;
  border-radius: 2px;
  position: relative;
}

.waterfall-bar {
  position: absolute;
  height: 100%;
  border-radius: 2px;
  min-width: 2px;
}

.waterfall-item-time {
  width: 60px;
  font-size: 12px;
  color: #666;
}
</style>
