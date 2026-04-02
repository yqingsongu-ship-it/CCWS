<template>
  <div class="api-import-page">
    <a-page-header
      title="Postman 导入"
      :ghost="false"
      @back="() => $router.push('/apis')"
    />

    <a-card :bordered="false">
      <a-steps :current="currentStep" class="mb-card">
        <a-step title="上传文件" />
        <a-step title="选择接口" />
        <a-step title="配置监控" />
        <a-step title="完成" />
      </a-steps>

      <!-- Step 1: Upload -->
      <div v-if="currentStep === 0" class="step-container">
        <a-upload-dragger
          v-model:fileList="fileList"
          :beforeUpload="beforeUpload"
          :remove="handleRemove"
          accept=".json"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined :style="{ color: '#1890ff' }" />
          </p>
          <p class="ant-upload-text">点击或拖拽 Postman 集合文件到此处上传</p>
          <p class="ant-upload-hint">支持的文件格式：Postman Collection JSON (.json)</p>
        </a-upload-dragger>

        <a-alert
          v-if="parseError"
          type="error"
          :message="parseError"
          show-icon
          class="mt-4"
        />

        <a-alert
          v-if="collectionInfo"
          type="success"
          show-icon
          class="mt-4"
        >
          <template #message>
            <div>
              <strong>{{ collectionInfo.name }}</strong>
              <span class="ml-2">包含 {{ collectionInfo.itemCount }} 个请求</span>
            </div>
          </template>
        </a-alert>
      </div>

      <!-- Step 2: Select APIs -->
      <div v-if="currentStep === 1" class="step-container">
        <a-card title="选择要监控的 API" class="mb-card">
          <template #extra>
            <a-space>
              <a-button size="small" @click="selectAll">全选</a-button>
              <a-button size="small" @click="deselectAll">取消全选</a-button>
            </a-space>
          </template>
          <a-checkbox-group v-model:value="selectedApis" class="api-list">
            <div v-for="item in postmanItems" :key="item.path" class="api-item">
              <a-checkbox :value="item.path">
                <div class="api-info">
                  <a-tag :color="getMethodColor(item.method)">{{ item.method }}</a-tag>
                  <span class="api-name">{{ item.name }}</span>
                </div>
              </a-checkbox>
              <a-typography-text class="api-url" type="secondary">{{ item.url }}</a-typography-text>
            </div>
          </a-checkbox-group>
        </a-card>
      </div>

      <!-- Step 3: Configure -->
      <div v-if="currentStep === 2" class="step-container">
        <a-card title="监控配置" class="mb-card">
          <a-form :model="config" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="监控间隔">
                  <a-select v-model:value="config.interval">
                    <a-select-option :value="60">1 分钟</a-select-option>
                    <a-select-option :value="120">2 分钟</a-select-option>
                    <a-select-option :value="300">5 分钟</a-select-option>
                    <a-select-option :value="600">10 分钟</a-select-option>
                    <a-select-option :value="1800">30 分钟</a-select-option>
                    <a-select-option :value="3600">1 小时</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="超时时间">
                  <a-input-number v-model:value="config.timeout" :min="5" :max="300" addon-after="秒" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="告警通知">
              <a-checkbox-group v-model:value="config.channels">
                <a-checkbox value="EMAIL">邮件</a-checkbox>
                <a-checkbox value="WEBHOOK">Webhook</a-checkbox>
                <a-checkbox value="DINGTALK">钉钉</a-checkbox>
                <a-checkbox value="WECHAT">企业微信</a-checkbox>
              </a-checkbox-group>
            </a-form-item>

            <a-form-item label="探测区域">
              <a-select v-model:value="config.regions" mode="multiple" placeholder="选择探测区域，不选则为全部">
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

            <a-form-item label="认证配置（全局，可选）">
              <a-select v-model:value="config.authType" style="width: 200px">
                <a-select-option value="none">无认证</a-select-option>
                <a-select-option value="bearer">Bearer Token</a-select-option>
                <a-select-option value="basic">Basic Auth</a-select-option>
                <a-select-option value="apikey">API Key</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item v-if="config.authType === 'bearer'" label="Bearer Token">
              <a-input v-model:value="config.authToken" placeholder="输入 Bearer Token" />
            </a-form-item>

            <a-form-item v-if="config.authType === 'basic'">
              <template #label>
                <a-space>
                  <span>Basic Auth</span>
                  <a-input v-model:value="config.authUsername" placeholder="用户名" style="width: 200px" />
                  <a-input-password v-model:value="config.authPassword" placeholder="密码" style="width: 200px" />
                </a-space>
              </template>
            </a-form-item>

            <a-form-item v-if="config.authType === 'apikey'">
              <template #label>
                <a-space>
                  <span>API Key</span>
                  <a-input v-model:value="config.apiKeyName" placeholder="Key 名称" style="width: 150px" />
                  <a-input v-model:value="config.apiKeyValue" placeholder="Key 值" style="width: 200px" />
                </a-space>
              </template>
            </a-form-item>
          </a-form>
        </a-card>
      </div>

      <!-- Step 4: Complete -->
      <div v-if="currentStep === 3" class="step-container">
        <a-result
          status="success"
          title="导入成功"
          :sub-title="`成功创建 ${importedCount} 个 API 监控任务`"
        >
          <template #extra>
            <a-space>
              <a-button @click="resetImport">继续导入</a-button>
              <a-button type="primary" @click="$router.push('/apis')">查看监控列表</a-button>
            </a-space>
          </template>
        </a-result>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons" v-if="currentStep < 3">
        <a-space>
          <a-button v-if="currentStep > 0" @click="currentStep--">上一步</a-button>
          <a-button type="primary" @click="handleNext" :disabled="!canNext" :loading="importing">
            {{ currentStep === 2 ? '开始导入' : '下一步' }}
          </a-button>
        </a-space>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';
