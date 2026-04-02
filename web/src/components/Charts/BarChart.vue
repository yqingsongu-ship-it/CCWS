<template>
  <div ref="chartRef" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

interface DataPoint {
  name: string;
  value: number;
}

interface SeriesData {
  name: string;
  data: DataPoint[];
  type?: string;
  color?: string;
}

const props = withDefaults(defineProps<{
  series: SeriesData[];
  categories?: string[];
  height?: number;
  title?: string;
  showLegend?: boolean;
}>(), {
  height: 300,
  showLegend: true,
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
      axisPointer: { type: 'shadow' },
    },
    legend: props.showLegend ? { data: props.series.map(s => s.name) } : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.categories || [],
    },
    yAxis: {
      type: 'value',
    },
    series: props.series.map((s, index) => ({
      name: s.name,
      type: s.type || 'bar',
      data: s.data.map(d => d.value),
      itemStyle: {
        color: s.color || getDefaultColor(index),
      },
    })),
  };

  chart.setOption(option);
};

const getDefaultColor = (index: number): string => {
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];
  return colors[index % colors.length];
};

const resizeChart = () => {
  chart?.resize();
};

watch(() => [props.series, props.categories], () => {
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
div {
  width: 100%;
}
</style>
