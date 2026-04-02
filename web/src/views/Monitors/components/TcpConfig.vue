<template>
  <a-form layout="vertical">
    <a-form-item label="端口">
      <a-input-number
        v-model:value="localConfig.port"
        @change="emitChange"
        :min="1"
        :max="65535"
        style="width: 200px"
      />
    </a-form-item>

    <a-form-item label="发送数据 (可选)">
      <a-textarea
        v-model:value="localConfig.sendData"
        @change="emitChange"
        placeholder="连接后发送的数据"
        :rows="3"
      />
    </a-form-item>

    <a-form-item label="期望响应 (可选)">
      <a-textarea
        v-model:value="localConfig.expectedResponse"
        @change="emitChange"
        placeholder="期望收到的响应内容"
        :rows="3"
      />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { TCPMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: TCPMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TCPMonitorConfig];
}>();

const localConfig = reactive<TCPMonitorConfig>({
  port: props.modelValue?.port || 80,
  sendData: props.modelValue?.sendData || '',
  expectedResponse: props.modelValue?.expectedResponse || '',
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
