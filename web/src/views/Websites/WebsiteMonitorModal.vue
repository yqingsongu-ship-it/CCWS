<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑网站监控' : '新建网站监控'"
    width="700px"
    :confirmLoading="submitting"
    okText="确定"
    cancelText="取消"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" :model="form" :rules="rules" ref="formRef">
      <a-form-item label="任务名称" name="name">
        <a-input v-model:value="form.name" placeholder="例如：Google 首页监控" />
      </a-form-item>

      <a-form-item label="监控目标" name="target">
        <a-input v-model:value="form.target" placeholder="https://www.example.com" />
      </a-form-item>

      <a-form-item label="监控类型" name="type">
        <a-select v-model:value="form.type" :disabled="isEdit">
          <a-select-option value="HTTP">HTTP</a-select-option>
          <a-select-option value="HTTPS">HTTPS</a-select-option>
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
          <a-form-item v-if="form.type === 'HTTPS'">
            <a-checkbox v-model:checked="form.validateSSL">验证 SSL 证书</a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="探测区域">
        <a-select v-model:value="form.regions" mode="multiple" style="width: 100%" placeholder="选择探测区域，不选则为全部区域">
          <a-select-option value="beijing">北京</a-select-option>
          <a-select-option value="shanghai">上海</a-select-option>
          <a-select-option value="guangzhou">广州</a-select-option>
          <a-select-option value="shenzhen">深圳</a-select-option>
          <a-select-option value="us-east">美东</a-select-option>
          <a-select-option value="us-west">美西</a-select-option>
          <a-select-option value="eu-west">欧洲</a-select-option>
          <a-select-option value="ap-southeast">东南亚</a-select-option>
        </a-select>
      </a-form-item>

      <a-divider />

      <!-- HTTP/HTTPS 配置 -->
      <a-form-item label="请求配置">
        <a-form layout="vertical">
          <a-form-item label="请求方法">
            <a-select v-model:value="form.config.method">
              <a-select-option value="GET">GET</a-select-option>
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="HEAD">HEAD</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="请求头">
            <a-textarea v-model:value="headersText" :rows="3" placeholder="每行一个头，格式：Content-Type: application/json" />
          </a-form-item>
          <a-form-item label="期望状态码">
            <a-input-number v-model:value="form.config.expectedStatusCode" :min="100" :max="599" style="width: 100%" />
          </a-form-item>
          <a-form-item label="期望包含内容">
            <a-input v-model:value="form.config.expectedContains" placeholder="响应中应包含的内容（可选）" />
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
  editData?: any;
  monitorType?: 'HTTP' | 'HTTPS';
}

const props = withDefaults(defineProps<Props>(), {
  monitorType: 'HTTPS',
});

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'close'): void;
}>();

const monitorStore = useMonitorStore();
const formRef = ref();
const visible = ref(false);
const submitting = ref(false);

const form = reactive({
  name: '',
  target: '',
  type: props.monitorType as MonitorType,
  interval: 60,
  timeout: 10000,
  regions: [] as string[],
  followRedirects: true,
  validateSSL: true,
  config: {
    method: 'GET',
    expectedStatusCode: 200,
    expectedContains: '',
    headers: {} as Record<string, string>,
    followRedirects: true,
    validateSSL: true,
  },
});

const headersText = ref('');

const isEdit = computed(() => !!props.editData);

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  target: [{ required: true, message: '请输入监控目标', trigger: 'blur' }],
  interval: [{ required: true, message: '请设置检查间隔', trigger: 'change' }],
  timeout: [{ required: true, message: '请设置超时时间', trigger: 'change' }],
};

// 监听编辑数据
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
        expectedContains: data.config?.expectedContains || '',
        headers: data.config?.headers || {},
        followRedirects: data.config?.followRedirects ?? true,
        validateSSL: data.config?.validateSSL ?? true,
      };
      headersText.value = Object.entries(form.config.headers || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }
  },
  { immediate: true }
);

// 解析 headers
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

    visible.value = false;
    emit('success');
  } catch (error: any) {
    console.error('Submit error:', error);
    message.error(error?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  visible.value = false;
  emit('close');
};
</script>
