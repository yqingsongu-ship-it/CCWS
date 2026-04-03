<template>
  <div class="forgot-password-page">
    <div class="forgot-password-container">
      <div class="forgot-password-card">
        <div class="forgot-password-header">
          <h1>忘记密码</h1>
          <p>重置您的账户密码</p>
        </div>

        <a-form :model="form" :rules="rules" ref="formRef" @finish="handleSubmit">
          <a-form-item name="email">
            <a-input
              v-model:value="form.email"
              size="large"
              placeholder="请输入注册邮箱"
            >
              <template #prefix><mail-outlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item name="code">
            <a-input
              v-model:value="form.code"
              size="large"
              placeholder="请输入验证码"
              maxlength="6"
            >
              <template #prefix><security-scan-outlined /></template>
            </a-input>
            <a-button class="send-code-btn" @click="handleSendCode" :loading="sendingCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </a-button>
          </a-form-item>

          <a-form-item name="password">
            <a-input-password
              v-model:value="form.password"
              size="large"
              placeholder="请输入新密码"
            >
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" block :loading="loading">
              重置密码
            </a-button>
          </a-form-item>

          <div class="forgot-password-footer">
            <a @click="() => $router.push('/auth/login')">返回登录</a>
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
import { MailOutlined, SecurityScanOutlined, LockOutlined } from '@ant-design/icons-vue';
import type { Rule } from 'ant-design-vue/es/form';

const router = useRouter();
const formRef = ref();
const loading = ref(false);
const sendingCode = ref(false);
const countdown = ref(0);

const form = reactive({
  email: '',
  code: '',
  password: '',
});

const rules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ],
  code: [{ required: true, message: '请输入验证码' }],
  password: [
    { required: true, message: '请输入新密码' },
    { min: 6, message: '密码长度至少 6 位' },
  ],
};

const handleSendCode = async () => {
  if (!form.email) {
    message.warning('请先输入邮箱');
    return;
  }
  sendingCode.value = true;
  try {
    // 验证码发送功能需要后端邮件服务支持
    message.warning('验证码功能需要后端配置邮件服务');
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    message.error('发送失败');
  } finally {
    sendingCode.value = false;
  }
};

const handleSubmit = async () => {
  loading.value = true;
  try {
    // 密码重置功能需要后端 API 支持
    message.warning('密码重置功能需要后端 API 支持');
  } catch (error) {
    message.error('重置失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.forgot-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.forgot-password-container {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.forgot-password-card {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.forgot-password-header {
  text-align: center;
  margin-bottom: 32px;
}

.forgot-password-header h1 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px;
}

.forgot-password-header p {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.send-code-btn {
  position: absolute;
  right: 4px;
  top: 4px;
}

:deep(.ant-form-item-control-input-content) {
  position: relative;
}

.forgot-password-footer {
  text-align: center;
}
</style>
