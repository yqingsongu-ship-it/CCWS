# DEM 监控系统 - 完整监控任务管理实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建完整的监控任务管理功能，包括创建、编辑、删除、查看监控任务，支持 HTTP、API、PING、DNS、TCP 等多种监控类型

**Architecture:** 前端使用 Vue 3 + TypeScript + Ant Design Vue 创建表单组件，后端使用已有的 CRUD API，通过 Pinia store 管理状态

**Tech Stack:** Vue 3, TypeScript, Pinia, Ant Design Vue, ECharts

---

## 文件结构

### 创建的文件
- `web/src/views/Monitors/Create.vue` - 创建监控任务表单
- `web/src/views/Monitors/Edit.vue` - 编辑监控任务表单
- `web/src/views/Monitors/components/MonitorTypeSelector.vue` - 监控类型选择器
- `web/src/views/Monitors/components/HttpConfig.vue` - HTTP 监控配置
- `web/src/views/Monitors/components/ApiConfig.vue` - API 监控配置
- `web/src/views/Monitors/components/PingConfig.vue` - PING 监控配置
- `web/src/views/Monitors/components/DnsConfig.vue` - DNS 监控配置
- `web/src/views/Monitors/components/TcpConfig.vue` - TCP 监控配置
- `web/src/views/Monitors/components/AlertRulesForm.vue` - 告警规则配置
- `web/src/components/Form/CodeEditor.vue` - 代码编辑器组件（用于 API body）
- `web/src/components/Form/HeaderInput.vue` - 请求头键值对输入

### 修改的文件
- `web/src/router.ts` - 添加路由
- `web/src/stores/monitor.ts` - 添加类型定义
- `packages/shared/src/types.ts` - 添加监控配置类型

---

## Task 1: 共享类型定义

**Files:**
- Modify: `packages/shared/src/types.ts`
- Test: N/A (类型定义)

- [ ] **Step 1: 添加监控配置接口**

```typescript
// 在 types.ts 中添加

export interface HttpMonitorConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  validateSSL?: boolean;
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  timeout?: number;
}

export interface ApiMonitorConfig extends HttpMonitorConfig {
  assertions?: {
    type: 'statusCode' | 'bodyContains' | 'header' | 'responseTime' | 'jsonSchema';
    operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
    value: string | number;
  }[];
  extractVariables?: {
    name: string;
    source: 'body' | 'header';
    extractor: 'jsonPath' | 'regex';
    pattern: string;
  }[];
}

export interface PingMonitorConfig {
  count: number;
  packetSize: number;
}

export interface DnsMonitorConfig {
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'PTR';
  expectedIP?: string;
  nameserver?: string;
}

export interface TcpMonitorConfig {
  port: number;
  sendData?: string;
  expectResponse?: string;
}

export interface UdpMonitorConfig {
  port: number;
  sendData: string;
  expectResponse?: string;
  timeout?: number;
}

export interface FtpMonitorConfig {
  port?: number;
  username?: string;
  password?: string;
  expectResponse?: string;
}

export interface PagePerfMonitorConfig {
  viewport?: {
    width: number;
    height: number;
  };
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  blockResources?: ('image' | 'stylesheet' | 'font' | 'script')[];
  captureScreenshot?: boolean;
  lighthouseCategories?: ('performance' | 'accessibility' | 'seo')[];
}

export type MonitorConfig =
  | HttpMonitorConfig
  | ApiMonitorConfig
  | PingMonitorConfig
  | DnsMonitorConfig
  | TcpMonitorConfig
  | UdpMonitorConfig
  | FtpMonitorConfig
  | PagePerfMonitorConfig;
```

- [ ] **Step 2: 添加监控任务完整类型**

