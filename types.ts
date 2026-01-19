
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: 'admin' | 'user';
    email: string;
    full_name: string;
  };
}

export interface ServiceTemplate {
  id: number;
  name: string;
  description: string;
  type: 'yaml' | 'archive' | 'zip';
  file_path: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentInfo {
  key: string;
  ip_address: string;
  hostname: string;
  workspace_id: string;
  full_name: string;
  status: 'online' | 'offline' | 'error' | 'unknown';
  last_seen: string | null;
  system_info: any;
  services: any[];
}

export interface TaskInfo {
  id: number;
  task_id: string;
  task_type: 'deploy' | 'undeploy';
  service_name: string;
  agent_key: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  logs: string[] | string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PaginatedResponse<T> {
  [key: string]: any;
  page: number;
  per_page: number;
  total: number;
}
