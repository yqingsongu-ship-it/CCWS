<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>DEM 业务体验监控</h1>
          <p>分布式合成监控平台</p>
        </div>

        <a-form :model="form" :rules="rules" ref="formRef" @finish="handleLogin">
          <a-form-item name="email">
            <a-input
              v-model:value="form.email"
              size="large"
              placeholder="请输入邮箱"
            >
              <template #prefix><user-outlined /></template>
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

          <a-form-item>
            <div class="login-options">
              <a-checkbox v-model:checked="form.remember">记住我</a-checkbox>
              <a @click="handleForgotPassword">忘记密码？</a>
            </div>
          </a-form-item>

          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" block :loading="loading">
              登录
            </a-button>
          </a-form-item>

          <div class="login-footer">
            <span>还没有账号？</span>
            <a @click="() => $router.push('/auth/register')">立即注册</a>
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
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const formRef = ref();
const loading = ref(false);
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
  remember: false,
});

const rules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ],
  password: [{ required: true, message: '请输入密码' }],
};

const handleLogin = async () => {
  loading.value = true;
  try {
    const result = await authStore.login({
      email: form.email,
      password: form.password,
      remember: form.remember,
    });

    if (result) {
      message.success('登录成功');
      router.push('/');
    } else {
      message.error(authStore.error || '登录失败');
    }
  } catch (error) {
    message.error('登录失败');
  } finally {
    loading.value = false;
  }
};

const handleForgotPassword = () => {
  router.push('/auth/forgot-password');
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.login-card {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px;
}

.login-header p {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-footer {
  text-align: center;
  color: #666;
}

.login-footer a {
  margin-left: 8px;
}
</style>
