
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AgentInfo, ServiceTemplate } from '../types';
import { RefreshCw, Play, Square, Activity, LayoutGrid, List as ListIcon, Search, Cpu, HardDrive, Terminal } from 'lucide-react';

interface AgentsProps {
  workspaceId?: string;
}

const Agents: React.FC<AgentsProps> = ({ workspaceId }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [deployModal, setDeployModal] = useState(false);
  const [deployParams, setDeployParams] = useState({ serviceName: '', templateName: '' });

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.agents.list(1, 100, workspaceId);
      setAgents(res.agents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const res = await api.templates.list(1, 100);
    setTemplates(res.templates);
  };

  useEffect(() => {
    fetchAgents();
    fetchTemplates();
  }, [workspaceId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.agents.refresh();
      await fetchAgents();
    } catch (err) {
      alert('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const openDeploy = (agent: AgentInfo) => {
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
      alert('Deployment task created. Check Tasks tab for progress.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUndeploy = async (agentKey: string, serviceName: string) => {
    if (!window.confirm(`Stop and remove ${serviceName}?`)) return;
    try {
      await api.tasks.undeploy({
        agent_key: agentKey,
        service_name: serviceName
      });
      alert('Undeploy task created.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distributed Agents</h1>
          <p className="text-gray-500">
            {workspaceId ? `Filtering by Workspace: ${workspaceId}` : 'Auto-discovered via Nacos registry.'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          <span>Sync Registry</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-20 text-gray-400">Loading discovery data...</div>
        ) : agents.length === 0 ? (
          <div className="col-span-2 text-center py-20 text-gray-400">No agents found for this selection.</div>
        ) : agents.map((agent) => (
          <div key={agent.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:border-blue-200 transition-colors">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${agent.status === 'online' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {agent.hostname}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${agent.status === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {agent.status}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 font-mono tracking-tight">{agent.ip_address}</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Workspace: {agent.workspace_id}</p>
                </div>
              </div>
              <button
                disabled={agent.status !== 'online'}
                onClick={() => openDeploy(agent)}
                className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                Deploy
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4 border-b border-gray-100">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">CPU</span>
                <span className="text-sm font-medium text-gray-700">{agent.system_info?.cpu_percent || '0'}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Memory</span>
                <span className="text-sm font-medium text-gray-700">{agent.system_info?.memory?.percent || '0'}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Storage</span>
                <span className="text-sm font-medium text-gray-700">{agent.system_info?.disk?.percent || '0'}%</span>
              </div>
            </div>

            <div className="p-6 flex-1">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Terminal size={12} /> Containers
              </h4>
              <div className="space-y-2">
                {agent.services && agent.services.length > 0 ? (
                  agent.services.map((svc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg group/item hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-700">{svc.name}</span>
                      </div>
                      <button
                        onClick={() => handleUndeploy(agent.key, svc.name)}
                        className="opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 italic py-2 text-center border border-dashed border-gray-200 rounded-lg">No active services.</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {deployModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Deploy Service</h2>
              <p className="text-xs text-gray-500 font-medium">Target: {selectedAgent?.hostname}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instance Name</label>
                <input
                  type="text"
                  placeholder="e.g., custom-service-01"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  value={deployParams.serviceName}
                  onChange={(e) => setDeployParams({...deployParams, serviceName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Template Library</label>
                <select
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  value={deployParams.templateName}
                  onChange={(e) => setDeployParams({...deployParams, templateName: e.target.value})}
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map(t => <option key={t.id} value={t.name}>{t.name} ({t.type})</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setDeployModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!deployParams.serviceName || !deployParams.templateName}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-blue-500/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
