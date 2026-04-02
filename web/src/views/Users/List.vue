<template>
  <div class="users-page">
    <a-page-header title="用户管理" :ghost="false">
      <template #extra>
        <a-space>
          <a-button @click="fetchData"><reload-outlined />刷新</a-button>
          <a-button type="primary" @click="showCreateModal"><plus-outlined />新建用户</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card :bordered="false">
      <a-form layout="inline" :model="filterForm" class="mb-4">
        <a-form-item label="搜索">
          <a-input v-model:value="filterForm.search" placeholder="输入用户名或邮箱" style="width: 200px" @pressEnter="fetchData" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="filterForm.role" placeholder="全部角色" allowClear style="width: 150px">
            <a-select-option value="ADMIN">管理员</a-select-option>
            <a-select-option value="USER">普通用户</a-select-option>
            <a-select-option value="VIEWER">观察者</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="filterForm.status" placeholder="全部状态" allowClear style="width: 120px">
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="inactive">禁用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space><a-button type="primary" @click="fetchData">查询</a-button><a-button @click="resetFilter">重置</a-button></a-space>
        </a-form-item>
      </a-form>

      <a-table :columns="columns" :data-source="users" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-space>
              <a-avatar :size="small">{{ record.name[0] }}</a-avatar>
              <span>{{ record.name }}</span>
            </a-space>
          </template>
          <template v-if="column.key === 'role'">
            <a-tag :color="getRoleColor(record.role)">{{ getRoleLabel(record.role) }}</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge :status="record.status === 'active' ? 'success' : 'default'" :text="record.status === 'active' ? '启用' : '禁用'" />
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="editUser(record)">编辑</a-button>
              <a-popconfirm title="确定要禁用此用户吗？" @confirm="toggleUserStatus(record)" okText="确认" cancelText="取消">
                <a-button size="small" danger>{{ record.status === 'active' ? '禁用' : '启用' }}</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const users = ref<User[]>([]);
const loading = ref(false);

const filterForm = reactive({ search: '', role: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` });

const columns = [
  { title: '用户', key: 'name', width: 200 },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', key: 'role', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' as const },
];

const fetchData = async () => {
  loading.value = true;
  try {
    // TODO: 调用 API 获取用户列表
    users.value = generateMockUsers();
  } catch (error: any) {
    message.error('加载失败：' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const generateMockUsers = (): User[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `u-${i}`,
    name: `用户${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 3 === 0 ? 'ADMIN' : i % 3 === 1 ? 'USER' : 'VIEWER',
    status: i < 8 ? 'active' : 'inactive',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
};

const handleTableChange = (pag: any) => { pagination.current = pag.current; pagination.pageSize = pag.pageSize; };
const resetFilter = () => { filterForm.search = ''; filterForm.role = ''; filterForm.status = ''; fetchData(); };
const showCreateModal = () => { message.info('创建用户功能开发中...'); };
const editUser = (record: User) => { message.info('编辑用户功能开发中...'); };
const toggleUserStatus = (record: User) => { message.success('操作成功'); fetchData(); };

const getRoleColor = (role: string) => { const colors: Record<string, string> = { ADMIN: 'red', USER: 'blue', VIEWER: 'green' }; return colors[role] || 'default'; };
const getRoleLabel = (role: string) => { const labels: Record<string, string> = { ADMIN: '管理员', USER: '普通用户', VIEWER: '观察者' }; return labels[role] || role; };

onMounted(() => { fetchData(); });
</script>

<style scoped>
.users-page { padding: 24px; }
.mb-4 { margin-bottom: 16px; }
</style>
