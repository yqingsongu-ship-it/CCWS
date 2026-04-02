<template>
  <div class="settings-page">
    <a-page-header title="设置" :ghost="false" />

    <a-tabs>
      <a-tab-pane key="profile" tab="个人资料">
        <a-form layout="vertical" style="max-width: 400px">
          <a-form-item label="姓名">
            <a-input placeholder="请输入姓名" />
          </a-form-item>
          <a-form-item label="邮箱">
            <a-input type="email" placeholder="请输入邮箱" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary">保存</a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="notification" tab="通知设置">
        <a-form layout="vertical" style="max-width: 400px">
          <a-form-item label="邮件通知">
            <a-switch />
          </a-form-item>
          <a-form-item label="短信通知">
            <a-switch />
          </a-form-item>
          <a-form-item label="Webhook URL">
            <a-input placeholder="请输入 Webhook URL" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary">保存</a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="api" tab="API 密钥">
        <a-card>
          <p>当前 API 密钥：<code>sk_xxxxxxxxxxxx</code></p>
          <a-button danger>重置密钥</a-button>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
// Settings page
</script>

<style scoped>
.settings-page {
  max-width: 800px;
}

code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
