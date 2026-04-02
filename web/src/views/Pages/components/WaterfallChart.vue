<template>
  <div class="waterfall-chart">
    <div v-if="!data || data.length === 0" class="empty-state">
      <a-empty description="暂无瀑布图数据" />
    </div>
    <div v-else class="waterfall-container">
      <div class="resource-list">
        <div v-for="(item, index) in data" :key="index" class="resource-item">
          <div class="resource-name" :title="item.name">{{ truncateName(item.name) }}</div>
        </div>
      </div>
      <div class="waterfall-bars">
        <div v-for="(item, index) in data" :key="index" class="waterfall-row">
          <div class="waterfall-bar-container">
            <div v-if="item.dnsTime > 0" class="bar dns-bar" :style="getBarStyle(item.startTime, item.dnsTime)" title="DNS 解析"></div>
            <div v-if="item.tcpTime > 0" class="bar tcp-bar" :style="getBarStyle(item.startTime + item.dnsTime, item.tcpTime)" title="TCP 连接"></div>
            <div v-if="item.tlsTime > 0" class="bar tls-bar" :style="getBarStyle(item.startTime + item.dnsTime + item.tcpTime, item.tlsTime)" title="TLS 握手"></div>
            <div v-if="item.ttfbTime > 0" class="bar ttfb-bar" :style="getBarStyle(item.startTime + item.dnsTime + item.tcpTime + item.tlsTime, item.ttfbTime)" title="首字节时间"></div>
            <div v-if="item.downloadTime > 0" class="bar download-bar" :style="getBarStyle(item.startTime + item.dnsTime + item.tcpTime + item.tlsTime + item.ttfbTime, item.downloadTime)" title="下载时间"></div>
          </div>
          <div class="resource-time">{{ item.totalTime?.toFixed(0) || '-' }}ms</div>
        </div>
      </div>
    </div>
    <div class="legend">
      <span class="legend-item"><span class="legend-color dns-bar"></span>DNS</span>
      <span class="legend-item"><span class="legend-color tcp-bar"></span>TCP</span>
      <span class="legend-item"><span class="legend-color tls-bar"></span>TLS</span>
      <span class="legend-item"><span class="legend-color ttfb-bar"></span>TTFB</span>
      <span class="legend-item"><span class="legend-color download-bar"></span>Download</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface WaterfallItem {
  name: string;
  startTime: number;
  dnsTime?: number;
  tcpTime?: number;
  tlsTime?: number;
  ttfbTime?: number;
  downloadTime?: number;
  totalTime?: number;
}

defineProps<{
  data: WaterfallItem[];
}>();

const truncateName = (name: string) => {
  if (!name) return '';
  if (name.length <= 50) return name;
  return '...' + name.slice(-47);
};

const getBarStyle = (start: number, duration: number) => {
  const maxTime = 10000;
  const leftPercent = (start / maxTime) * 100;
  const widthPercent = Math.max((duration / maxTime) * 100, 0.5);
  return { left: `${leftPercent}%`, width: `${widthPercent}%` };
};
</script>

<style scoped>
.waterfall-chart { padding: 16px; }
.empty-state { display: flex; justify-content: center; align-items: center; height: 200px; }
.waterfall-container { display: flex; gap: 16px; }
.resource-list { width: 300px; flex-shrink: 0; overflow: hidden; }
.resource-item { height: 32px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; }
.resource-name { font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.waterfall-bars { flex: 1; overflow-x: auto; }
.waterfall-row { height: 32px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; gap: 16px; }
.waterfall-bar-container { flex: 1; position: relative; height: 24px; min-width: 200px; }
.bar { position: absolute; height: 20px; border-radius: 2px; transition: opacity 0.2s; }
.bar:hover { opacity: 0.8; }
.dns-bar { background: #ff7a45; }
.tcp-bar { background: #ffc107; }
.tls-bar { background: #ff85c0; }
.ttfb-bar { background: #52c41a; }
.download-bar { background: #1890ff; }
.resource-time { width: 60px; font-size: 12px; color: #999; text-align: right; }
.legend { display: flex; gap: 24px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #666; }
.legend-color { width: 16px; height: 16px; border-radius: 2px; }
</style>
