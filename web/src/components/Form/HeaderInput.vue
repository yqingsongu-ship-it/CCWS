<template>
  <div class="header-input">
    <a-form layout="inline">
      <a-button type="dashed" block @click="addHeader" size="small">
        <PlusOutlined /> 添加请求头
      </a-button>
    </a-form>

    <div v-for="(header, index) in headers" :key="index" class="header-row">
      <a-space>
        <a-input
          v-model:value="header.key"
          placeholder="Header Name"
          style="width: 200px"
          @change="emitChange"
        />
        <a-input
          v-model:value="header.value"
          placeholder="Header Value"
          style="width: 250px"
          @change="emitChange"
        />
        <a-button type="text" danger @click="removeHeader(index)">
          <MinusOutlined />
        </a-button>
      </a-space>
    </div>
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
    } else {
      headers.value = [];
    }
  },
  { immediate: true }
);

// 同步回父组件
const emitChange = () => {
  const obj = headers.value.reduce<Record<string, string>>((acc, h) => {
    if (h.key) acc[h.key] = h.value;
    return acc;
  }, {});
  emit('update:modelValue', obj);
};

const addHeader = () => {
  headers.value.push({ key: '', value: '' });
  emitChange();
};

const removeHeader = (index: number) => {
  headers.value.splice(index, 1);
  emitChange();
};
</script>

<style scoped>
.header-input {
  width: 100%;
}

.header-row {
  margin-top: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
