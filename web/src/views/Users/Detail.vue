<template>
  <div class="user-detail-page">
    <a-page-header title="用户详情" :ghost="false" @back="() => $router.push('/users')">
      <template #extra>
        <a-space>
          <a-button @click="editUser">编辑</a-button>
          <a-button danger @click="deleteUser">删除</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-row :gutter="16" class="mt-4">
      <a-col :span="8">
        <a-card title="基本信息" :bordered="false">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="用户名">{{ user.name }}</a-descriptions-item>
            <a-descriptions-item label="邮箱">{{ user.email }}</a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag :color="getRoleColor(user.role)">{{ getRoleLabel(user.role) }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-badge :status="user.status === 'active' ? 'success' : 'default'" :text="user.status === 'active' ? '启用' : '禁用'" />
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatTime(user.createdAt) }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="配额信息" :bordered="false">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="监控任务">{{ user.quota?.monitors || 0 }}/{{ user.quota?.maxMonitors || 100 }}</a-descriptions-item>
            <a-descriptions-item label="检查频率">最快 {{ user.quota?.minInterval || 60 }}秒</a-descriptions-item>
            <a-descriptions-item label="探针数量">{{ user.quota?.probes || 0 }}/{{ user.quota?.maxProbes || 10 }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="统计信息" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="监控任务" :value="stats.monitors" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="告警数" :value="stats.alerts" :valueStyle="{ color: '#ff4d4f' }" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message, Modal } from 'ant-design-vue';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  quota?: { monitors: number; maxMonitors: number; minInterval: number; probes: number; maxProbes: number };
}

const user = ref<User>({ id: 'u-1', name: '张三', email: 'zhangsan@example.com', role: 'ADMIN', status: 'active', createdAt: new Date().toISOString(), quota: { monitors: 25, maxMonitors: 100, minInterval: 60, probes: 3, maxProbes: 10 } });
const stats = ref({ monitors: 25, alerts: 12 });

const getRoleColor = (role: string) => { const colors: Record<string, string> = { ADMIN: 'red', USER: 'blue', VIEWER: 'green' }; return colors[role] || 'default'; };
const getRoleLabel = (role: string) => { const labels: Record<string, string> = { ADMIN: '管理员', USER: '普通用户', VIEWER: '观察者' }; return labels[role] || role; };
const formatTime = (time?: string) => { if (!time) return '-'; return new Date(time).toLocaleString('zh-CN'); };

const editUser = () => { message.info('编辑用户功能开发中...'); };
const deleteUser = () => { Modal.confirm({ title: '确认删除', content: '确定要删除此用户吗？', okText: '确认', cancelText: '取消', okType: 'danger', onOk: () => { message.success('删除成功'); } }); };
</script>

<style scoped>
.user-detail-page { padding: 24px; }
.mt-4 { margin-top: 16px; }
</style>
