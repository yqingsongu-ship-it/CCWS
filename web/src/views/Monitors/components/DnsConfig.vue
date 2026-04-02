<template>
  <a-form layout="vertical">
    <a-form-item label="记录类型">
      <a-select v-model:value="localConfig.recordType" @change="emitChange" style="width: 250px">
        <a-select-option value="A">A 记录 (IPv4 地址)</a-select-option>
        <a-select-option value="AAAA">AAAA 记录 (IPv6 地址)</a-select-option>
        <a-select-option value="CNAME">CNAME 记录 (别名)</a-select-option>
        <a-select-option value="MX">MX 记录 (邮件交换)</a-select-option>
        <a-select-option value="NS">NS 记录 (域名服务器)</a-select-option>
        <a-select-option value="TXT">TXT 记录 (文本记录)</a-select-option>
        <a-select-option value="SOA">SOA 记录 (起始授权)</a-select-option>
      </a-select>
    </a-form-item>

    <a-form-item label="期望 IP 地址">
      <a-input
        v-model:value="localConfig.expectedIP"
        @change="emitChange"
        placeholder="例如：1.2.3.4"
        style="width: 250px"
      />
      <span class="help-text">期望解析到的 IP 地址，可选</span>
    </a-form-item>

    <a-form-item label="DNS 服务器">
      <a-input
        v-model:value="localConfig.nameserver"
        @change="emitChange"
        placeholder="例如：8.8.8.8"
        style="width: 250px"
      />
      <span class="help-text">指定 DNS 服务器，不填使用默认</span>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { DNSMonitorConfig } from '@synthetic-monitoring/shared';

const props = defineProps<{
  modelValue?: DNSMonitorConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DNSMonitorConfig];
}>();

const localConfig = reactive<DNSMonitorConfig>({
  recordType: props.modelValue?.recordType || 'A',
  expectedIP: props.modelValue?.expectedIP || '',
  nameserver: props.modelValue?.nameserver || '',
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

<style scoped>
.help-text {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
</style>
