<template>
  <div class="role-page">
    <a-page-header
      title="角色管理"
      :ghost="false"
      @back="() => $router.push('/users')"
    />

    <a-card :bordered="false">
      <a-table :columns="columns" :data-source="roles" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'permissions'">
            <a-space wrap>
              <a-tag v-for="perm in record.permissions" :key="perm">{{ perm }}</a-tag>
            </a-space>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button size="small" danger :disabled="record.builtin">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

const roles = ref([
  { id: '1', name: 'SUPER_ADMIN', displayName: '超级管理员', description: '系统最高权限管理员', builtin: true, permissions: ['全部权限'] },
  { id: '2', name: 'ADMIN', displayName: '管理员', description: '普通管理员', builtin: true, permissions: ['monitor:*', 'alert:*', 'report:view'] },
  { id: '3', name: 'MANAGER', displayName: '部门经理', description: '部门主管', builtin: true, permissions: ['monitor:*', 'alert:*', 'report:view'] },
  { id: '4', name: 'USER', displayName: '普通用户', description: '普通用户', builtin: true, permissions: ['monitor:view', 'alert:view', 'report:view'] },
  { id: '5', name: 'VIEWER', displayName: '只读用户', description: '只读权限', builtin: true, permissions: ['monitor:view', 'report:view'] },
]);

const columns = [
  { title: '角色名称', dataIndex: 'displayName', key: 'displayName', width: 150 },
  { title: '角色标识', dataIndex: 'name', key: 'name', width: 150 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '权限', key: 'permissions' },
  { title: '操作', key: 'action', width: 150 },
];

const handleEdit = (record: any) => {
  message.info('编辑角色（待实现）');
};
</script>

<style scoped>
.role-page {
  padding: 24px;
}
</style>
