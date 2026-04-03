<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h1>注册账号</h1>
          <p>创建您的 DEM 监控账号</p>
        </div>

        <a-form :model="form" :rules="rules" ref="formRef" @finish="handleRegister">
          <a-form-item name="name">
            <a-input
              v-model:value="form.name"
              size="large"
              placeholder="请输入姓名"
            >
              <template #prefix><user-outlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item name="email">
            <a-input
              v-model:value="form.email"
              size="large"
              placeholder="请输入邮箱"
            >
              <template #prefix><mail-outlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item name="password">
            <a-input-password
              v-model:value="form.password"
              size="large"
              placeholder="请输入密码"
            >
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item name="confirmPassword">
            <a-input-password
              v-model:value="form.confirmPassword"
              size="large"
              placeholder="请确认密码"
            >
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" block :loading="loading">
              注册
            </a-button>
          </a-form-item>

          <div class="register-footer">
            <span>已有账号？</span>
            <a @click="() => $router.push('/auth/login')">立即登录</a>
          </div>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const formRef = ref();
const loading = ref(false);

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (!value) {
    throw new Error('请确认密码');
  }
  if (value !== form.password) {
    throw new Error('两次输入的密码不一致');
  }
};

const rules: Record<string, Rule[]> = {
  name: [{ required: true, message: '请输入姓名' }],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度至少 6 位' },
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword }],
};

const handleRegister = async () => {
  loading.value = true;
  try {
    const result = await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    if (result) {
      message.success('注册成功，请登录');
      router.push('/auth/login');
    } else {
      message.error(authStore.error || '注册失败');
    }
  } catch (error: any) {
    message.error(error.message || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.register-container {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.register-card {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h1 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px;
}

.register-header p {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.register-footer {
  text-align: center;
  color: #666;
}

.register-footer a {
  margin-left: 8px;
}
</style>