import type { UploadFile } from 'ant-design-vue';
import { useMonitorStore } from '@/stores/monitor';

const monitorStore = useMonitorStore();

const currentStep = ref(0);
const fileList = ref<UploadFile[]>([]);
const postmanItems = ref<Array<{ path: string; name: string; method: string; url: string; request: any }>>([]);
const selectedApis = ref<string[]>([]);
const importedCount = ref(0);
const importing = ref(false);
const parseError = ref('');
const collectionInfo = ref<{ name: string; itemCount: number } | null>(null);

const config = ref({
  interval: 120,
  timeout: 30,
  channels: ['EMAIL'] as string[],
  regions: [] as string[],
  authType: 'none' as string,
  authToken: '',
  authUsername: '',
  authPassword: '',
  apiKeyName: '',
  apiKeyValue: '',
});

const canNext = computed(() => {
  if (currentStep.value === 0) {
    return fileList.value.length > 0 && !parseError.value && collectionInfo.value !== null;
  }
  if (currentStep.value === 1) {
    return selectedApis.value.length > 0;
  }
  return true;
});

const beforeUpload = async (file: UploadFile) => {
  parseError.value = '';
  collectionInfo.value = null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsText(file.file as any);
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        parsePostmanCollection(json);
        resolve(false);
      } catch (err: any) {
        parseError.value = `JSON 解析失败：${err.message}`;
        resolve(false);
      }
    };
    reader.onerror = () => {
      parseError.value = '文件读取失败';
      resolve(false);
    };
  });
};

const parsePostmanCollection = (collection: any) => {
  const info = collection.info || {};
  const name = info.name || '未命名集合';

  // Parse items recursively
  const items: Array<{ path: string; name: string; method: string; url: string; request: any }> = [];

  const parseItem = (item: any, parentPath = '') => {
    if (item.request) {
      // This is a request item
      const method = item.request.method || 'GET';
      const urlObj = item.request.url?.raw || item.request.url;
      const url = typeof urlObj === 'string' ? urlObj : JSON.stringify(urlObj);
      const path = parentPath ? `${parentPath} / ${item.name || 'Unnamed'}` : (item.name || 'Unnamed');

      items.push({
        path,
        name: item.name || 'Unnamed Request',
        method,
        url,
        request: item.request,
      });
    } else if (item.item && Array.isArray(item.item)) {
      // This is a folder/container
      const folderPath = parentPath ? `${parentPath} / ${item.name || 'Folder'}` : (item.name || 'Folder');
      item.item.forEach((subItem: any) => parseItem(subItem, folderPath));
    }
  };

  if (collection.item && Array.isArray(collection.item)) {
    collection.item.forEach((item: any) => parseItem(item));
  }

  if (items.length === 0) {
    parseError.value = '集合中没有找到任何请求';
    return;
  }

  postmanItems.value = items;
  selectedApis.value = items.map(i => i.path);
  collectionInfo.value = { name, itemCount: items.length };
  message.success(`解析成功：${name}，包含 ${items.length} 个请求`);
};

