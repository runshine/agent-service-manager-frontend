
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
    
    // Only set Content-Type if there is a body and it's not FormData
    const contentTypeHeader = options.body 
      ? (options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' })
      : {};

    const headers = {
      ...getAuthHeaders(),
      ...contentTypeHeader,
      ...options.headers,
    };

    try {
      console.debug(`[API] ${options.method || 'GET'} ${endpoint}`);
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }

      // Handle 204 No Content or empty bodies gracefully
      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      }

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        console.error(`[API Error] ${endpoint}:`, errorMsg);
        throw new Error(errorMsg);
      }
      return data;
    } catch (error) {
      console.error(`[API Network Error] ${endpoint}:`, error);
      throw error;
    }
  },

  async download(endpoint: string, filename?: string) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...getAuthHeaders() };
    
    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Download failed';
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || json.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      
      if (!filename) {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
          filename = disposition.split('filename=')[1].replace(/"/g, '');
        } else {
          filename = 'template.zip';
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch (error) {
      console.error(`[API Download Error] ${endpoint}:`, error);
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
    get: (name: string) => api.request<any>(`/templates/${encodeURIComponent(name)}`),
    getYaml: (name: string) => api.request<any>(`/templates/${encodeURIComponent(name)}/yaml`),
    updateYaml: (name: string, content: string) => api.request<any>(`/templates/${encodeURIComponent(name)}/yaml`, {
      method: 'PUT',
      body: JSON.stringify({ yaml_content: content })
    }),
    upload: (formData: FormData) => api.request<any>('/templates', {
      method: 'POST',
      body: formData
    }),
    delete: (name: string) => api.request<any>(`/templates/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    download: (name: string) => api.download(`/templates/${encodeURIComponent(name)}/download`),
  },

  agents: {
    list: (page = 1, perPage = 10, workspaceId?: string) => {
      let url = `/agents?page=${page}&per_page=${perPage}`;
      if (workspaceId) url += `&workspace_id=${encodeURIComponent(workspaceId)}`;
      return api.request<any>(url);
    },
    get: (key: string) => api.request<any>(`/agents/${key}`),
    reset: (key: string) => api.request<any>(`/agents/${key}/reset`, { method: 'POST' }),
    refresh: () => api.request<any>('/agents/refresh', { method: 'POST' }),
    
    proxy: {
      getSystemInfo: (key: string) => api.request<any>(`/proxy/${key}/api/system/info`),
      getSystemMetrics: (key: string) => api.request<any>(`/proxy/${key}/api/system/metrics`),
      getProcesses: (key: string) => api.request<any>(`/proxy/${key}/api/system/processes`),
      getDockerStats: (key: string) => api.request<any>(`/proxy/${key}/api/system/docker/stats`),
      getServices: (key: string) => api.request<any>(`/proxy/${key}/api/services`),
      getServiceDetail: (key: string, name: string) => api.request<any>(`/proxy/${key}/api/services/${name}`),
      startService: (key: string, name: string) => api.request<any>(`/proxy/${key}/api/services/${name}/start`, { method: 'POST' }),
      stopService: (key: string, name: string) => api.request<any>(`/proxy/${key}/api/services/${name}/stop`, { method: 'POST' }),
      restartService: (key: string, name: string) => api.request<any>(`/proxy/${key}/api/services/${name}/restart`, { method: 'POST' }),
      getLogs: (key: string, name: string, tail = 1000) => api.request<any>(`/proxy/${key}/api/services/${name}/logs?tail=${tail}`),
      execute: (key: string, name: string, data: any) => api.request<any>(`/proxy/${key}/api/services/${name}/exec`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    }
  },

  tasks: {
    list: (page = 1, perPage = 10, type?: string, status?: string, workspaceId?: string, agentKey?: string) => {
      let url = `/tasks?page=${page}&per_page=${perPage}`;
      if (type) url += `&type=${type}`;
      if (status) url += `&status=${status}`;
      if (workspaceId) url += `&workspace_id=${encodeURIComponent(workspaceId)}`;
      if (agentKey) url += `&agent_key=${encodeURIComponent(agentKey)}`;
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
    getLogs: (id: string, page = 1, perPage = 100) => api.request<any>(`/tasks/${id}/logs?page=${page}&per_page=${perPage}`),
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
