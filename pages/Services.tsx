
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { AgentInfo } from '../types';
import { 
  RefreshCw, 
  Terminal, 
  Play, 
  Square, 
  RotateCcw, 
  Search,
  Layers,
  Activity,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Server,
  ChevronRight,
  ChevronDown,
  Box
} from 'lucide-react';

interface ServicesProps {
  workspaceId?: string;
  onNavigate: (path: string) => void;
}

const Services: React.FC<ServicesProps> = ({ workspaceId, onNavigate }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.agents.list(1, 1000, workspaceId);
      setAgents(res.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [workspaceId]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(a => 
      a.hostname.toLowerCase().includes(q) || 
      a.ip_address.includes(q)
    );
  }, [agents, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Layers className="text-blue-600" size={32} />
            Service Hub
          </h1>
          <p className="text-gray-500 text-base font-bold mt-1">Real-time workload orchestration across distributed nodes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
            <input 
              type="text"
              placeholder="Search nodes or services..."
              className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:outline-none w-72 shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={fetchAgents}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 font-black text-xs uppercase tracking-widest"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Sync Cluster</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-40 text-center">
            <Loader2 className="animate-spin text-blue-600 inline-block" size={48} />
            <p className="mt-4 text-sm font-black text-gray-400 uppercase tracking-widest">Discovering Nodes...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="py-40 text-center text-gray-300 bg-white rounded-[2.5rem] border border-gray-100">
            <Server size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">No active agents found</p>
          </div>
        ) : (
          filteredAgents.map(agent => (
            <AgentServiceCard 
              key={agent.key} 
              agent={agent} 
              onNavigate={onNavigate} 
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
};

const AgentServiceCard: React.FC<{ agent: AgentInfo; onNavigate: (p: string) => void; searchQuery: string }> = ({ agent, onNavigate, searchQuery }) => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [undeployModal, setUndeployModal] = useState<{ show: boolean; serviceName: string | null }>({ show: false, serviceName: null });
  const [isUndeploying, setIsUndeploying] = useState(false);
  const [logsModal, setLogsModal] = useState<{ name: string; content: string } | null>(null);

  const fetchServices = async () => {
    if (agent.status !== 'online') return;
    try {
      setLoading(true);
      const res = await api.agents.proxy.getServices(agent.key);
      // Backend returns a direct array or { services: [...] }
      const data = Array.isArray(res) ? res : (res.services || []);
      setServices(data);
    } catch (err) {
      console.error(`Failed to load services for ${agent.hostname}`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [agent.key]);

  const handleAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    try {
      if (action === 'start') await api.agents.proxy.startService(agent.key, name);
      if (action === 'stop') await api.agents.proxy.stopService(agent.key, name);
      if (action === 'restart') await api.agents.proxy.restartService(agent.key, name);
      fetchServices();
    } catch (err: any) {
      alert(err.message || "Action failed");
    }
  };

  const executeUndeploy = async () => {
    if (!undeployModal.serviceName) return;
    setIsUndeploying(true);
    try {
      await api.tasks.undeploy({ service_name: undeployModal.serviceName, agent_key: agent.key });
      setUndeployModal({ show: false, serviceName: null });
      onNavigate('/tasks');
    } catch (err: any) {
      alert(err.message || "Undeploy failed");
    } finally {
      setIsUndeploying(false);
    }
  };

  const showLogs = async (name: string) => {
    try {
      const res = await api.agents.proxy.getLogs(agent.key, name, 500);
      setLogsModal({ name, content: res.logs });
    } catch (err: any) {
      alert(err.message || "Failed to fetch logs");
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, searchQuery]);

  // If searching and no services match this agent, hide the card
  if (searchQuery && filteredServices.length === 0 && !agent.hostname.toLowerCase().includes(searchQuery.toLowerCase())) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Agent Header */}
      <div 
        className="px-8 py-5 bg-gray-50/50 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${agent.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            <Server size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-gray-900">{agent.hostname}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{agent.ip_address}</span>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              {loading ? 'Polling services...' : `${services.length} Managed Services`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); fetchServices(); }}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {isExpanded ? <ChevronDown size={20} className="text-gray-300" /> : <ChevronRight size={20} className="text-gray-300" />}
        </div>
      </div>

      {/* Services List */}
      {isExpanded && (
        <div className="p-4 bg-white divide-y divide-gray-50">
          {loading && services.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Synchronizing Workloads</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic text-sm">
              {agent.status === 'offline' ? 'Node is offline' : 'No services found on this node'}
            </div>
          ) : (
            filteredServices.map((s, idx) => {
              const real = s.real_status || {};
              const status = real.status || s.status;
              const running = real.running || 0;
              const total = real.total || 0;
              const isRunning = status === 'running';

              return (
                <div key={idx} className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50 rounded-2xl transition-all">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col min-w-[180px]">
                      <span className="text-sm font-black text-gray-800">{s.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{status}</span>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex flex-col gap-1.5 w-40">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                        <span>Units</span>
                        <span>{running}/{total} UP</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${running === total && total > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: `${total > 0 ? (running/total)*100 : 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => showLogs(s.name)} className="p-2 text-gray-400 hover:text-blue-600 transition-all rounded-lg hover:bg-white shadow-sm" title="Logs">
                      <Terminal size={16} />
                    </button>
                    {isRunning ? (
                      <>
                        <button onClick={() => handleAction(s.name, 'restart')} className="p-2 text-gray-400 hover:text-amber-600 transition-all rounded-lg hover:bg-white shadow-sm" title="Restart">
                          <RotateCcw size={16} />
                        </button>
                        <button onClick={() => handleAction(s.name, 'stop')} className="p-2 text-gray-400 hover:text-red-600 transition-all rounded-lg hover:bg-white shadow-sm" title="Stop">
                          <Square size={16} fill="currentColor" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleAction(s.name, 'start')} className="p-2 text-gray-400 hover:text-emerald-600 transition-all rounded-lg hover:bg-white shadow-sm" title="Start">
                        <Play size={16} fill="currentColor" />
                      </button>
                    )}
                    <button onClick={() => setUndeployModal({ show: true, serviceName: s.name })} className="p-2 text-gray-400 hover:text-red-700 transition-all rounded-lg hover:bg-white shadow-sm" title="Undeploy">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Logs Modal Overlay */}
      {logsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-[90vw] h-[80vh] flex flex-col border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-4">
                 <Terminal className="text-blue-500" />
                 <h2 className="text-white text-sm font-black uppercase tracking-[0.2em]">Live Buffer: {logsModal.name}</h2>
              </div>
              <button onClick={() => setLogsModal(null)} className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 p-8 font-mono text-[13px] overflow-y-auto text-slate-300 bg-slate-950/50 custom-scrollbar leading-relaxed">
              {logsModal.content.split('\n').map((line, i) => (
                <div key={i} className="py-0.5 border-l-2 border-white/5 pl-4 hover:bg-white/10 transition-colors flex gap-6">
                  <span className="text-slate-700 select-none font-bold w-12 text-right opacity-30">{(i+1).toString().padStart(3, '0')}</span>
                  <span className="whitespace-pre-wrap flex-1">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Undeploy Modal */}
      {undeployModal.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-red-100 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-50 bg-red-50/50 flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase">Confirm Removal</h2>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-gray-600 font-bold leading-relaxed">
                Purge service <span className="text-red-600 font-black">"{undeployModal.serviceName}"</span> from node <span className="text-gray-900 font-black">{agent.hostname}</span>?
              </p>
              <div className="flex gap-4">
                <button onClick={() => setUndeployModal({ show: false, serviceName: null })} className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                <button 
                  onClick={executeUndeploy} 
                  disabled={isUndeploying}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUndeploying ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