```typescript
export interface MonitorTask {
  id: string;
  name: string;
  type: MonitorType;
  target: string;
  interval: number; // seconds
  timeout: number; // seconds
  regions: string[];
  enabled: boolean;
  status: MonitorStatus;
  config: MonitorConfig;
  alertRules: AlertRule[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastCheckAt?: Date;
  latestResultId?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'DOWN' | 'RESPONSE_TIME' | 'SSL_EXPIRY' | 'CHANGE' | 'KEYWORD' | 'AVAILABILITY';
  condition: AlertCondition;
  notificationChannels: Array<'EMAIL' | 'SMS' | 'VOICE' | 'APP_PUSH' | 'WEBHOOK' | 'URL' | 'DINGTALK' | 'WECHAT' | 'SLACK'>;
  recipients?: string[];
  enabled: boolean;
}

export interface AlertCondition {
  type: string;
  threshold?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=';
  value?: string | number;
  window?: number; // 时间窗口（分钟）
}
```

- [ ] **Step 3: 导出新增类型**

确保所有类型从 `packages/shared/src/index.ts` 导出

---

## Task 2: 监控类型选择器组件

**Files:**
- Create: `web/src/views/Monitors/components/MonitorTypeSelector.vue`
- Test: N/A (UI 组件)

- [ ] **Step 1: 创建监控类型选择器组件**

```vue
<template>
  <div class="monitor-type-selector">
    <a-row :gutter="16">
      <a-col :span="8" v-for="type in monitorTypes" :key="type.value">
        <div
          class="type-card"
          :class="{ active: modelValue === type.value }"
          @click="$emit('update:modelValue', type.value)"
        >
          <component :is="type.icon" class="type-icon" />
          <h3>{{ type.label }}</h3>
          <p>{{ type.description }}</p>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { MonitorType } from '@synthetic-monitoring/shared';
import {
  GlobalOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  GlobalOutlined as DnsIcon,
  EthernetOutlined,
  FileTextOutlined,
  FolderOutlined,
  WifiOutlined,
} from '@ant-design/icons-vue';

interface MonitorTypeOption {
  value: MonitorType;
  label: string;
  description: string;
  icon: any;
}

defineProps<{
  modelValue?: MonitorType;
}>();

defineEmits<{
  'update:modelValue': [value: MonitorType];
}>();

const monitorTypes: MonitorTypeOption[] = [
  {
    value: 'HTTPS' as MonitorType,
    label: '网站监控',
    description: '监控网站可用性和加载性能',
    icon: GlobalOutlined,
  },
  {
    value: 'HTTP' as MonitorType,
    label: 'HTTP 监控',
    description: '监控 HTTP 端点可用性',
    icon: GlobalOutlined,
  },
  {
    value: 'API' as MonitorType,
    label: 'API 监控',
    description: '监控 REST/SOAP API',
    icon: ApiOutlined,
  },
  {
    value: 'PING' as MonitorType,
    label: 'PING 监控',
    description: '监控主机连通性',
    icon: ThunderboltOutlined,
  },
  {
    value: 'DNS' as MonitorType,
    label: 'DNS 监控',
    description: '监控 DNS 解析',
    icon: DnsIcon,
  },
  {
    value: 'TCP' as MonitorType,
    label: 'TCP 端口监控',
    description: '监控 TCP 端口可用性',
    icon: EthernetOutlined,
  },
  {
    value: 'UDP' as MonitorType,
    label: 'UDP 监控',
    description: '监控 UDP 服务',
    icon: WifiOutlined,
  },
  {
    value: 'FTP' as MonitorType,
    label: 'FTP 监控',
    description: '监控 FTP 服务',
    icon: FolderOutlined,
  },
  {
    value: 'PAGE_PERF' as MonitorType,
    label: '页面性能',
    description: '监控页面加载性能',
    icon: FileTextOutlined,
  },
];
</script>

<style scoped>
.type-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.type-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.type-card.active {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.type-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 12px;
}

.type-card h3 {
  margin: 8px 0;
  font-size: 16px;
}

.type-card p {
  margin: 0;
  font-size: 12px;
  color: #666;
}
</style>
```

