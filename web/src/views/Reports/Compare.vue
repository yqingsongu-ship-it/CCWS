<template>
  <div class="compare-report-page">
    <a-page-header title="项目对比" :ghost="false" @back="() => $router.push('/reports')">
      <template #extra>
        <a-space>
          <a-button @click="exportReport"><download-outlined />导出 PDF</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card class="mt-4" :bordered="false">
      <a-form layout="inline" :model="filterForm">
        <a-form-item label="选择项目">
          <a-select v-model:value="filterForm.projects" mode="multiple" placeholder="选择要对比的项目" style="width: 300px">
            <a-select-option value="p1">项目 A</a-select-option>
            <a-select-option value="p2">项目 B</a-select-option>
            <a-select-option value="p3">项目 C</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="compareProjects">对比</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="对比结果" class="mt-4" :bordered="false" v-if="compareData.length > 0">
      <a-table :columns="columns" :data-source="compareData" :pagination="false" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'uptime'">
            <a-progress :percent="record.uptime" :strokeColor="getUptimeColor(record.uptime)" :showInfo="false" size="small" />
            <span :style="{ color: getUptimeColor(record.uptime) }">{{ record.uptime.toFixed(2) }}%</span>
          </template>
          <template v-if="column.key === 'responseTime'">{{ record.responseTime }}ms</template>
          <template v-if="column.key === 'alerts'">
            <a-tag :color="record.alerts > 10 ? 'red' : record.alerts > 5 ? 'orange' : 'green'">{{ record.alerts }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';

const filterForm = reactive({ projects: [] as string[] });
const compareData = ref<any[]>([]);

const columns = [
  { title: '项目', dataIndex: 'name', key: 'name' },
  { title: '监控任务数', dataIndex: 'monitors', key: 'monitors', width: 120 },
  { title: '可用性', key: 'uptime', width: 180 },
  { title: '平均响应时间', key: 'responseTime', width: 140 },
  { title: '告警数', key: 'alerts', width: 100 },
];

const getUptimeColor = (uptime: number) => { if (uptime >= 99.9) return '#52c41a'; if (uptime >= 99) return '#faad14'; return '#ff4d4f'; };
const exportReport = () => { message.info('导出 PDF 功能开发中...'); };

const compareProjects = () => {
  compareData.value = [
    { name: '项目 A', monitors: 15, uptime: 99.95, responseTime: 120, alerts: 3 },
    { name: '项目 B', monitors: 20, uptime: 99.85, responseTime: 180, alerts: 8 },
    { name: '项目 C', monitors: 10, uptime: 99.92, responseTime: 95, alerts: 2 },
  ];
};
</script>

<style scoped>
.compare-report-page { padding: 24px; }
.mt-4 { margin-top: 16px; }
</style>