const handleRemove = () => {
  fileList.value = [];
  postmanItems.value = [];
  selectedApis.value = [];
  collectionInfo.value = null;
  parseError.value = '';
};

const selectAll = () => {
  selectedApis.value = postmanItems.value.map(i => i.path);
};

const deselectAll = () => {
  selectedApis.value = [];
};

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
    HEAD: 'cyan',
    OPTIONS: 'gold',
  };
  return colors[method] || 'default';
};

const buildAuthConfig = () => {
  if (config.value.authType === 'none') {
    return { type: 'none' };
  }

  if (config.value.authType === 'bearer') {
    return {
      type: 'bearer',
      token: config.value.authToken,
    };
  }

  if (config.value.authType === 'basic') {
    return {
      type: 'basic',
      username: config.value.authUsername,
      password: config.value.authPassword,
    };
  }

  if (config.value.authType === 'apikey') {
    return {
      type: 'apikey',
      key: config.value.apiKeyName,
      value: config.value.apiKeyValue,
    };
  }

  return { type: 'none' };
};

const buildMonitorPayload = (item: { path: string; name: string; method: string; url: string; request: any }) => {
  const auth = buildAuthConfig();

  // Build headers from request
  const headers: Record<string, string> = {};
  if (item.request.header && Array.isArray(item.request.header)) {
    item.request.header.forEach((h: any) => {
      if (h.key && h.value) {
        headers[h.key] = h.value;
      }
    });
  }

  // Merge auth headers
  if (auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'basic') {
    const credentials = btoa(`${auth.username}:${auth.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (auth.type === 'apikey') {
    headers[auth.key] = auth.value;
  }

  // Build body
  let body = '';
  let bodyType: 'json' | 'form' | 'text' | 'none' = 'none';

  if (item.request.body) {
    if (item.request.body.raw) {
      body = item.request.body.raw;
      bodyType = 'json';
    } else if (item.request.body.urlencoded) {
      const params: Record<string, string> = {};
      item.request.body.urlencoded.forEach((p: any) => {
        if (p.key && p.value) {
          params[p.key] = p.value;
        }
      });
      body = JSON.stringify(params);
      bodyType = 'json';
    } else if (item.request.body.formdata) {
      bodyType = 'form';
    }
  }

  return {
    name: item.name,
    type: 'API' as const,
    target: item.url,
    interval: config.value.interval,
    timeout: config.value.timeout,
    regions: config.value.regions,
    enabled: true,
    config: {
      method: item.method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body || undefined,
      bodyType,
      expectedStatusCode: 200,
      followRedirects: true,
      validateSSL: true,
      auth: auth.type !== 'none' ? auth : undefined,
      assertions: [
        { type: 'status', operator: 'eq', value: '200' },
      ],
    },
    alertRules: [
      {
        id: `rule_${Date.now()}`,
        name: `${item.name} - 服务宕机告警`,
        type: 'DOWN' as const,
        condition: { type: 'DOWN', threshold: 3 },
        notificationChannels: config.value.channels,
        recipients: ['admin@example.com'],
        enabled: true,
      },
    ],
  };
};

const handleNext = async () => {
  if (currentStep.value === 2) {
    importing.value = true;
    try {
      // Import selected APIs
      const selected = postmanItems.value.filter(i => selectedApis.value.includes(i.path));

      for (const item of selected) {
        const payload = buildMonitorPayload(item);
        await monitorStore.createMonitor(payload);
      }

      importedCount.value = selected.length;
      currentStep.value = 3;
      message.success(`成功导入 ${selected.length} 个 API 监控`);
    } catch (error: any) {
      message.error(`导入失败：${error.message || '未知错误'}`);
    } finally {
      importing.value = false;
    }
  } else {
    currentStep.value++;
  }
};

const resetImport = () => {
  currentStep.value = 0;
  fileList.value = [];
  postmanItems.value = [];
  selectedApis.value = [];
  importedCount.value = 0;
  parseError.value = '';
  collectionInfo.value = null;
};
</script>

<style scoped>
.api-import-page {
  padding: 24px;
}

.mb-card {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.step-container {
  min-height: 400px;
}

.api-list {
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
}

.api-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.api-item:last-child {
  border-bottom: none;
}

.api-item:hover {
  background: #fafafa;
}

.api-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-name {
  font-weight: 500;
}

.api-url {
  font-size: 12px;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  margin-top: 24px;
  text-align: right;
}
</style>