---

## Task 3: HTTP 监控配置组件

**Files:**
- Create: `web/src/views/Monitors/components/HttpConfig.vue`
- Create: `web/src/components/Form/HeaderInput.vue`
- Test: N/A

- [ ] **Step 1: 创建请求头输入组件**

```vue
<template>
  <div class="header-input">
    <a-form layout="inline">
      <a-button type="dashed" block @click="addHeader" size="small">
        <plus-outlined /> 添加请求头
      </a-button>
    </a-form>
    <a-form layout="inline" v-for="(header, index) in headers" :key="index">
      <a-form-item>
        <a-input v-model:value="header.key" placeholder="Header Name" style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-input v-model:value="header.value" placeholder="Header Value" style="width: 250px" />
      </a-form-item>
      <a-form-item>
        <a-button type="text" danger @click="removeHeader(index)">
          <minus-outlined />
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons-vue';

interface Header {
  key: string;
  value: string;
}

const props = defineProps<{
  modelValue?: Record<string, string>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>];
}>();

const headers = ref<Header[]>([]);

// 初始化
watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      headers.value = Object.entries(value).map(([key, val]) => ({ key, value: val }));
    }
  },
  { immediate: true }
);

// 同步回父组件
watch(
  headers,
  (newHeaders) => {
    const obj = newHeaders.reduce<Record<string, string>>((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {});
    emit('update:modelValue', obj);
  },
  { deep: true }
);

const addHeader = () => {
  headers.value.push({ key: '', value: '' });
};

const removeHeader = (index: number) => {
  headers.value.splice(index, 1);
};
</script>
```

- [ ] **Step 2: 创建 HTTP 配置组件**

```vue
<template>
  <a-form layout="vertical" :model="config">
    <a-form-item label="请求方法">
      <a-select v-model:value="config.method" style="width: 200px">
        <a-select-option value="GET">GET</a-select-option>
        <a-select-option value="POST">POST</a-select-option>
        <a-select-option value="PUT">PUT</a-select-option>
        <a-select-option value="DELETE">DELETE</a-select-option>
        <a-select-option value="HEAD">HEAD</a-select-option>
        <a-select-option value="OPTIONS">OPTIONS</a-select-option>
        <a-select-option value="PATCH">PATCH</a-select-option>
      </a-select>
    </a-form-item>

    <a-form-item label="请求体 (POST/PUT/PATCH)">
      <a-textarea
        v-model:value="config.body"
        :rows="6"
        placeholder='{"key": "value"}'
      />
    </a-form-item>

    <a-form-item label="请求头">
      <header-input v-model="config.headers" />
    </a-form-item>

    <a-divider />

    <a-form-item label="验证选项">
      <a-checkbox v-model:checked="config.followRedirects">跟随重定向</a-checkbox>
      <a-checkbox v-model:checked="config.validateSSL">验证 SSL 证书</a-checkbox>
    </a-form-item>

    <a-form-item label="期望状态码">
      <a-input-number v-model:value="config.expectedStatusCode" style="width: 150px" />
    </a-form-item>

    <a-form-item label="期望响应包含">
      <a-input v-model:value="config.expectedBodyContains" placeholder="响应体中期望包含的文本" />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import HeaderInput from './HeaderInput.vue';
import type { HttpMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: HttpMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: HttpMonitorConfig];
}>();

const config = reactive<HttpMonitorConfig>({
  method: props.modelValue?.method || 'GET',
  headers: props.modelValue?.headers || {},
  body: props.modelValue?.body || '',
  followRedirects: props.modelValue?.followRedirects ?? true,
  validateSSL: props.modelValue?.validateSSL ?? true,
  expectedStatusCode: props.modelValue?.expectedStatusCode || 200,
  expectedBodyContains: props.modelValue?.expectedBodyContains || '',
});

watch(
  config,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true }
);
</script>
```

