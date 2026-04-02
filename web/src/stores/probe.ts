import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Probe } from '@synthetic-monitoring/shared';
import { useAuthStore } from './auth';

const API_BASE = '/api';

export const useProbeStore = defineStore('probe', () => {
  const probes = ref<Probe[]>([]);
  const loading = ref(false);
  const stats = ref({
    total: 0,
    online: 0,
    offline: 0,
    busy: 0,
    idle: 0,
    totalAssignedMonitors: 0,
  });

  // Get auth header from auth store
  const authStore = useAuthStore();
  const getAuthHeader = computed(() => authStore.getAuthHeader());

  // 获取所有探针
  async function fetchProbes(filters?: { region?: string; status?: string; provider?: string }) {
    loading.value = true;
    try {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`${API_BASE}/probes?${params}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        probes.value = (result.data || []).map((p: any) => ({
          ...p,
          capabilities: parseCapabilities(p.capabilities),
          tags: parseJSONField(p.tags),
        }));
        // 更新统计数据
        stats.value.total = probes.value.length;
        stats.value.online = probes.value.filter(p => p.status === 'ONLINE').length;
        stats.value.offline = probes.value.filter(p => p.status === 'OFFLINE').length;
        stats.value.busy = probes.value.filter(p => p.status === 'BUSY').length;
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch probes');
    } catch (error) {
      console.error('Failed to fetch probes:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 解析能力字段（从 JSON 字符串或数组）
  function parseCapabilities(capabilities: any): string[] {
    if (Array.isArray(capabilities)) {
      return capabilities;
    }
    if (typeof capabilities === 'string') {
      try {
        return JSON.parse(capabilities);
      } catch {
        return [];
      }
    }
    return [];
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
    return field || [];
  }

  // 获取探针统计
  async function fetchStats() {
    try {
      const response = await fetch(`${API_BASE}/probes/stats`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        stats.value = result.data;
      }
      return result.data;
    } catch (error) {
      console.error('Failed to fetch probe stats:', error);
      return null;
    }
  }

  // 获取探针详情
  async function fetchProbe(id: string) {
    try {
      const response = await fetch(`${API_BASE}/probes/${id}`, {
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Probe not found');
    } catch (error) {
      console.error('Failed to fetch probe:', error);
      return null;
    }
  }

  // 创建探针
  async function createProbe(data: {
    name: string;
    region: string;
    location?: { country: string; city: string; latitude?: number; longitude?: number };
    provider?: string;
    tags?: string[];
  }) {
    try {
      const response = await fetch(`${API_BASE}/probes`, {
        method: 'POST',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        probes.value.push(result.data);
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '创建失败');
    } catch (error) {
      console.error('Failed to create probe:', error);
      throw error;
    }
  }

  // 更新探针
  async function updateProbe(id: string, updates: Partial<Probe>) {
    try {
      const response = await fetch(`${API_BASE}/probes/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        const index = probes.value.findIndex(p => p.id === id);
        if (index !== -1) {
          probes.value[index] = result.data;
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '更新失败');
    } catch (error) {
      console.error('Failed to update probe:', error);
      throw error;
    }
  }

  // 删除探针
  async function deleteProbe(id: string) {
    try {
      const response = await fetch(`${API_BASE}/probes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader.value,
      });
      const result = await response.json();
      if (result.success) {
        probes.value = probes.value.filter(p => p.id !== id);
        updateStats();
        return true;
      }
      throw new Error(result.error || '删除失败');
    } catch (error) {
      console.error('Failed to delete probe:', error);
      throw error;
    }
  }

  // 切换探针状态
  async function toggleProbe(id: string) {
    try {
      const response = await fetch(`${API_BASE}/probes/${id}/toggle`, {
        method: 'PATCH',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        const index = probes.value.findIndex(p => p.id === id);
        if (index !== -1) {
          probes.value[index].enabled = result.data.enabled;
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '操作失败');
    } catch (error) {
      console.error('Failed to toggle probe:', error);
      throw error;
    }
  }

  // 分配监控到探针
  async function assignMonitors(id: string, monitorIds: string[]) {
    try {
      const response = await fetch(`${API_BASE}/probes/${id}/assign`, {
        method: 'POST',
        headers: { ...getAuthHeader.value, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitorIds }),
      });
      const result = await response.json();
      if (result.success) {
        const index = probes.value.findIndex(p => p.id === id);
        if (index !== -1) {
          probes.value[index] = result.data;
        }
        updateStats();
        return result.data;
      }
      throw new Error(result.error || '分配失败');
    } catch (error) {
      console.error('Failed to assign monitors:', error);
      throw error;
    }
  }

  // 更新统计数据
  function updateStats() {
    stats.value.total = probes.value.length;
    stats.value.online = probes.value.filter(p => p.status === 'ONLINE').length;
    stats.value.offline = probes.value.filter(p => p.status === 'OFFLINE').length;
    stats.value.busy = probes.value.filter(p => p.status === 'BUSY').length;
    stats.value.idle = stats.value.online - stats.value.busy;
  }

  return {
    probes,
    loading,
    stats,
    fetchProbes,
    fetchStats,
    fetchProbe,
    createProbe,
    updateProbe,
    deleteProbe,
    toggleProbe,
    assignMonitors,
  };
});
