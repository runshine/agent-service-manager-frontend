
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AgentInfo, ServiceTemplate } from '../types';
import { 
  RefreshCw, 
  Play, 
  Square, 
  Activity, 
  Search, 
  Cpu, 
  HardDrive, 
  Terminal,
  ShieldCheck,
  MoreHorizontal,
  Info,
  ChevronRight,
  Database,
  ExternalLink
} from 'lucide-react';

interface AgentsProps {
  workspaceId?: string;
  onSelectAgent?: (key: string) => void;
}

const Agents: React.FC<AgentsProps> = ({ workspaceId, onSelectAgent }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [deployModal, setDeployModal] = useState(false);
  const [deployParams, setDeployParams] = useState({ serviceName: '', templateName: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgents = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await api.agents.list(1, 100, workspaceId);
      setAgents(res.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.templates.list(1, 100);
      setTemplates(res.templates || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchTemplates();
  }, [workspaceId]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await api.agents.refresh();
      await fetchAgents();
    } catch (err) {
      console.error("Manual refresh failed", err);
      await fetchAgents();
    }
  };

  const openDeploy = (e: React.MouseEvent, agent: AgentInfo) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setDeployModal(true);
  };

  const handleDeploy = async () => {
    if (!selectedAgent) return;
    try {
      await api.tasks.deploy({
        agent_key: selectedAgent.key,
        service_name: deployParams.serviceName,
        template_name: deployParams.templateName
      });
      setDeployModal(false);
      setDeployParams({ serviceName: '', templateName: '' });
      alert('Deployment task created successfully. Monitor progress in the Tasks tab.');
    } catch (err: any) {
      alert(err.message || 'Deployment failed');
    }
  };

  const handleUndeploy = async (agentKey: string, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to stop and remove ${serviceName}?`)) return;
    try {
      await api.tasks.undeploy({
        agent_key: agentKey,
        service_name: serviceName
      });
      alert('Undeploy task created.');
    } catch (err: any) {
      alert(err.message || 'Undeploy failed');
    }
  };

  const filteredAgents = agents.filter(a => 
    a.hostname.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.ip_address.includes(searchQuery) ||
    a.workspace_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} />
            Distributed Agents
          </h1>
          <p className="text-gray-500 text-sm">
            Registry-synchronized node management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search nodes..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm active:scale-95 text-sm font-semibold"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Registry</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Node Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Network</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">System Health</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Containers</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && !refreshing ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-400 font-medium">Discovering network nodes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    No matching agents found in registry.
                  </td>
                </tr>
              ) : filteredAgents.map((agent) => (
                <tr 
                  key={agent.key} 
                  className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => onSelectAgent?.(agent.key)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        agent.status === 'online' 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                          : 'bg-gray-300'
                      }`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        agent.status === 'online' ? 'text-emerald-700' : 'text-gray-400'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        {agent.hostname}
                        {agent.status === 'online' && <Activity size={12} className="text-emerald-400 animate-pulse" />}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">
                        ID: {agent.key.substring(0, 8)}...
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded w-fit">
                        {agent.ip_address}
                      </span>
                      <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
                        WS: {agent.workspace_id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-[180px]">
                    {agent.status === 'online' ? (
                      <div className="space-y-2">
                        {/* Corrected paths: agent.system_info.cpu.percent and agent.system_info.memory.percent (or usage_percent fallback) */}
                        <ResourceBar 
                          label="CPU" 
                          value={agent.system_info?.cpu?.percent ?? agent.system_info?.cpu?.usage_percent ?? 0} 
                          icon={Cpu} 
                        />
                        <ResourceBar 
                          label="RAM" 
                          value={agent.system_info?.memory?.percent ?? agent.system_info?.memory?.usage_percent ?? 0} 
                          icon={Database} 
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Metrics unavailable</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {agent.services && agent.services.length > 0 ? (
                        <>
                          {agent.services.slice(0, 2).map((svc, i) => (
                            <span key={i} className="text-[10px] font-bold bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                              <Terminal size={10} className="text-blue-500" /> {svc.name}
                            </span>
                          ))}
                          {agent.services.length > 2 && (
                            <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              +{agent.services.length - 2} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-medium">No containers</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectAgent?.(agent.key); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        disabled={agent.status !== 'online'}
                        onClick={(e) => openDeploy(e, agent)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-100/50 rounded-lg transition-all disabled:opacity-20"
                        title="Quick Deploy"
                      >
                        <Play size={18} fill="currentColor" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deployModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 border border-white/20">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Deploy Service</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{selectedAgent?.hostname}</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Service Instance Name</label>
                <input
                  type="text"
                  placeholder="e.g., prod-redis-cluster"
                  className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-medium text-gray-900"
                  value={deployParams.serviceName}
                  onChange={(e) => setDeployParams({...deployParams, serviceName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Docker Compose Template</label>
                <select
                  className="w-full appearance-none px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-800 cursor-pointer"
                  value={deployParams.templateName}
                  onChange={(e) => setDeployParams({...deployParams, templateName: e.target.value})}
                >
                  <option value="">Select a blueprint...</option>
                  {templates.map(t => <option key={t.id} value={t.name}>{t.name} ({t.type.toUpperCase()})</option>)}
                </select>
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  onClick={() => setDeployModal(false)}
                  className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-sm tracking-widest"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!deployParams.serviceName || !deployParams.templateName}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all font-black text-sm tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                >
                  DEPLOY NOW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResourceBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
      <span className="flex items-center gap-1"><Icon size={10} /> {label}</span>
      <span>{typeof value === 'number' ? value.toFixed(1) : value}%</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${
          value > 90 ? 'bg-red-500' : value > 70 ? 'bg-amber-500' : 'bg-blue-500'
        }`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

export default Agents;
