
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Layers, ChevronDown, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentWorkspace: string;
  onWorkspaceChange: (id: string) => void;
  userName: string;
}

const Header: React.FC<HeaderProps> = ({ currentWorkspace, onWorkspaceChange, userName }) => {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.workspaces.list();
      // Backend returns { 'workspaces': [...], 'total': ... }
      if (res && res.workspaces) {
        setWorkspaces(res.workspaces);
      } else if (Array.isArray(res)) {
        setWorkspaces(res);
      }
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // The user specified that the workspace refresh should use the list_workspaces interface (GET /api/workspaces)
      await fetchWorkspaces();
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      // Slight delay to show rotation for better UX
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>
        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Layers size={16} />
            <span className="whitespace-nowrap">Active Workspace:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group min-w-[180px]">
              <select
                value={currentWorkspace}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-1.5 cursor-pointer font-bold hover:bg-gray-100 transition-colors"
              >
                <option value="">All Workspaces</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.id} ({ws.online_agents || 0}/{ws.agent_count || 0})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                <ChevronDown size={14} />
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh workspace list"
              className={`p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
                isRefreshing ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-gray-900">{userName}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Authenticated</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

export default Header;