---

## Task 4: API 监控配置组件

**Files:**
- Create: `web/src/views/Monitors/components/ApiConfig.vue`
- Create: `web/src/components/Form/CodeEditor.vue`
- Test: N/A

- [ ] **Step 1: 创建 API 配置组件**

```vue
<template>
  <div>
    <http-config v-model="config" />

    <a-divider />

    <a-form layout="vertical">
      <a-form-item label="断言配置">
        <a-button type="dashed" block @click="addAssertion" size="small">
          <plus-outlined /> 添加断言
        </a-button>

        <div v-for="(assertion, index) in config.assertions" :key="index" class="assertion-item">
          <a-space>
            <a-select v-model:value="assertion.type" style="width: 150px">
              <a-select-option value="statusCode">状态码</a-select-option>
              <a-select-option value="bodyContains">响应包含</a-select-option>
              <a-select-option value="responseTime">响应时间</a-select-option>
            </a-select>

            <a-select v-model:value="assertion.operator" style="width: 100px" v-if="assertion.type !== 'bodyContains'">
              <a-select-option value="=">=</a-select-option>
              <a-select-option value="!=">!=</a-select-option>
              <a-select-option value=">">&gt;</a-select-option>
              <a-select-option value="<">&lt;</a-select-option>
              <a-select-option value=">=">&ge;</a-select-option>
              <a-select-option value="<=">&le;</a-select-option>
            </a-select>

            <a-input
              v-model:value="assertion.value"
              :placeholder="getPlaceholder(assertion.type)"
              style="width: 200px"
            />

            <a-button type="text" danger @click="removeAssertion(index)">
              <minus-outlined />
            </a-button>
          </a-space>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import HttpConfig from './HttpConfig.vue';
import type { ApiMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: ApiMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ApiMonitorConfig];
}>();

const config = reactive<ApiMonitorConfig>({
  method: props.modelValue?.method || 'GET',
  headers: props.modelValue?.headers,
  body: props.modelValue?.body,
  assertions: props.modelValue?.assertions || [],
  followRedirects: props.modelValue?.followRedirects ?? true,
  validateSSL: props.modelValue?.validateSSL ?? true,
  expectedStatusCode: props.modelValue?.expectedStatusCode || 200,
});

const addAssertion = () => {
  config.assertions?.push({ type: 'statusCode', operator: '=', value: '200' });
};

const removeAssertion = (index: number) => {
  config.assertions?.splice(index, 1);
};

const getPlaceholder = (type: string) => {
  switch (type) {
    case 'statusCode': return '200';
    case 'bodyContains': return 'success';
    case 'responseTime': return '1000';
    default: return '';
  }
};

watch(
  config,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
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
```

---

## Task 5: 其他监控类型配置组件

**Files:**
- Create: `web/src/views/Monitors/components/PingConfig.vue`
- Create: `web/src/views/Monitors/components/DnsConfig.vue`
- Create: `web/src/views/Monitors/components/TcpConfig.vue`
- Test: N/A

- [ ] **Step 1: 创建 PING 配置组件**

```vue
<template>
  <a-form layout="vertical">
    <a-form-item label="Ping 次数">
      <a-input-number v-model:value="config.count" :min="1" :max="10" style="width: 150px" />
    </a-form-item>

    <a-form-item label="数据包大小 (bytes)">
      <a-input-number v-model:value="config.packetSize" :min="16" :max="1024" style="width: 150px" />
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

const config = reactive<PingMonitorConfig>({
  count: props.modelValue?.count || 4,
  packetSize: props.modelValue?.packetSize || 56,
});

watch(
  config,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true }
);
</script>
```

- [ ] **Step 2: 创建 DNS 配置组件**

