import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@synthetic-monitoring/shared';

const API_BASE = '/api';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: User;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Check if user is logged in
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  // Get user role
  const userRole = computed(() => user.value?.role || null);

  // Check if user has specific role
  const hasRole = computed(() => (role: string) => {
    if (!user.value) return false;
    const roleOrder = ['VIEWER', 'USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    return roleOrder.indexOf(user.value.role) >= roleOrder.indexOf(role);
  });

  // Check permissions
  const canManageUsers = computed(() => hasRole.value('ADMIN'));
  const canManageMonitors = computed(() => hasRole.value('USER'));
  const canViewReports = computed(() => hasRole.value('USER'));
  const canManageProbes = computed(() => hasRole.value('ADMIN'));

  // Initialize from localStorage
  function init() {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      accessToken.value = savedToken;
      user.value = JSON.parse(savedUser);
    }
  }

  // Login
  async function login(credentials: LoginRequest): Promise<AuthResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!result.success) {
        error.value = result.error || 'Login failed';
        throw new Error(error.value);
      }

      const authData: AuthResponse = result.data;

      // Store tokens and user
      accessToken.value = authData.accessToken;
      refreshToken.value = authData.refreshToken;
      user.value = authData.user;

      // Persist to localStorage
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      return authData;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Register
  async function register(data: RegisterRequest): Promise<AuthResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        error.value = result.error || 'Registration failed';
        throw new Error(error.value);
      }

      const authData: AuthResponse = result.data;

      // Store tokens and user
      accessToken.value = authData.accessToken;
      refreshToken.value = authData.refreshToken;
      user.value = authData.user;

      // Persist to localStorage
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      return authData;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed';
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Logout
  async function logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.value}`,
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear local state
      accessToken.value = null;
      refreshToken.value = null;
      user.value = null;
      error.value = null;

      // Clear localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Get current user
  async function getCurrentUser(): Promise<User | null> {
    if (!accessToken.value) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken.value}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        user.value = result.data;
        localStorage.setItem('user', JSON.stringify(result.data));
        return result.data;
      }

      // Token expired or invalid
      await logout();
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Refresh token
  async function refreshTokenFunc(): Promise<string | null> {
    if (!refreshToken.value) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      });

      const result = await response.json();

      if (result.success) {
        accessToken.value = result.data.accessToken;
        localStorage.setItem('accessToken', result.data.accessToken);
        return result.data.accessToken;
      }

      // Refresh failed, logout
      await logout();
      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await logout();
      return null;
    }
  }

  // Change password
  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken.value}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  // Get authorization header for API calls
  function getAuthHeader(): Record<string, string> {
    return {
      'Authorization': accessToken.value ? `Bearer ${accessToken.value}` : '',
    };
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    userRole,
    hasRole,
    canManageUsers,
    canManageMonitors,
    canViewReports,
    canManageProbes,
    // Actions
    init,
    login,
    register,
    logout,
    getCurrentUser,
    refreshTokenFunc,
    changePassword,
    getAuthHeader,
  };
});
