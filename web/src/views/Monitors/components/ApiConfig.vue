<template>
  <div>
    <http-config v-model="config" />

    <a-divider />

    <a-form layout="vertical">
      <a-form-item label="认证配置">
        <a-select v-model:value="authType" style="width: 200px">
          <a-select-option value="none">无认证</a-select-option>
          <a-select-option value="basic">Basic Auth</a-select-option>
          <a-select-option value="bearer">Bearer Token</a-select-option>
          <a-select-option value="apikey">API Key</a-select-option>
        </a-select>
      </a-form-item>

      <!-- Basic Auth -->
      <a-space v-if="authType === 'basic'" direction="vertical">
        <a-input v-model:value="localConfig.auth.username" placeholder="用户名" style="width: 250px" />
        <a-input-password v-model:value="localConfig.auth.password" placeholder="密码" style="width: 250px" />
      </a-space>

      <!-- Bearer Token -->
      <a-input
        v-else-if="authType === 'bearer'"
        v-model:value="localConfig.auth.token"
        placeholder="Bearer Token"
        style="width: 300px"
      />

      <!-- API Key -->
      <a-space v-else-if="authType === 'apikey'" direction="vertical">
        <a-input v-model:value="localConfig.auth.apiKey" placeholder="API Key 名称" style="width: 250px" />
        <a-input v-model:value="localConfig.auth.apiValue" placeholder="API Key 值" style="width: 250px" />
      </a-space>

      <a-divider />

      <a-form-item label="断言配置">
        <a-button type="dashed" block @click="addAssertion" size="small">
          <PlusOutlined /> 添加断言
        </a-button>

        <div v-for="(assertion, index) in localConfig.assertions" :key="index" class="assertion-item">
          <a-space>
            <a-select v-model:value="assertion.type" style="width: 150px">
              <a-select-option value="status">状态码</a-select-option>
              <a-select-option value="body">响应包含</a-select-option>
              <a-select-option value="time">响应时间</a-select-option>
            </a-select>

            <a-select
              v-model:value="assertion.operator"
              style="width: 100px"
              v-if="assertion.type !== 'body'"
            >
              <a-select-option value="eq">=</a-select-option>
              <a-select-option value="ne">!=</a-select-option>
              <a-select-option value="gt">&gt;</a-select-option>
              <a-select-option value="lt">&lt;</a-select-option>
              <a-select-option value="gte">&ge;</a-select-option>
              <a-select-option value="lte">&le;</a-select-option>
            </a-select>

            <a-input
              v-model:value="assertion.value"
              :placeholder="getPlaceholder(assertion.type)"
              style="width: 200px"
            />

            <a-button type="text" danger @click="removeAssertion(index)">
              <MinusOutlined />
            </a-button>
          </a-space>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons-vue';
import type { APIMonitorConfig, APIAssertion } from '@synthetic-monitoring/shared';
import HttpConfig from './HttpConfig.vue';

const props = defineProps<{
  modelValue?: APIMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: APIMonitorConfig];
}>();

const authType = computed({
  get: () => localConfig.auth?.type || 'none',
  set: (val) => {
    if (!localConfig.auth) localConfig.auth = { type: 'none' };
    localConfig.auth.type = val;
    emitChange();
  }
});

const localConfig = reactive<APIMonitorConfig>({
  method: props.modelValue?.method || 'GET',
  headers: props.modelValue?.headers,
  body: props.modelValue?.body,
  bodyType: props.modelValue?.bodyType || 'json',
  expectedStatusCode: props.modelValue?.expectedStatusCode || 200,
  expectedBodyContains: props.modelValue?.expectedBodyContains || '',
  followRedirects: props.modelValue?.followRedirects ?? true,
  validateSSL: props.modelValue?.validateSSL ?? true,
  auth: props.modelValue?.auth || { type: 'none' },
  assertions: props.modelValue?.assertions || [],
});

const addAssertion = () => {
  localConfig.assertions?.push({ type: 'status', operator: 'eq', value: '200' });
};

const removeAssertion = (index: number) => {
  localConfig.assertions?.splice(index, 1);
};

const getPlaceholder = (type: string) => {
  switch (type) {
    case 'status': return '200';
    case 'body': return 'success';
    case 'time': return '1000';
    default: return '';
  }
};

const emitChange = () => {
  emit('update:modelValue', { ...localConfig });
};

watch(
  localConfig,
  () => emitChange(),
  { deep: true }
);
</script>

<style scoped>
.assertion-item {
  margin-top: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