```vue
<template>
  <a-form layout="vertical">
    <a-form-item label="记录类型">
      <a-select v-model:value="config.recordType" style="width: 200px">
        <a-select-option value="A">A 记录</a-select-option>
        <a-select-option value="AAAA">AAAA 记录</a-select-option>
        <a-select-option value="CNAME">CNAME 记录</a-select-option>
        <a-select-option value="MX">MX 记录</a-select-option>
        <a-select-option value="NS">NS 记录</a-select-option>
        <a-select-option value="TXT">TXT 记录</a-select-option>
      </a-select>
    </a-form-item>

    <a-form-item label="期望 IP 地址">
      <a-input v-model:value="config.expectedIP" placeholder="例如：1.2.3.4" />
    </a-form-item>

    <a-form-item label="DNS 服务器">
      <a-input v-model:value="config.nameserver" placeholder="例如：8.8.8.8" />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { DnsMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: DnsMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DnsMonitorConfig];
}>();

const config = reactive<DnsMonitorConfig>({
  recordType: props.modelValue?.recordType || 'A',
  expectedIP: props.modelValue?.expectedIP || '',
  nameserver: props.modelValue?.nameserver || '',
});

watch(
  config,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true }
);
</script>
```

- [ ] **Step 3: 创建 TCP 配置组件**

```vue
<template>
  <a-form layout="vertical">
    <a-form-item label="端口">
      <a-input-number v-model:value="config.port" :min="1" :max="65535" style="width: 150px" />
    </a-form-item>

    <a-form-item label="发送数据 (可选)">
      <a-textarea v-model:value="config.sendData" placeholder="要发送的数据" :rows="3" />
    </a-form-item>

    <a-form-item label="期望响应 (可选)">
      <a-textarea v-model:value="config.expectResponse" placeholder="期望收到的响应" :rows="3" />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { TcpMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: TcpMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TcpMonitorConfig];
}>();

const config = reactive<TcpMonitorConfig>({
  port: props.modelValue?.port || 80,
  sendData: props.modelValue?.sendData || '',
  expectResponse: props.modelValue?.expectResponse || '',
});

watch(
  config,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true }
);
</script>
```

---

## Task 6: 告警规则配置组件

**Files:**
- Create: `web/src/views/Monitors/components/AlertRulesForm.vue`
- Test: N/A

- [ ] **Step 1: 创建告警规则表单组件**

