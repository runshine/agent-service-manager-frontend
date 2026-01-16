
import { AuthResponse } from './types';

// Root API URL for the development agent server
const API_BASE = 'https://develop-agentserver.819819.xyz/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      ...getAuthHeaders(),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  auth: {
    login: (credentials: any) => api.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    getProfile: () => api.request<any>('/auth/profile'),
  },

  workspaces: {
    list: () => api.request<any>('/workspaces'),
  },

  templates: {
    list: (page = 1, perPage = 10) => api.request<any>(`/templates?page=${page}&per_page=${perPage}`),
    upload: (formData: FormData) => api.request<any>('/templates', {
      method: 'POST',
      body: formData
    }),
    delete: (name: string) => api.request<any>(`/templates/${name}`, { method: 'DELETE' }),
    download: (name: string) => `${API_BASE}/templates/${name}/download?token=${localStorage.getItem('token')}`,
  },

  agents: {
    list: (page = 1, perPage = 10, workspaceId?: string) => {
      let url = `/agents?page=${page}&per_page=${perPage}`;
      if (workspaceId) url += `&workspace_id=${encodeURIComponent(workspaceId)}`;
      return api.request<any>(url);
    },
    get: (key: string) => api.request<any>(`/agents/${key}`),
    reset: (key: string) => api.request<any>(`/agents/${key}/reset`, { method: 'POST' }),
    // Added refresh method to sync registry for agents as required by the Agents page
    refresh: () => api.request<any>('/agents/refresh', { method: 'POST' }),
  },

  tasks: {
    list: (page = 1, perPage = 10, type?: string, status?: string, workspaceId?: string) => {
      let url = `/tasks?page=${page}&per_page=${perPage}`;
      if (type) url += `&type=${type}`;
      if (status) url += `&status=${status}`;
      if (workspaceId) url += `&workspace_id=${encodeURIComponent(workspaceId)}`;
      return api.request<any>(url);
    },
    deploy: (data: any) => api.request<any>('/tasks/deploy', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    undeploy: (data: any) => api.request<any>('/tasks/undeploy', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    get: (id: string) => api.request<any>(`/tasks/${id}`),
    delete: (id: string) => api.request<any>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  users: {
    list: (page = 1, perPage = 10) => api.request<any>(`/users?page=${page}&per_page=${perPage}`),
    create: (data: any) => api.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: any) => api.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    changePassword: (id: number, data: any) => api.request<any>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => api.request<any>(`/users/${id}`, { method: 'DELETE' }),
  }
};
