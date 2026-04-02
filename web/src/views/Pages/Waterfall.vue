<template>
  <div class="waterfall-page">
    <a-page-header
      title="瀑布图分析"
      :ghost="false"
      @back="() => $router.push('/pages')"
    />

    <a-card :bordered="false">
      <div class="waterfall-container">
        <!-- Header -->
        <div class="waterfall-header">
          <div class="header-name">资源名称</div>
          <div class="header-bar">
            <span>0ms</span>
            <span>{{ totalTime / 2 }}ms</span>
            <span>{{ totalTime }}ms</span>
          </div>
        </div>

        <!-- Waterfall items -->
        <div class="waterfall-list">
          <div
            v-for="(item, index) in waterfallData"
            :key="index"
            class="waterfall-item"
          >
            <div class="item-name">
              <a-typography-text :ellipsis="{ tooltip: item.name }" :class="item.type">
                {{ item.name }}
              </a-typography-text>
            </div>
            <div class="item-bar-container">
              <div class="item-bar-bg">
                <!-- DNS -->
                <div
                  v-if="item.dns"
                  class="bar-segment dns"
                  :style="{
                    left: (item.startTime / totalTime) * 100 + '%',
                    width: Math.max((item.dns / totalTime) * 100, 0.5) + '%'
                  }"
                  :title="`DNS: ${item.dns}ms`"
                ></div>
                <!-- TCP -->
                <div
                  v-if="item.tcp"
                  class="bar-segment tcp"
                  :style="{
                    left: ((item.startTime + item.dns) / totalTime) * 100 + '%',
                    width: Math.max((item.tcp / totalTime) * 100, 0.5) + '%'
                  }"
                  :title="`TCP: ${item.tcp}ms`"
                ></div>
                <!-- TTFB -->
                <div
                  v-if="item.ttfb"
                  class="bar-segment ttfb"
                  :style="{
                    left: ((item.startTime + item.dns + item.tcp) / totalTime) * 100 + '%',
                    width: Math.max((item.ttfb / totalTime) * 100, 0.5) + '%'
                  }"
                  :title="`TTFB: ${item.ttfb}ms`"
                ></div>
                <!-- Download -->
                <div
                  class="bar-segment download"
                  :style="{
                    left: ((item.startTime + item.dns + item.tcp + item.ttfb) / totalTime) * 100 + '%',
                    width: Math.max((item.download / totalTime) * 100, 0.5) + '%'
                  }"
                  :title="`Download: ${item.download}ms`"
                ></div>
              </div>
              <span class="item-time">{{ item.total }}ms</span>
            </div>
            <div class="item-size">{{ formatSize(item.transferSize) }}</div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="waterfall-legend">
        <a-space>
          <span>耗时图例：</span>
          <a-tag color="blue">DNS</a-tag>
          <a-tag color="purple">TCP</a-tag>
          <a-tag color="orange">TLS/SSL</a-tag>
          <a-tag color="cyan">TTFB</a-tag>
          <a-tag color="green">内容下载</a-tag>
        </a-space>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const totalTime = ref(2500);

const waterfallData = ref([
  { name: 'document', type: 'document', startTime: 0, dns: 25, tcp: 38, ttfb: 45, download: 42, total: 150, transferSize: 45000 },
  { name: 'styles.css', type: 'css', startTime: 160, dns: 0, tcp: 0, ttfb: 25, download: 55, total: 80, transferSize: 32000 },
  { name: 'app.js', type: 'script', startTime: 160, dns: 0, tcp: 0, ttfb: 35, download: 215, total: 250, transferSize: 185000 },
  { name: 'vendor.js', type: 'script', startTime: 250, dns: 0, tcp: 0, ttfb: 42, download: 338, total: 380, transferSize: 295000 },
  { name: 'logo.png', type: 'image', startTime: 420, dns: 0, tcp: 0, ttfb: 18, download: 102, total: 120, transferSize: 28000 },
  { name: 'banner.jpg', type: 'image', startTime: 550, dns: 0, tcp: 0, ttfb: 35, download: 245, total: 280, transferSize: 185000 },
  { name: 'api/user', type: 'xhr', startTime: 600, dns: 0, tcp: 12, ttfb: 58, download: 25, total: 95, transferSize: 8500 },
  { name: 'api/data', type: 'fetch', startTime: 720, dns: 0, tcp: 10, ttfb: 65, download: 38, total: 113, transferSize: 15200 },
  { name: 'roboto.woff2', type: 'font', startTime: 200, dns: 0, tcp: 0, ttfb: 22, download: 43, total: 65, transferSize: 45000 },
  { name: 'analytics.js', type: 'script', startTime: 850, dns: 15, tcp: 28, ttfb: 45, download: 92, total: 180, transferSize: 62000 },
]);

const formatSize = (bytes: number) => {
  if (bytes < 1000) return bytes + ' B';
  if (bytes < 1000000) return (bytes / 1000).toFixed(1) + ' KB';
  return (bytes / 1000000).toFixed(2) + ' MB';
};
</script>

<style scoped>
.waterfall-page {
  padding: 24px;
}

.waterfall-container {
  overflow-x: auto;
}

.waterfall-header {
  display: flex;
  padding: 0 0 16px 0;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 500;
}

.header-name {
  width: 300px;
  flex-shrink: 0;
  padding-left: 8px;
}

.header-bar {
  flex: 1;
  display: flex;
  justify-content: space-between;
  color: #999;
  font-size: 12px;
  padding: 0 8px;
}

.waterfall-list {
  max-height: 600px;
  overflow-y: auto;
}

.waterfall-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.waterfall-item:hover {
  background: #fafafa;
}

.item-name {
  width: 300px;
  flex-shrink: 0;
  padding-left: 8px;
}

.item-name :deep(.ant-typography) {
  font-size: 13px;
}

.item-name :deep(.document) { color: #1890ff; }
.item-name :deep(.script) { color: #722ed1; }
.item-name :deep(.css) { color: #fa8c16; }
.item-name :deep(.image) { color: #52c41a; }
.item-name :deep(.font) { color: #eb2f96; }
.item-name :deep(.xhr),
.item-name :deep(.fetch) { color: #13c2c2; }

.item-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.item-bar-bg {
  flex: 1;
  height: 24px;
  background: #f5f5f5;
  border-radius: 2px;
  position: relative;
}

.bar-segment {
  position: absolute;
  height: 100%;
  border-radius: 2px;
  min-width: 2px;
  cursor: pointer;
}

.bar-segment.dns { background: #1890ff; }
.bar-segment.tcp { background: #722ed1; }
.bar-segment.ttfb { background: #13c2c2; }
.bar-segment.download { background: #52c41a; }

.item-time {
  width: 50px;
  font-size: 12px;
  color: #666;
  text-align: right;
}

.item-size {
  width: 70px;
  font-size: 12px;
  color: #999;
  text-align: right;
  padding-right: 8px;
}

.waterfall-legend {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
