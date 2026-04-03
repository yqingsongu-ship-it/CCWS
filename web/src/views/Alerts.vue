<template>
  <div class="alerts-page">
    <a-page-header title="告警管理" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData">
            <reload-outlined />
            刷新
          </a-button>
          <a-button @click="showRuleModal">
            <plus-outlined />
            新建告警规则
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="mb-card">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="总告警数" :value="alertStore.stats.total" suffix="条">
            <template #prefix><bell-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="未确认" :value="alertStore.stats.unacknowledged" valueStyle="color: #ff4d4f">
            <template #prefix><exclamation-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="已确认" :value="alertStore.stats.acknowledged" valueStyle="color: #52c41a">
            <template #prefix><check-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="严重告警" :value="alertStore.stats.critical" valueStyle="color: #faad14">
            <template #prefix><warning-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 告警列表 -->
    <a-card title="最近告警" class="mb-card" :bordered="false">
      <a-empty v-if="alertStore.alerts.length === 0" description="暂无告警" />
      <a-list v-else :data-source="alertStore.alerts" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-alert
              :message="item.taskName"
              :description="item.message"
              :type="getAlertType(item.severity)"
              :show-icon="true"
              class="alert-item"
            >
              <template #action>
                <a-space>
                  <span class="time-text">{{ formatTime(item.timestamp) }}</span>
                  <a-badge :status="getSeverityStatus(item.severity)" :text="item.severity" />
                  <a-button
                    size="small"
                    :type="item.acknowledged ? 'default' : 'primary'"
                    @click="handleAcknowledge(item)"
                  >
                    {{ item.acknowledged ? '已确认' : '确认' }}
                  </a-button>
                </a-space>
              </template>
            </a-alert>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <!-- 告警规则列表 -->
    <a-card title="告警规则" :bordered="false">
      <a-empty v-if="alertStore.alertRules.length === 0" description="暂无告警规则" />
      <a-table
        v-else
        :columns="ruleColumns"
        :data-source="alertStore.alertRules"
        :pagination="false"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'condition'">
            <a-tag :color="getConditionColor(record.condition.type)">{{ record.condition.type }}</a-tag>
          </template>
          <template v-if="column.key === 'channels'">
            <a-space>
              <a-tag v-for="channel in record.channels" :key="channel" color="blue">{{ channel }}</a-tag>
            </a-space>
          </template>
          <template v-if="column.key === 'enabled'">
            <a-switch
              :checked="record.enabled"
              @change="handleToggleRule(record)"
            />
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" danger @click="handleDeleteRule(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 创建告警规则弹窗 -->
    <a-modal
      v-model:open="ruleModalVisible"
      title="新建告警规则"
      @ok="handleRuleModalOk"
      @cancel="ruleModalVisible = false"
      width="600px"
    >
      <a-form :model="ruleForm" layout="vertical">
        <a-form-item label="规则名称" required>
          <a-input v-model:value="ruleForm.name" placeholder="请输入规则名称" />
        </a-form-item>
        <a-form-item label="告警条件类型" required>
          <a-select v-model:value="ruleForm.condition.type" placeholder="请选择条件类型">
            <a-select-option value="DOWN">服务宕机</a-select-option>
            <a-select-option value="RESPONSE_TIME">响应时间过长</a-select-option>
            <a-select-option value="SSL_EXPIRY">SSL 证书即将过期</a-select-option>
            <a-select-option value="CHANGE">配置变更</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="触发阈值" v-if="ruleForm.condition.type !== 'CHANGE'">
          <a-input-number v-model:value="ruleForm.condition.threshold" :min="1" />
          <span class="form-tip">连续多少次检测失败后触发</span>
        </a-form-item>
        <a-form-item label="通知渠道" required>
          <a-select v-model:value="ruleForm.channels" mode="multiple" placeholder="请选择通知方式">
            <a-select-option value="EMAIL">邮件</a-select-option>
            <a-select-option value="WEBHOOK">Webhook</a-select-option>
            <a-select-option value="URL">URL 回调</a-select-option>
            <a-select-option value="DINGTALK">钉钉</a-select-option>
            <a-select-option value="WECHAT">企业微信</a-select-option>
            <a-select-option value="SLACK">Slack</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="通知接收人">
          <a-textarea
            v-model:value="ruleForm.recipientsString"
            placeholder="请输入接收人，多个请用逗号分隔"
            :rows="3"
          />
          <span class="form-tip">可以是邮箱地址或 Webhook URL</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import type { AlertEvent, AlertRule } from '@synthetic-monitoring/shared';
import { useAlertStore } from '../stores/alert';

const alertStore = useAlertStore();

const ruleColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  { title: '条件类型', dataIndex: 'condition', key: 'condition' },
  { title: '通知渠道', dataIndex: 'channels', key: 'channels' },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'action', width: 100 },
];

