import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AlertEvent, AlertRule } from '@synthetic-monitoring/shared';
import { useAuthStore } from './auth';

const API_BASE = '/api';

export const useAlertStore = defineStore('alert', () => {
  const alerts = ref<AlertEvent[]>([]);
  const alertRules = ref<AlertRule[]>([]);
  const loading = ref(false);
  const stats = ref({
    total: 0,
    acknowledged: 0,
    unacknowledged: 0,
    critical: 0,
  });

  // Get auth header from auth store
  const authStore = useAuthStore();
  const getAuthHeader = computed(() => authStore.getAuthHeader());

  // 获取所有告警
  async function fetchAlerts(page = 1, pageSize = 20, filters?: Record<string, string>) {
    loading.value = true;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters,
      });
      const response = await fetch(`${API_BASE}/alerts?${params}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        alerts.value = result.data.items || [];
        stats.value.total = result.data.total;
        updateStats();
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch alerts');
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 获取告警规则
  async function fetchAlertRules(monitorId?: string) {
    try {
      const url = monitorId
        ? `${API_BASE}/alerts/monitors/${monitorId}/rules`
        : `${API_BASE}/alerts/rules`;
      const response = await fetch(url, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        // 将后端返回的数据转换为前端类型
        alertRules.value = (result.data || []).map((rule: any) => ({
          ...rule,
          // 将 notificationChannels 转换为 channels
          channels: rule.notificationChannels || rule.channels || [],
          // 解析 JSON 字段
          condition: parseJSONField(rule.condition),
          recipients: parseJSONField(rule.recipients),
        }));
      }
      return result.data;
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
      return [];
    }
  }

  // 解析 JSON 字段
  function parseJSONField(field: any): any {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    }
    return field;
  }

  // 确认告警
  async function acknowledgeAlert(id: string) {
    try {
      const response = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        const index = alerts.value.findIndex(a => a.id === id);
        if (index !== -1) {
          alerts.value[index].acknowledged = true;
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '确认失败');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  // 创建告警规则（全局规则，不需要 monitorId）
  async function createAlertRule(rule: Partial<AlertRule> & { monitorId?: string }) {
    try {
      // 如果有 monitorId，使用监控特定的端点
      const url = rule.monitorId
        ? `${API_BASE}/alerts/monitors/${rule.monitorId}/rules`
        : `${API_BASE}/alerts/rules`;

      // 将小写渠道转换为大写枚举值（支持 channels 或 notificationChannels 字段）
      const channelsInput = rule.notificationChannels || rule.channels || [];
      const channels = (channelsInput as string[]).map(c => c.toUpperCase());

      const payload = {
        name: rule.name,
        type: (rule.condition as any)?.type || 'DOWN',
        condition: rule.condition || { type: 'DOWN', threshold: 3 },
        notificationChannels: channels,
        recipients: rule.recipients || [],
        enabled: rule.enabled !== false,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        alertRules.value.push(result.data);
        return result.data;
      }
      throw new Error(result.error || '创建失败');
    } catch (error) {
      console.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  // 删除告警规则
  async function deleteAlertRule(id: string) {
    try {
      const response = await fetch(`${API_BASE}/alerts/rules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        alertRules.value = alertRules.value.filter(r => r.id !== id);
        return true;
      }
      throw new Error(result.error || '删除失败');
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      throw error;
    }
  }

  // 更新统计数据
  function updateStats() {
    stats.value.total = alerts.value.length;
    stats.value.acknowledged = alerts.value.filter(a => a.acknowledged).length;
    stats.value.unacknowledged = alerts.value.filter(a => !a.acknowledged).length;
    stats.value.critical = alerts.value.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length;
  }

  return {
    alerts,
    alertRules,
    loading,
    stats,
    fetchAlerts,
    fetchAlertRules,
    acknowledgeAlert,
    createAlertRule,
    deleteAlertRule,
  };
});
