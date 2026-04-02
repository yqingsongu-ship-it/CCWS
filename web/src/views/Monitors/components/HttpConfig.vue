<template>
  <a-form layout="vertical">
    <a-form-item label="请求方法">
      <a-select v-model:value="localConfig.method" @change="emitChange" style="width: 200px">
        <a-select-option value="GET">GET</a-select-option>
        <a-select-option value="POST">POST</a-select-option>
        <a-select-option value="PUT">PUT</a-select-option>
        <a-select-option value="DELETE">DELETE</a-select-option>
        <a-select-option value="HEAD">HEAD</a-select-option>
        <a-select-option value="OPTIONS">OPTIONS</a-select-option>
        <a-select-option value="PATCH">PATCH</a-select-option>
      </a-select>
    </a-form-item>

    <a-form-item label="请求体 (POST/PUT/PATCH)" v-if="['POST', 'PUT', 'PATCH'].includes(localConfig.method)">
      <a-textarea
        v-model:value="localConfig.body"
        @change="emitChange"
        :rows="6"
        placeholder='{"key": "value"}'
      />
    </a-form-item>

    <a-form-item label="请求头">
      <header-input v-model="localConfig.headers" />
    </a-form-item>

    <a-divider />

    <a-form-item label="验证选项">
      <a-space direction="vertical">
        <a-checkbox v-model:checked="localConfig.followRedirects" @change="emitChange">跟随重定向</a-checkbox>
        <a-checkbox v-model:checked="localConfig.validateSSL" @change="emitChange">验证 SSL 证书</a-checkbox>
      </a-space>
    </a-form-item>

    <a-form-item label="期望状态码">
      <a-input-number v-model:value="localConfig.expectedStatusCode" @change="emitChange" style="width: 150px" />
    </a-form-item>

    <a-form-item label="期望响应包含">
      <a-input
        v-model:value="localConfig.expectedBodyContains"
        @change="emitChange"
        placeholder="响应体中期望包含的文本"
      />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { HTTPMonitorConfig } from '@synthetic-monitoring/shared';
import HeaderInput from '@/components/Form/HeaderInput.vue';

const props = defineProps<{
  modelValue?: HTTPMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: HTTPMonitorConfig];
}>();

const localConfig = reactive<HTTPMonitorConfig>({
  method: props.modelValue?.method || 'GET',
  headers: props.modelValue?.headers || {},
  body: props.modelValue?.body || '',
  followRedirects: props.modelValue?.followRedirects ?? true,
  validateSSL: props.modelValue?.validateSSL ?? true,
  expectedStatusCode: props.modelValue?.expectedStatusCode || 200,
  expectedBodyContains: props.modelValue?.expectedBodyContains || '',
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