const ruleModalVisible = ref(false);
const ruleForm = reactive<Partial<AlertRule> & { recipientsString: string }>({
  name: '',
  condition: { type: 'DOWN', threshold: 3 },
  channels: [],
  recipientsString: '',
  enabled: true,
});

const fetchData = async () => {
  try {
    await alertStore.fetchAlerts();
    await alertStore.fetchAlertRules();
  } catch (error: any) {
    console.error('Fetch alerts failed:', error);
    message.error('加载告警数据失败：' + (error?.message || '未知错误'));
  }
};

const showRuleModal = () => {
  ruleModalVisible.value = true;
  Object.assign(ruleForm, {
    name: '',
    condition: { type: 'DOWN', threshold: 3 },
    channels: [],
    recipientsString: '',
    enabled: true,
  });
};

const getAlertType = (severity: AlertEvent['severity']) => {
  const map = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'error',
  };
  return map[severity] || 'info';
};

const getSeverityStatus = (severity: AlertEvent['severity']) => {
  const map: Record<AlertEvent['severity'], 'success' | 'warning' | 'error'> = {
    INFO: 'success',
    WARNING: 'warning',
    CRITICAL: 'error',
  };
  return map[severity] || 'success';
};

const getConditionColor = (type: string) => {
  const map: Record<string, string> = {
    DOWN: 'red',
    RESPONSE_TIME: 'orange',
    SSL_EXPIRY: 'purple',
    CHANGE: 'blue',
  };
  return map[type] || 'default';
};

const handleAcknowledge = async (alert: AlertEvent) => {
  try {
    await alertStore.acknowledgeAlert(alert.id);
    message.success('操作成功');
  } catch (error) {
    message.error('操作失败');
  }
};

const handleToggleRule = async (rule: AlertRule) => {
  try {
    await alertStore.toggleAlertRule(rule.id);
    rule.enabled = !rule.enabled;
    message.success('操作成功');
  } catch (error: any) {
    message.error(error.message || '操作失败');
  }
};

const handleDeleteRule = (rule: AlertRule) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除告警规则 "${rule.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await alertStore.deleteAlertRule(rule.id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
};

const handleRuleModalOk = async () => {
  try {
    const recipients = ruleForm.recipientsString
      .split(/[,,\n]/)
      .map(r => r.trim())
      .filter(r => r);

    // 将通知渠道转换为大写枚举值
    const channels = (ruleForm.channels || []).map(c => c.toUpperCase());

    const payload = {
      name: ruleForm.name,
      type: ruleForm.condition.type,
      condition: ruleForm.condition,
      notificationChannels: channels,
      channels, // 也保留 channels 字段以兼容
      recipients,
      enabled: true,
    };

    await alertStore.createAlertRule(payload);
    message.success('创建成功');
    ruleModalVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('Create alert rule error:', error);
    message.error('创建失败：' + (error?.message || '未知错误'));
  }
};

const formatTime = (time?: Date | string) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.alerts-page {
  padding: 24px;
}

.mb-card {
  margin-bottom: 16px;
}

.alert-item {
  width: 100%;
}

.time-text {
  color: #999;
  font-size: 12px;
}

.form-tip {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
</style>
