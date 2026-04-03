import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MonitorTask, MonitorStatus, CheckResult } from '@synthetic-monitoring/shared';
import { useAuthStore } from './auth';

const API_BASE = '/api';

export const useMonitorStore = defineStore('monitor', () => {
  const monitors = ref<MonitorTask[]>([]);
  const loading = ref(false);
  const stats = ref({
    total: 0,
    active: 0,
    paused: 0,
    error: 0,
  });

  // Get auth header from auth store
  const authStore = useAuthStore();
  const getAuthHeader = computed(() => authStore.getAuthHeader());

  // 获取所有监控任务
  async function fetchMonitors(page = 1, pageSize = 10, filters?: Record<string, string>) {
    loading.value = true;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters,
      });
      const response = await fetch(`${API_BASE}/monitors?${params}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        monitors.value = (result.data.items || []).map((m: any) => ({
          ...m,
          config: parseJSONField(m.config),
          tags: parseJSONField(m.tags),
          latestResult: m.latestResult ? {
            ...m.latestResult,
            responseTime: m.latestResult.responseTime || null,
          } : null,
        }));
        stats.value.total = result.data.total;
        updateStats();
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch monitors');
    } catch (error) {
      console.error('Failed to fetch monitors:', error);
      throw error;
    } finally {
      loading.value = false;
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

  // 创建监控任务
  async function createMonitor(task: Partial<MonitorTask>) {
    try {
      const response = await fetch(`${API_BASE}/monitors`, {
        method: 'POST',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      const result = await response.json();
      if (result.success) {
        // 确保 status 字段正确设置
        const newMonitor = {
          ...result.data,
          status: result.data.enabled !== false ? 'ACTIVE' : 'PAUSED',
          config: parseJSONField(result.data.config),
          tags: parseJSONField(result.data.tags),
        };
        monitors.value.push(newMonitor);
        updateStats();
        return newMonitor;
      }
      throw new Error(result.error || '创建失败');
    } catch (error) {
      console.error('Failed to create monitor:', error);
      throw error;
    }
  }

  // 更新监控任务
  async function updateMonitor(id: string, updates: Partial<MonitorTask>) {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        const index = monitors.value.findIndex(m => m.id === id);
        if (index !== -1) {
          monitors.value[index] = {
            ...result.data,
            config: parseJSONField(result.data.config),
            tags: parseJSONField(result.data.tags),
          };
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '更新失败');
    } catch (error) {
      console.error('Failed to update monitor:', error);
      throw error;
    }
  }

  // 切换监控状态
  async function toggleMonitor(id: string) {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}/toggle`, {
        method: 'PATCH',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        const index = monitors.value.findIndex(m => m.id === id);
        if (index !== -1) {
          monitors.value[index] = {
            ...result.data,
            config: parseJSONField(result.data.config),
            tags: parseJSONField(result.data.tags),
          };
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '操作失败');
    } catch (error) {
      console.error('Failed to toggle monitor:', error);
      throw error;
    }
  }

  // 删除监控任务
  async function deleteMonitor(id: string) {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        monitors.value = monitors.value.filter(m => m.id !== id);
        updateStats();
        return true;
      }
      throw new Error(result.error || '删除失败');
    } catch (error) {
      console.error('Failed to delete monitor:', error);
      throw error;
    }
  }

  // 获取监控统计
  async function fetchStats(id: string, period = '24h') {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}/stats?period=${period}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return null;
    }
  }

  // 获取监控结果
  async function fetchResults(id: string, page = 1, limit = 100) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await fetch(`${API_BASE}/monitors/${id}/results?${params}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      return { items: [], total: 0 };
    } catch (error) {
      console.error('Failed to fetch results:', error);
      return { items: [], total: 0 };
    }
  }

  // 更新统计数据
  function updateStats() {
    stats.value.total = monitors.value.length;
    stats.value.active = monitors.value.filter(m => m.status === 'ACTIVE').length;
    stats.value.paused = monitors.value.filter(m => m.status === 'PAUSED').length;
    stats.value.error = monitors.value.filter(m => m.status === 'ERROR' || m.status === 'DOWN').length;
  }

  // 获取监控任务详情
  async function getMonitorById(id: string) {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch monitor');
    } catch (error) {
      console.error('Failed to fetch monitor:', error);
      throw error;
    }
  }

  // 快速检测
  async function quickCheck(id: string) {
    try {
      const response = await fetch(`${API_BASE}/monitors/${id}/quick-check`, {
        method: 'POST',
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Quick check failed');
    } catch (error) {
      console.error('Quick check failed:', error);
      throw error;
    }
  }

  return {
    monitors,
    loading,
    stats,
    fetchMonitors,
    createMonitor,
    updateMonitor,
    toggleMonitor,
    deleteMonitor,
    fetchStats,
    fetchResults,
    getMonitorById,
    quickCheck,
  };
});
