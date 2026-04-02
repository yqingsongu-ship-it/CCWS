<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑 API 监控' : '新建 API 监控'"
    width="700px"
    :confirmLoading="submitting"
    okText="确定"
    cancelText="取消"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" :model="form" :rules="rules" ref="formRef">
      <a-form-item label="任务名称" name="name">
        <a-input v-model:value="form.name" placeholder="例如：用户 API 监控" />
      </a-form-item>

      <a-form-item label="监控目标" name="target">
        <a-input v-model:value="form.target" placeholder="https://api.example.com/v1/users" />
      </a-form-item>

      <a-form-item label="监控类型" name="type">
        <a-select v-model:value="form.type" :disabled="isEdit">
          <a-select-option value="API">API</a-select-option>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="检查间隔" name="interval">
            <a-input-number v-model:value="form.interval" :min="30" :max="3600" style="width: 100%" addon-after="秒" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="超时时间" name="timeout">
            <a-input-number v-model:value="form.timeout" :min="1000" :max="60000" style="width: 100%" addon-after="毫秒" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item>
            <a-checkbox v-model:checked="form.followRedirects">跟随重定向</a-checkbox>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item>
            <a-checkbox v-model:checked="form.validateSSL">验证 SSL 证书</a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider />

      <!-- API 配置 -->
      <a-form-item label="请求配置">
        <a-form layout="vertical">
          <a-form-item label="请求方法">
            <a-select v-model:value="form.config.method">
              <a-select-option value="GET">GET</a-select-option>
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="PUT">PUT</a-select-option>
              <a-select-option value="DELETE">DELETE</a-select-option>
              <a-select-option value="HEAD">HEAD</a-select-option>
              <a-select-option value="OPTIONS">OPTIONS</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="请求头">
            <a-textarea v-model:value="headersText" :rows="3" placeholder="每行一个头，格式：Content-Type: application/json" />
          </a-form-item>
          <a-form-item label="请求体 (JSON)">
            <a-textarea v-model:value="bodyText" :rows="4" placeholder='{"key": "value"}' />
          </a-form-item>
          <a-form-item label="期望状态码">
            <a-input-number v-model:value="form.config.expectedStatusCode" :min="100" :max="599" style="width: 100%" />
          </a-form-item>
        </a-form>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { MonitorType } from '@synthetic-monitoring/shared';
import { useMonitorStore } from '@/stores/monitor';

interface Props {
  open: boolean;
  editData?: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'close'): void;
  (e: 'update:open', value: boolean): void;
}>();

const monitorStore = useMonitorStore();
const formRef = ref();
const visible = ref(false);
const submitting = ref(false);

const form = reactive({
  name: '',
  target: '',
  type: 'API' as MonitorType,
  interval: 60,
  timeout: 10000,
  regions: [] as string[],
  followRedirects: true,
  validateSSL: true,
  config: {
    method: 'GET',
    expectedStatusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    bodyType: 'json' as 'json' | 'form' | 'xml' | 'text',
    followRedirects: true,
    validateSSL: true,
  },
});

const headersText = ref('');
const bodyText = ref('');

const isEdit = computed(() => !!props.editData);

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  target: [{ required: true, message: '请输入监控目标', trigger: 'blur' }],
  interval: [{ required: true, message: '请设置检查间隔', trigger: 'change' }],
  timeout: [{ required: true, message: '请设置超时时间', trigger: 'change' }],
};

watch(
  () => props.editData,
  (data) => {
    if (data) {
      form.name = data.name;
      form.target = data.target;
      form.type = data.type;
      form.interval = data.interval || 60;
      form.timeout = data.timeout || 10000;
      form.regions = data.regions || [];
      form.followRedirects = data.followRedirects ?? true;
      form.validateSSL = data.validateSSL ?? true;
      form.config = {
        method: data.config?.method || 'GET',
        expectedStatusCode: data.config?.expectedStatusCode || 200,
        headers: data.config?.headers || {},
        body: data.config?.body || null,
        bodyType: data.config?.bodyType || 'json',
        followRedirects: data.config?.followRedirects ?? true,
        validateSSL: data.config?.validateSSL ?? true,
      };
      headersText.value = Object.entries(form.config.headers || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      bodyText.value = form.config.body ? JSON.stringify(form.config.body, null, 2) : '';
    }
  },
  { immediate: true }
);

const parseHeaders = () => {
  const headers: Record<string, string> = {};
  headersText.value.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const value = line.substring(idx + 1).trim();
      if (key) headers[key] = value;
    }
  });
  return headers;
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    submitting.value = true;

    form.config.headers = parseHeaders();
    form.config.followRedirects = form.followRedirects;
    form.config.validateSSL = form.validateSSL;

    if (bodyText.value.trim()) {
      try {
        form.config.body = JSON.parse(bodyText.value);
      } catch (e) {
        throw new Error('请求体 JSON 格式无效');
      }
    } else {
      form.config.body = null;
    }

    const payload = {
      name: form.name,
      type: form.type,
      target: form.target,
      interval: form.interval,
      timeout: form.timeout,
      regions: form.regions,
      enabled: true,
      config: form.config,
    };

    if (isEdit.value) {
      await monitorStore.updateMonitor(props.editData.id, payload);
      message.success('更新成功');
    } else {
      await monitorStore.createMonitor(payload);
      message.success('创建成功');
    }

    emit('update:open', false);
    emit('success');
  } catch (error: any) {
    console.error('Submit error:', error);
    message.error(error?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  emit('update:open', false);
  emit('close');
};
</script>
