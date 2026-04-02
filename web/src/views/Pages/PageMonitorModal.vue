<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑页面监控' : '新建页面监控'"
    width="700px"
    :confirmLoading="submitting"
    okText="确定"
    cancelText="取消"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" :model="form" :rules="rules" ref="formRef">
      <a-form-item label="任务名称" name="name">
        <a-input v-model:value="form.name" placeholder="例如：首页性能监控" />
      </a-form-item>

      <a-form-item label="监控目标" name="target">
        <a-input v-model:value="form.target" placeholder="https://www.example.com" />
      </a-form-item>

      <a-form-item label="监控类型" name="type">
        <a-select v-model:value="form.type" :disabled="isEdit">
          <a-select-option value="PAGE_PERF">页面性能</a-select-option>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="检查间隔" name="interval">
            <a-input-number v-model:value="form.interval" :min="60" :max="3600" style="width: 100%" addon-after="秒" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="超时时间" name="timeout">
            <a-input-number v-model:value="form.timeout" :min="10000" :max="120000" style="width: 100%" addon-after="毫秒" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider />

      <!-- 性能阈值配置 -->
      <a-form-item label="性能阈值">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="LCP 阈值 (ms)">
                <a-input-number v-model:value="form.config.lcpThreshold" :min="1000" :max="10000" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="FCP 阈值 (ms)">
                <a-input-number v-model:value="form.config.fcpThreshold" :min="500" :max="5000" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="CLS 阈值">
                <a-input-number v-model:value="form.config.clsThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="设备类型">
                <a-select v-model:value="form.config.device">
                  <a-select-option value="desktop">桌面</a-select-option>
                  <a-select-option value="mobile">移动</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="等待事件">
                <a-select v-model:value="form.config.waitUntil">
                  <a-select-option value="load">load</a-select-option>
                  <a-select-option value="domcontentloaded">DOMContentLoaded</a-select-option>
                  <a-select-option value="networkidle">NetworkIdle</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="性能评分目标">
                <a-input-number v-model:value="form.config.scoreTarget" :min="50" :max="100" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
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
}

const props = defineProps<Props>();
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
  type: 'PAGE_PERF' as MonitorType,
  interval: 300,
  timeout: 60000,
  regions: [] as string[],
  config: {
    lcpThreshold: 2500,
    fcpThreshold: 1800,
    clsThreshold: 0.1,
    scoreTarget: 90,
    viewport: { width: 1920, height: 1080 },
    device: 'desktop' as 'desktop' | 'mobile',
    waitUntil: 'networkidle' as 'load' | 'domcontentloaded' | 'networkidle',
    captureScreenshot: true,
    captureHar: false,
  },
});

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
      form.interval = data.interval || 300;
      form.timeout = data.timeout || 60000;
      form.regions = data.regions || [];
      form.config = {
        lcpThreshold: data.config?.lcpThreshold || 2500,
        fcpThreshold: data.config?.fcpThreshold || 1800,
        clsThreshold: data.config?.clsThreshold || 0.1,
        scoreTarget: data.config?.scoreTarget || 90,
        viewport: data.config?.viewport || { width: 1920, height: 1080 },
        device: data.config?.device || 'desktop',
        waitUntil: data.config?.waitUntil || 'networkidle',
        captureScreenshot: data.config?.captureScreenshot ?? true,
        captureHar: data.config?.captureHar ?? false,
      };
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    submitting.value = true;

    const payload = {
      name: form.name,
      type: form.type,
      target: form.target,
      interval: form.interval,
      timeout: form.timeout,
      regions: form.regions,
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
