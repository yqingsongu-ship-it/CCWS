<template>
  <div class="department-page">
    <a-page-header
      title="部门管理"
      :ghost="false"
      @back="() => $router.push('/users')"
    >
      <template #extra>
        <a-button type="primary" @click="showCreateModal">
          <plus-outlined />
          新建部门
        </a-button>
      </template>
    </a-page-header>

    <a-card :bordered="false">
      <a-table :columns="columns" :data-source="departments" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span :style="{ marginLeft: record.level * 24 + 'px' }">
              <template v-if="record.level > 0">└─ </template>
              {{ record.name }}
            </span>
          </template>
          <template v-if="column.key === 'userCount'">
            <a-tag color="blue">{{ record.userCount }} 人</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑部门' : '新建部门'"
      @ok="handleModalOk"
      @cancel="modalVisible = false"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="部门名称" required>
          <a-input v-model:value="form.name" placeholder="请输入部门名称" />
        </a-form-item>
        <a-form-item label="上级部门">
          <a-tree-select
            v-model:value="form.parentId"
            :tree-data="departmentTree"
            placeholder="请选择上级部门"
            allow-clear
            tree-default-expand-all
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';

const departments = ref<any[]>([]);

const columns = [
  { title: '部门名称', key: 'name', dataIndex: 'name', width: 300 },
  { title: '用户数', key: 'userCount', dataIndex: ['_count', 'users'], width: 100 },
  { title: '操作', key: 'action', width: 150 },
];

const fetchDepartments = async () => {
  try {
    const response = await fetch('/api/users/departments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    });
    const result = await response.json();
    if (result.success) {
      departments.value = result.data;
    }
  } catch (error: any) {
    console.error('Failed to fetch departments:', error);
  }
};

const departmentTree = computed(() => {
  return departments.value.filter((d: any) => !d.parentId).map((root: any) => ({
    ...root,
    title: root.name,
    value: root.id,
    children: departments.value.filter((d: any) => d.parentId === root.id).map((child: any) => ({
      ...child,
      title: child.name,
      value: child.id,
    })),
  }));
});

const modalVisible = ref(false);
const editingId = ref<string | null>(null);
const modalForm = reactive({
  name: '',
  parentId: '',
  path: '',
});

const showCreateModal = () => {
  modalVisible.value = true;
  editingId.value = null;
  modalForm.name = '';
  modalForm.parentId = '';
  modalForm.path = '';
};

const handleEdit = (record: any) => {
  editingId.value = record.id;
  modalForm.name = record.name;
  modalForm.parentId = record.parentId;
  modalForm.path = record.path;
  modalVisible.value = true;
};

const handleDelete = (record: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除部门 "${record.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        const response = await fetch(`/api/users/departments/${record.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const result = await response.json();
        if (result.success) {
          departments.value = departments.value.filter(d => d.id !== record.id);
          message.success('删除成功');
        }
      } catch (error: any) {
        message.error('删除失败：' + (error.message || '未知错误'));
      }
    },
  });
};

const handleModalOk = async () => {
  try {
    const payload = {
      id: editingId.value || undefined,
      name: modalForm.name,
      parentId: modalForm.parentId || undefined,
      path: modalForm.path || undefined,
    };

    const response = await fetch('/api/users/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.success) {
      modalVisible.value = false;
      message.success(editingId.value ? '更新成功' : '创建成功');
      fetchDepartments();
    }
  } catch (error: any) {
    message.error('操作失败：' + (error.message || '未知错误'));
  }
};

onMounted(() => {
  fetchDepartments();
});
</script>

<style scoped>
.department-page {
  padding: 24px;
}
</style>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
