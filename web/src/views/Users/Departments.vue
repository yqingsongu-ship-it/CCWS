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

const departments = ref([
  { id: '1', name: '总部', parentId: null, level: 0, userCount: 5 },
  { id: '2', name: '技术部', parentId: '1', level: 1, userCount: 3 },
  { id: '3', name: '产品部', parentId: '1', level: 1, userCount: 2 },
  { id: '4', name: '运营部', parentId: '1', level: 1, userCount: 0 },
  { id: '5', name: '前端组', parentId: '2', level: 2, userCount: 1 },
  { id: '6', name: '后端组', parentId: '2', level: 2, userCount: 2 },
]);

const columns = [
  { title: '部门名称', key: 'name', width: 300 },
  { title: '用户数', key: 'userCount', width: 100 },
  { title: '操作', key: 'action', width: 150 },
];

const departmentTree = computed(() => {
  return departments.value.filter(d => !d.parentId).map(root => ({
    ...root,
    title: root.name,
    value: root.id,
    children: departments.value.filter(d => d.parentId === root.id).map(child => ({
      ...child,
      title: child.name,
      value: child.id,
    })),
  }));
});

const modalVisible = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: '',
  parentId: '',
});

const showCreateModal = () => {
  modalVisible.value = true;
  editingId.value = null;
  form.name = '';
  form.parentId = '';
};

const handleEdit = (record: any) => {
  editingId.value = record.id;
  form.name = record.name;
  form.parentId = record.parentId;
  modalVisible.value = true;
};

const handleDelete = (record: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除部门 "${record.name}" 吗？`,
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => {
      message.success('删除成功');
    },
  });
};

const handleModalOk = () => {
  // TODO: Create or update department
  modalVisible.value = false;
  message.success(editingId.value ? '更新成功' : '创建成功');
};
</script>

<style scoped>
.department-page {
  padding: 24px;
}
</style>
