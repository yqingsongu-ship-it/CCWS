<template>
  <div class="monitor-create">
    <a-page-header
      title="创建监控任务"
      :ghost="false"
      @back="() => $router.push('/monitors')"
    />

    <a-card class="form-card">
      <a-form layout="vertical" :model="form" :rules="rules" ref="formRef">
        <a-form-item label="监控类型" name="type">
          <monitor-type-selector v-model="form.type" />
        </a-form-item>

        <a-form-item label="任务名称" name="name">
          <a-input v-model:value="form.name" placeholder="例如：Google 首页监控" />
        </a-form-item>

        <a-form-item label="监控目标" name="target">
          <a-input
            v-model:value="form.target"
            :placeholder="getTargetPlaceholder(form.type)"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="检查间隔" name="interval">
              <a-input-number
                v-model:value="form.interval"
                :min="30"
                :max="3600"
                style="width: 100%"
                addon-after="秒"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="超时时间" name="timeout">
              <a-input-number
                v-model:value="form.timeout"
                :min="5"
                :max="300"
                style="width: 100%"
                addon-after="秒"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="探测区域">
          <a-select
            v-model:value="form.regions"
            mode="multiple"
            style="width: 100%"
            placeholder="选择探测区域，不选则为全部区域"
          >
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

        <!-- 动态配置表单 -->
        <component
          :is="getConfigComponent(form.type)"
          v-model="form.config"
        />

        <a-divider />

        <a-form-item label="告警规则">
          <alert-rules-form v-model="form.alertRules" />
        </a-form-item>

        <a-divider />

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting" @click="handleSubmit">
              创建监控
            </a-button>
            <a-button @click="() => $router.push('/monitors')">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useMonitorStore } from '@/stores/monitor';
import MonitorTypeSelector from './components/MonitorTypeSelector.vue';
import AlertRulesForm from './components/AlertRulesForm.vue';
import type { MonitorType } from '@synthetic-monitoring/shared';

const router = useRouter();
const monitorStore = useMonitorStore();
const formRef = ref();
const submitting = ref(false);

// 异步加载配置组件
const HttpConfig = defineAsyncComponent(() => import('./components/HttpConfig.vue'));
const ApiConfig = defineAsyncComponent(() => import('./components/ApiConfig.vue'));
const PingConfig = defineAsyncComponent(() => import('./components/PingConfig.vue'));
const DnsConfig = defineAsyncComponent(() => import('./components/DnsConfig.vue'));
const TcpConfig = defineAsyncComponent(() => import('./components/TcpConfig.vue'));

const form = reactive({
  type: 'HTTPS' as MonitorType,
  name: '',
  target: '',
  interval: 60,
  timeout: 30,
  regions: [] as string[],
  config: {} as any,
  alertRules: [] as any[],
});

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  target: [{ required: true, message: '请输入监控目标', trigger: 'blur' }],
  interval: [{ required: true, message: '请设置检查间隔', trigger: 'change' }],
  timeout: [{ required: true, message: '请设置超时时间', trigger: 'change' }],
};

const getTargetPlaceholder = (type: MonitorType) => {
  const placeholders: Record<string, string> = {
    HTTPS: 'https://www.example.com',
    HTTP: 'http://www.example.com',
    API: 'https://api.example.com/v1/users',
    PING: '8.8.8.8 或 www.example.com',
    DNS: 'www.example.com',
    TCP: 'www.example.com:443',
    UDP: '8.8.8.8:53',
    FTP: 'ftp.example.com',
    PAGE_PERF: 'https://www.example.com',
  };
  return placeholders[type] || '输入目标地址';
};

const getConfigComponent = (type: MonitorType) => {
  const configMap: Record<string, any> = {
    HTTPS: HttpConfig,
    HTTP: HttpConfig,
    API: ApiConfig,
    PING: PingConfig,
    DNS: DnsConfig,
    TCP: TcpConfig,
    UDP: TcpConfig,
    FTP: TcpConfig,
    PAGE_PERF: 'div',
  };
  return configMap[type] || 'div';
};

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
      enabled: true,
      config: form.config,
      alertRules: form.alertRules.map((r) => ({
        ...r,
        recipients: r.recipientsString?.split('\n').filter(Boolean) || [],
      })),
    };

    await monitorStore.createMonitor(payload);
    message.success('监控任务创建成功');
    router.push('/monitors');
  } catch (error: any) {
    console.error('Failed to create monitor:', error);
    message.error(error?.message || '创建失败，请检查输入');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.monitor-create {
  padding: 24px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}

.form-card {
  margin-top: 16px;
}

:deep(.ant-page-header) {
  background: #fff;
  padding: 16px 24px;
  border-radius: 4px;
}
</style>
