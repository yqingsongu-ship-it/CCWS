<template>
  <a-form layout="vertical">
    <a-form-item label="Ping 次数">
      <a-input-number
        v-model:value="localConfig.count"
        @change="emitChange"
        :min="1"
        :max="10"
        style="width: 150px"
      />
      <span class="help-text">每次检测发送的 Ping 包数量</span>
    </a-form-item>

    <a-form-item label="数据包大小">
      <a-input-number
        v-model:value="localConfig.packetSize"
        @change="emitChange"
        :min="16"
        :max="1024"
        style="width: 150px"
        addon-after="bytes"
      />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { PingMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: PingMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: PingMonitorConfig];
}>();

const localConfig = reactive<PingMonitorConfig>({
  count: props.modelValue?.count || 4,
  packetSize: props.modelValue?.packetSize || 56,
});

const emitChange = () => {
  emit('update:modelValue', { ...localConfig });
};

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      Object.assign(localConfig, value);
    }
  }
);
</script>

<style scoped>
.help-text {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
</style>
