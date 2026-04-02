<template>
  <div class="alert-rules-form">
    <a-button type="dashed" block @click="addRule" size="small">
      <PlusOutlined /> 添加告警规则
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

          <!-- DOWN 条件 -->
          <a-form-item label="触发条件" v-if="rule.type === 'DOWN'">
            <a-input-number
              v-model:value="rule.condition.threshold"
              :min="1"
              :max="10"
              addon-after="次失败"
            />
            <span class="help-text">连续失败多少次后触发告警</span>
          </a-form-item>

          <!-- RESPONSE_TIME 条件 -->
          <a-form-item label="触发条件" v-if="rule.type === 'RESPONSE_TIME'">
            <a-space>
              <a-select v-model:value="rule.condition.operator" style="width: 100px">
                <a-select-option value=">">&gt;</a-select-option>
                <a-select-option value="<">&lt;</a-select-option>
                <a-select-option value=">=">&ge;</a-select-option>
                <a-select-option value="<=">&le;</a-select-option>
              </a-select>
              <a-input-number
                v-model:value="rule.condition.value"
                :min="0"
                addon-after="ms"
              />
            </a-space>
          </a-form-item>

          <!-- SSL_EXPIRY 条件 -->
          <a-form-item label="触发条件" v-if="rule.type === 'SSL_EXPIRY'">
            <a-input-number
              v-model:value="rule.condition.daysBefore"
              :min="1"
              :max="90"
              addon-after="天"
            />
            <span class="help-text">证书到期前多少天触发告警</span>
          </a-form-item>

          <!-- CHANGE 条件 -->
          <a-form-item label="监控字段" v-if="rule.type === 'CHANGE'">
            <a-select v-model:value="rule.condition.field" style="width: 200px">
              <a-select-option value="body">响应体内容</a-select-option>
              <a-select-option value="statusCode">状态码</a-select-option>
              <a-select-option value="headers">响应头</a-select-option>
            </a-select>
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

          <a-form-item
            label="接收人配置"
            v-if="rule.notificationChannels?.length && rule.type !== 'DOWN'"
          >
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
import { PlusOutlined } from '@ant-design/icons-vue';
import type { AlertRule } from '@synthetic-monitoring/shared';

interface RuleForm extends Omit<AlertRule, 'recipients'> {
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
    recipientsString: 'admin@example.com',
    enabled: true,
  });
};

const removeRule = (index: number) => {
  rules.value.splice(index, 1);
  emitChange();
};

const emitChange = () => {
  const formatted = rules.value.map((r) => ({
    ...r,
    recipients: r.recipientsString?.split('\n').filter(Boolean) || [],
  }));
  emit('update:modelValue', formatted as AlertRule[]);
};

watch(
  rules,
  () => emitChange(),
  { deep: true }
);
</script>

<style scoped>
.alert-rules-form {
  width: 100%;
}

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
