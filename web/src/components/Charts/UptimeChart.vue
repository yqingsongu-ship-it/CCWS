<template>
  <div class="uptime-chart">
    <div ref="chartRef" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

interface DataPoint {
  date: string;
  uptime: number;
  downtime?: number;
}

const props = withDefaults(defineProps<{
  data: DataPoint[];
  height?: number;
  title?: string;
}>(), {
  height: 200,
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
        return `${data.name}<br/>可用率：${data.value}%`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d.date),
    },
    yAxis: {
      type: 'value',
      min: 95,
      max: 100,
      name: '可用率 (%)',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series: [
      {
        name: '可用率',
        type: 'line',
        smooth: true,
        data: props.data.map(d => d.uptime),
        itemStyle: {
          color: (params: any) => {
            if (params.value >= 99.9) return '#52c41a';
            if (params.value >= 99) return '#faad14';
            return '#ff4d4f';
          },
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
            { offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
          ]),
        },
        markLine: {
          silent: true,
          data: [
            { yAxis: 99.9, lineStyle: { color: '#52c41a', type: 'dashed' } },
            { yAxis: 99, lineStyle: { color: '#faad14', type: 'dashed' } },
          ],
        },
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
.uptime-chart {
  width: 100%;
}
</style>
