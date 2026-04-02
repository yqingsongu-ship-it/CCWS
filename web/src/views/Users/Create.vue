<template>
  <div class="user-create-page">
    <a-page-header
      title="新建用户"
      :ghost="false"
      @back="() => $router.push('/users')"
    />

    <a-card :bordered="false">
      <a-form
        :model="form"
        layout="vertical"
        :rules="rules"
        ref="formRef"
        style="max-width: 600px"
      >
        <a-form-item label="用户名" name="name">
          <a-input v-model:value="form.name" placeholder="请输入用户名" />
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="form.email" type="email" placeholder="请输入邮箱" />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="form.password" placeholder="请输入密码" />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="form.confirmPassword" placeholder="请确认密码" />
        </a-form-item>

        <a-form-item label="角色" name="role">
          <a-select v-model:value="form.role" placeholder="请选择角色">
            <a-select-option value="SUPER_ADMIN">超级管理员</a-select-option>
            <a-select-option value="ADMIN">管理员</a-select-option>
            <a-select-option value="MANAGER">部门经理</a-select-option>
            <a-select-option value="USER">普通用户</a-select-option>
            <a-select-option value="VIEWER">只读用户</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="部门" name="departmentId">
          <a-select v-model:value="form.departmentId" placeholder="请选择部门" allow-clear>
            <a-select-option value="1">技术部</a-select-option>
            <a-select-option value="2">产品部</a-select-option>
            <a-select-option value="3">运营部</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="监控配额" name="quota">
          <a-input-number v-model:value="form.quota" :min="0" :max="1000" suffix="个" />
        </a-form-item>

        <a-form-item label="状态" name="enabled">
          <a-radio-group v-model:value="form.enabled">
            <a-radio :value="true">启用</a-radio>
            <a-radio :value="false">禁用</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSubmit">提交</a-button>
            <a-button @click="() => $router.push('/users')">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import type { UserRole } from '@synthetic-monitoring/shared';

const router = useRouter();
const formRef = ref();

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'USER' as UserRole,
  departmentId: '',
  quota: 10,
  enabled: true,
});

const validatePassword = async (_rule: Rule, value: string) => {
  if (!value) {
    throw new Error('请输入密码');
  }
  if (value.length < 6) {
    throw new Error('密码长度至少 6 位');
  }
};

const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (!value) {
    throw new Error('请确认密码');
  }
  if (value !== form.password) {
    throw new Error('两次输入的密码不一致');
  }
};

const rules: Record<string, Rule[]> = {
  name: [{ required: true, message: '请输入用户名' }],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ],
  password: [{ required: true, validator: validatePassword }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword }],
  role: [{ required: true, message: '请选择角色' }],
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    // TODO: Call API to create user
    message.success('创建成功');
    router.push('/users');
  } catch (error) {
    message.error('请检查表单填写');
  }
};
</script>

<style scoped>
.user-create-page {
  padding: 24px;
}
</style>