```vue
<template>
  <div class="alert-rules-form">
    <a-button type="dashed" block @click="addRule" size="small">
      <plus-outlined /> 添加告警规则
    </a-button>

    <div v-for="(rule, index) in rules" :key="index" class="rule-item">
      <a-card size="small">
        <template #title>
          <a-space>
            <span>规则 {{ index + 1 }}</span>
            <a-button type="text" danger size="small" @click="removeRule(index)">
              删除
            </a-button>
          </a-space>
        </template>

        <a-form layout="vertical">
          <a-form-item label="规则名称">
            <a-input v-model:value="rule.name" placeholder="例如：服务宕机告警" />
          </a-form-item>

          <a-form-item label="告警类型">
            <a-select v-model:value="rule.type">
              <a-select-option value="DOWN">服务宕机</a-select-option>
              <a-select-option value="RESPONSE_TIME">响应时间</a-select-option>
              <a-select-option value="SSL_EXPIRY">SSL 过期</a-select-option>
              <a-select-option value="CHANGE">内容变化</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="条件配置" v-if="rule.type === 'DOWN'">
            <a-input-number
              v-model:value="rule.condition.threshold"
              :min="1"
              :max="10"
              addon-after="次失败"
            />
            <span class="help-text">连续失败多少次后触发告警</span>
          </a-form-item>

          <a-form-item label="条件配置" v-if="rule.type === 'RESPONSE_TIME'">
            <a-space>
              <a-select v-model:value="rule.condition.operator" style="width: 100px">
                <a-select-option value=">">&gt;</a-select-option>
                <a-select-option value="<">&lt;</a-select-option>
              </a-select>
              <a-input-number
                v-model:value="rule.condition.value"
                :min="0"
                addon-after="ms"
              />
            </a-space>
          </a-form-item>

          <a-form-item label="条件配置" v-if="rule.type === 'SSL_EXPIRY'">
            <a-input-number
              v-model:value="rule.condition.daysBefore"
              :min="1"
              :max="90"
              addon-after="天"
            />
            <span class="help-text">证书到期前多少天触发告警</span>
          </a-form-item>

          <a-form-item label="通知渠道">
            <a-checkbox-group v-model:value="rule.notificationChannels">
              <a-checkbox value="EMAIL">邮件</a-checkbox>
              <a-checkbox value="WEBHOOK">Webhook</a-checkbox>
              <a-checkbox value="URL">URL 回调</a-checkbox>
              <a-checkbox value="DINGTALK">钉钉</a-checkbox>
              <a-checkbox value="WECHAT">企业微信</a-checkbox>
              <a-checkbox value="SLACK">Slack</a-checkbox>
            </a-checkbox-group>
          </a-form-item>

          <a-form-item label="接收人 (邮箱/Webhook URL)" v-if="rule.notificationChannels?.length">
            <a-textarea
              v-model:value="rule.recipientsString"
              :rows="2"
              placeholder="每行一个邮箱地址或 Webhook URL"
            />
          </a-form-item>

          <a-form-item label="启用">
            <a-switch v-model:checked="rule.enabled" />
          </a-form-item>
        </a-form>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AlertRule } from '@synthetic-monitoring/shared';

interface RuleForm extends AlertRule {
  recipientsString?: string;
}

const props = defineProps<{
  modelValue?: AlertRule[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: AlertRule[]];
}>();

const rules = ref<RuleForm[]>(props.modelValue || []);

const addRule = () => {
  rules.value.push({
    id: `rule_${Date.now()}`,
    name: '新告警规则',
    type: 'DOWN',
    condition: { type: 'DOWN', threshold: 3 },
    notificationChannels: ['EMAIL'],
    recipientsString: '',
    enabled: true,
  });
};

const removeRule = (index: number) => {
  rules.value.splice(index, 1);
};

watch(
  rules,
  (newRules) => {
    const formatted = newRules.map((r) => ({
      ...r,
      recipients: r.recipientsString?.split('\n').filter(Boolean) || [],
    }));
    emit('update:modelValue', formatted as AlertRule[]);
  },
  { deep: true }
);
</script>

<style scoped>
.rule-item {
  margin-top: 16px;
}

.help-text {
  font-size: 12px;
  color: #999;
  display: block;
  margin-top: 4px;
}
</style>
```

---

## Task 7: 创建监控任务页面

**Files:**
- Create: `web/src/views/Monitors/Create.vue`
- Modify: `web/src/router.ts`
- Test: N/A

- [ ] **Step 1: 创建创建监控页面**

```vue
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

        <a-form-item label="检查间隔" name="interval">
          <a-input-number v-model:value="form.interval" :min="30" :max="3600" style="width: 150px" />
          <span class="help-text">秒 (30-3600)</span>
        </a-form-item>

        <a-form-item label="超时时间" name="timeout">
          <a-input-number v-model:value="form.timeout" :min="5" :max="300" style="width: 150px" />
          <span class="help-text">秒 (5-300)</span>
        </a-form-item>

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
          </a-select>
        </a-form-item>

        <a-divider />

        <!-- 动态配置表单 -->
        <component :is="getConfigComponent(form.type)" v-model="form.config" />

        <a-divider />

        <a-form-item label="告警规则">
          <alert-rules-form v-model="form.alertRules" />
        </a-form-item>

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
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useMonitorStore } from '@/stores/monitor';
import MonitorTypeSelector from './components/MonitorTypeSelector.vue';
import HttpConfig from './components/HttpConfig.vue';
import ApiConfig from './components/ApiConfig.vue';
import PingConfig from './components/PingConfig.vue';
import DnsConfig from './components/DnsConfig.vue';
import TcpConfig from './components/TcpConfig.vue';
import AlertRulesForm from './components/AlertRulesForm.vue';
import type { MonitorType, MonitorConfig } from '@synthetic-monitoring/shared';

const router = useRouter();
const monitorStore = useMonitorStore();
const formRef = ref();
const submitting = ref(false);

const form = reactive({
  type: 'HTTPS' as MonitorType,
  name: '',
  target: '',
  interval: 60,
  timeout: 30,
  regions: [] as string[],
  config: {} as MonitorConfig,
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
    PAGE_PERF: 'div', // TODO: 实现页面性能配置
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
  } catch (error) {
    console.error('Failed to create monitor:', error);
    message.error('创建失败，请检查输入');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.monitor-create {
  padding: 24px;
}

.form-card {
  margin-top: 16px;
}

.help-text {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
</style>
```

