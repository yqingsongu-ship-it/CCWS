<template>
  <div class="response-chart">
    <div ref="chartRef" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

interface DataPoint {
  timestamp: string;
  value: number;
}

const props = withDefaults(defineProps<{
  data: DataPoint[];
  height?: number;
  title?: string;
  showArea?: boolean;
}>(), {
  height: 300,
  showArea: false,
});

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const initChart = () => {
  if (!chartRef.value) return;

  chart = echarts.init(chartRef.value);

  const option = {
    title: props.title ? { text: props.title } : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>响应时间：${data.value}ms`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d.timestamp),
    },
    yAxis: {
      type: 'value',
      name: '响应时间 (ms)',
    },
    series: [
      {
        name: '响应时间',
        type: 'line',
        smooth: true,
        data: props.data.map(d => ({
          value: d.value,
          itemStyle: {
            color: d.value > 1000 ? '#ff4d4f' : d.value > 500 ? '#faad14' : '#52c41a',
          },
        })),
        areaStyle: props.showArea ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
          ]),
        } : undefined,
      },
    ],
  };

  chart.setOption(option);
};

const resizeChart = () => {
  chart?.resize();
};

watch(() => props.data, () => {
  initChart();
}, { deep: true });

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chart?.dispose();
});
</script>

<style scoped>
.response-chart {
  width: 100%;
}
</style>
