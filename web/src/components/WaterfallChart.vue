<template>
  <div class="waterfall-chart">
    <div class="waterfall-header">
      <div class="header-name">资源</div>
      <div class="header-bar">
        <span>0ms</span>
        <span>{{ Math.round(totalTime / 2) }}ms</span>
        <span>{{ totalTime }}ms</span>
      </div>
      <div class="header-size">大小</div>
    </div>

    <div class="waterfall-list">
      <div
        v-for="(item, index) in resources"
        :key="index"
        class="waterfall-item"
        @mouseenter="hoverIndex = index"
        @mouseleave="hoverIndex = null"
      >
        <div class="item-name">
          <span :class="['type-icon', getTypeClass(item.type)]">{{ getTypeLabel(item.type) }}</span>
          <a-typography-text :ellipsis="{ tooltip: item.name }">{{ item.name }}</a-typography-text>
        </div>

        <div class="item-bar-container">
          <div class="item-bar-bg">
            <div
              v-if="item.dns"
              class="bar-segment dns"
              :style="{
                left: (item.startTime / totalTime) * 100 + '%',
                width: Math.max((item.dns / totalTime) * 100, 0.3) + '%',
              }"
              :title="`DNS: ${item.dns}ms`"
            ></div>
            <div
              v-if="item.tcp"
              class="bar-segment tcp"
              :style="{
                left: ((item.startTime + (item.dns || 0)) / totalTime) * 100 + '%',
                width: Math.max((item.tcp / totalTime) * 100, 0.3) + '%',
              }"
              :title="`TCP: ${item.tcp}ms`"
            ></div>
            <div
              v-if="item.ttfb"
              class="bar-segment ttfb"
              :style="{
                left: ((item.startTime + (item.dns || 0) + (item.tcp || 0)) / totalTime) * 100 + '%',
                width: Math.max((item.ttfb / totalTime) * 100, 0.3) + '%',
              }"
              :title="`TTFB: ${item.ttfb}ms`"
            ></div>
            <div
              class="bar-segment download"
              :style="{
                left: ((item.startTime + (item.dns || 0) + (item.tcp || 0) + (item.ttfb || 0)) / totalTime) * 100 + '%',
                width: Math.max((item.download / totalTime) * 100, 0.3) + '%',
              }"
              :title="`Download: ${item.download}ms`"
            ></div>
          </div>
          <span class="item-time">{{ item.total }}ms</span>
        </div>

        <div class="item-size">{{ formatSize(item.transferSize) }}</div>

        <!-- Tooltip -->
        <div v-if="hoverIndex === index" class="waterfall-tooltip">
          <div v-if="item.dns"><span class="dot dns"></span> DNS: {{ item.dns }}ms</div>
          <div v-if="item.tcp"><span class="dot tcp"></span> TCP: {{ item.tcp }}ms</div>
          <div v-if="item.ttfb"><span class="dot ttfb"></span> TTFB: {{ item.ttfb }}ms</div>
          <div><span class="dot download"></span> 下载：{{ item.download }}ms</div>
          <a-divider style="margin: 4px 0" />
          <div>开始：{{ item.startTime }}ms</div>
          <div>大小：{{ formatSize(item.transferSize) }}</div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="waterfall-legend">
      <a-space>
        <span>图例：</span>
        <a-tag color="blue">DNS</a-tag>
        <a-tag color="purple">TCP</a-tag>
        <a-tag color="cyan">TTFB</a-tag>
        <a-tag color="green">内容下载</a-tag>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface WaterfallResource {
  name: string;
  type: 'document' | 'script' | 'css' | 'image' | 'font' | 'xhr' | 'fetch' | 'other';
  startTime: number;
  dns?: number;
  tcp?: number;
  ttfb?: number;
  download: number;
  total: number;
  transferSize: number;
}

const props = withDefaults(defineProps<{
  resources: WaterfallResource[];
  totalTime?: number;
}>(), {
  totalTime: 2000,
});

const hoverIndex = ref<number | null>(null);

const getTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    document: 'type-document',
    script: 'type-script',
    css: 'type-css',
    image: 'type-image',
    font: 'type-font',
    xhr: 'type-xhr',
    fetch: 'type-fetch',
  };
  return classes[type] || 'type-other';
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    document: 'DOC',
    script: 'JS',
    css: 'CSS',
    image: 'IMG',
    font: 'Font',
    xhr: 'XHR',
    fetch: 'Fetch',
  };
  return labels[type] || type;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1000) return bytes + ' B';
  if (bytes < 1000000) return (bytes / 1000).toFixed(1) + ' KB';
  return (bytes / 1000000).toFixed(2) + ' MB';
};
</script>

<style scoped>
.waterfall-chart {
  width: 100%;
}

.waterfall-header {
  display: flex;
  padding: 0 0 12px 0;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 500;
  font-size: 13px;
  color: #666;
}

.header-name {
  width: 250px;
  flex-shrink: 0;
  padding-left: 8px;
}

.header-bar {
  flex: 1;
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.header-size {
  width: 70px;
  text-align: right;
  padding-right: 8px;
}

.waterfall-list {
  max-height: 500px;
  overflow-y: auto;
  position: relative;
}

.waterfall-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  position: relative;
}

.waterfall-item:hover {
  background: #fafafa;
}

.item-name {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  font-size: 12px;
}

.type-icon {
  width: 36px;
  height: 20px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  font-weight: 500;
  flex-shrink: 0;
}

.type-document { background: #1890ff; }
.type-script { background: #722ed1; }
.type-css { background: #fa8c16; }
.type-image { background: #52c41a; }
.type-font { background: #eb2f96; }
.type-xhr, .type-fetch { background: #13c2c2; }
.type-other { background: #d9d9d9; }

.item-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.item-bar-bg {
  flex: 1;
  height: 20px;
  background: #f5f5f5;
  border-radius: 2px;
  position: relative;
}

.bar-segment {
  position: absolute;
  height: 100%;
  border-radius: 2px;
  min-width: 1px;
}

.bar-segment.dns { background: #1890ff; }
.bar-segment.tcp { background: #722ed1; }
.bar-segment.ttfb { background: #13c2c2; }
.bar-segment.download { background: #52c41a; }

.item-time {
  width: 50px;
  font-size: 11px;
  color: #666;
  text-align: right;
}

.item-size {
  width: 70px;
  font-size: 11px;
  color: #999;
  text-align: right;
  padding-right: 8px;
}

.waterfall-tooltip {
  position: absolute;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 11px;
  z-index: 10;
}

.waterfall-tooltip .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot.dns { background: #1890ff; }
.dot.tcp { background: #722ed1; }
.dot.ttfb { background: #13c2c2; }
.dot.download { background: #52c41a; }

.waterfall-legend {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
}
</style>