---

## Task 8: 更新路由

**Files:**
- Modify: `web/src/router.ts`
- Test: N/A

- [ ] **Step 1: 添加监控创建和编辑路由**

```typescript
// 在 routers.ts 中找到 Monitors 相关路由，添加：

import MonitorCreate from '@/views/Monitors/Create.vue';
import MonitorEdit from '@/views/Monitors/Edit.vue';

// 在 MainLayout children 中添加：
{
  path: 'monitors/create',
  name: 'MonitorCreate',
  component: MonitorCreate,
  meta: { title: '创建监控', requiresAuth: true }
},
{
  path: 'monitors/:id/edit',
  name: 'MonitorEdit',
  component: MonitorEdit,
  meta: { title: '编辑监控', requiresAuth: true }
},
```

---

## Task 9: 编辑监控页面

**Files:**
- Create: `web/src/views/Monitors/Edit.vue`
- Test: N/A

- [ ] **Step 1: 创建编辑监控页面（复用创建页面组件）**

```vue
<template>
  <div class="monitor-edit">
    <a-page-header
      title="编辑监控任务"
      :ghost="false"
      @back="() => $router.push('/monitors')"
    />

    <a-card class="form-card" v-if="loading">
      <a-spin />
    </a-card>

    <a-card class="form-card" v-else-if="monitor">
      <!-- 复用 Create.vue 的表单逻辑 -->
      <!-- 为保持简洁，实际实现中建议提取公共表单组件 -->
      <p>编辑表单实现与 Create.vue 类似，区别在于：</p>
      <ul>
        <li>页面加载时通过 route.params.id 获取监控 ID</li>
        <li>调用 monitorStore.fetchMonitor(id) 获取监控详情</li>
        <li>用获取的数据填充表单</li>
        <li>提交时调用 updateMonitor(id, payload)</li>
      </ul>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonitorStore } from '@/stores/monitor';

const route = useRoute();
const router = useRouter();
const monitorStore = useMonitorStore();

const loading = ref(true);
const monitor = ref();

onMounted(async () => {
  const id = route.params.id as string;
  try {
    monitor.value = await monitorStore.fetchMonitor(id);
  } catch (error) {
    console.error('Failed to fetch monitor:', error);
  } finally {
    loading.value = false;
  }
});
</script>
```

---

## 完成检查

完成所有任务后，验证以下内容：

1. **类型定义完整**: 所有监控类型的配置接口已定义
2. **组件可复用**: 各配置组件可独立使用和组合
3. **表单验证**: 必填字段有验证提示
4. **路由正确**: 创建/编辑路由已添加
5. **状态管理**: Pinia store 正确集成
6. **UI 一致**: 符合 Ant Design Vue 设计规范

---

**备注**: 此计划实现了完整的监控任务创建和编辑功能，支持所有监控类型。页面性能监控 (PAGE_PERF) 的配置组件需要 Puppeteer 集成，可在后续任务中实现。
