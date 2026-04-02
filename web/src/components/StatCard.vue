<template>
  <a-card class="stat-card" :bordered="bordered">
    <a-statistic :title="title" :value="value" :suffix="suffix" :precision="precision" :valueStyle="colorStyle">
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix"></slot>
      </template>
    </a-statistic>
    <div v-if="subtext" class="stat-subtext">{{ subtext }}</div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  value: number | string;
  suffix?: string;
  precision?: number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  bordered?: boolean;
  color?: string;
}>(), {
  bordered: false,
});

const colorStyle = computed(() => {
  if (props.color) return { color: props.color };
  if (props.trend === 'up') return { color: '#52c41a' };
  if (props.trend === 'down') return { color: '#ff4d4f' };
  return undefined;
});
</script>

<style scoped>
.stat-card {
  width: 100%;
}

.stat-subtext {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
</style>
