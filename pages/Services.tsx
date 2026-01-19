
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
  Monitor,
  ChevronRight,
  Info,
  Box
} from 'lucide-react';

interface GlobalService {
  [key: string]: any;
  agentKey: string;
  agentHostname: string;
  agentIp: string;
  agentStatus: string;
}

interface ServicesProps {
  workspaceId?: string;
  onNavigate: (path: string) => void;
}

const Services: React.FC<ServicesProps> = ({ workspaceId, onNavigate }) => {
  const [allServices, setAllServices] = useState<GlobalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceLogs, setServiceLogs] = useState<{name: string, content: string, agentHostname: string} | null>(null);

  // Modal State
  const [undeployModal, setUndeployModal] = useState<{ show: boolean; serviceName: string | null; agentKey: string | null; agentHostname: string | null }>({
    show: false,
    serviceName: null,
    agentKey: null,
    agentHostname: null
  });
  const [isUndeploying, setIsUndeploying] = useState(false);

  const fetchAllServices = async () => {
    try {
      setRefreshing(true);
      if (allServices.length === 0) setLoading(true);

      // 1. Get all agents
      const agentsRes = await api.agents.list(1, 1000, workspaceId);
      const agents: AgentInfo[] = agentsRes.agents || [];
      
      // 2. Fetch services from each online agent in parallel
      const servicePromises = agents.map(async (agent) => {
        if (agent.status !== 'online') return [];
        try {
          const res = await api.agents.proxy.getServices(agent.key);
          // Example response shows a direct array, so we handle both array and { services: [] }
          const servicesData = Array.isArray(res) ? res : (res.services || []);
          
          return servicesData.map((s: any) => ({
            ...s,
            agentKey: agent.key,
            agentHostname: agent.hostname,
            agentIp: agent.ip_address,
            agentStatus: agent.status
          }));
        } catch (e) {
          console.warn(`Failed to fetch services for agent ${agent.hostname} (${agent.key}):`, e);
          return [];
        }
      });

      const results = await Promise.allSettled(servicePromises);
      const flattened = results
        .filter((r): r is PromiseFulfilledResult<GlobalService[]> => r.status === 'fulfilled')
        .map(r => r.value)
        .flat();

      setAllServices(flattened);
    } catch (err) {
      console.error("Global service aggregation failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllServices();
    // Refresh interval every 45 seconds
    const interval = setInterval(fetchAllServices, 45000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const handleServiceAction = async (agentKey: string, name: string, action: 'start' | 'stop' | 'restart') => {
    try {
      if (action === 'start') await api.agents.proxy.startService(agentKey, name);
      if (action === 'stop') await api.agents.proxy.stopService(agentKey, name);
      if (action === 'restart') await api.agents.proxy.restartService(agentKey, name);
      
      // Sync immediately after action
      fetchAllServices();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} service`);
    }
  };

  const openUndeployModal = (agentKey: string, agentHostname: string, name: string) => {
    setUndeployModal({ show: true, serviceName: name, agentKey, agentHostname });
  };

  const executeUndeploy = async () => {
    if (!undeployModal.serviceName || !undeployModal.agentKey) return;
    setIsUndeploying(true);
    try {
      await api.tasks.undeploy({
        service_name: undeployModal.serviceName,
        agent_key: undeployModal.agentKey
      });
      setUndeployModal({ show: false, serviceName: null, agentKey: null, agentHostname: null });
      onNavigate('/tasks');
    } catch (err: any) {
      alert(err.message || 'Failed to create undeploy task');
    } finally {
      setIsUndeploying(false);
    }
  };

  const showLogs = async (agentKey: string, agentHostname: string, name: string) => {
    try {
      const res = await api.agents.proxy.getLogs(agentKey, name, 800);
      setServiceLogs({ name, content: res.logs || 'No logs available.', agentHostname });
    } catch (err: any) {
      alert(err.message || 'Failed to fetch logs');
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery) return allServices;
    const q = searchQuery.toLowerCase();
    return allServices.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.agentHostname.toLowerCase().includes(q) || 
      s.agentIp.includes(q)
    );
  }, [allServices, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Layers className="text-blue-600" size={32} />
            Global Services
          </h1>
          <p className="text-gray-500 text-base font-bold mt-1">Aggregated cluster workload monitor with node-level tracing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search services or nodes..."
              className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:outline-none w-72 shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={fetchAllServices}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 font-black text-xs uppercase tracking-widest disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Cluster</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service Specification</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Compute Node</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Workload Status</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">State</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && allServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-40 text-center">
                    <Loader2 className="animate-spin text-blue-600 inline-block" size={48} />
                    <p className="mt-4 text-sm font-black text-gray-400 uppercase tracking-widest">Polling distributed agents...</p>
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-40 text-center text-gray-300">
                    <Layers size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-widest">No active workloads detected</p>
                  </td>
                </tr>
              ) : filteredServices.map((service, idx) => {
                const real = service.real_status || {};
                const status = real.status || service.status;
                const running = real.running || 0;
                const total = real.total || 0;
                const isRunning = status === 'running';
                
                let statusClasses = "bg-gray-50 text-gray-500 border-gray-200";
                if (isRunning) {
                   if (running === total && total > 0) statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-100";
                   else if (running > 0) statusClasses = "bg-amber-50 text-amber-700 border-amber-100";
                   else statusClasses = "bg-red-50 text-red-700 border-red-100";
                }

                return (
                  <tr 
                    key={`${service.agentKey}-${service.name}-${idx}`} 
                    className="group hover:bg-blue-50/40 transition-all border-l-4 border-transparent hover:border-blue-500"
                  >
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-gray-900 group-hover:text-blue-700 transition-colors">{service.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <Box size={10} className="text-gray-300" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[200px]" title={service.path}>{service.path}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-gray-100 rounded-xl text-gray-400 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-sm">
                             <Server size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900">{service.agentHostname}</span>
                            <span className="text-[10px] font-mono font-bold text-gray-400 mt-0.5">{service.agentIp}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col gap-2 min-w-[150px]">
                          <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                             <span>Units</span>
                             <span>{running}/{total} UP</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-1000 ${running === total && total > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                              style={{ width: `${total > 0 ? (running/total)*100 : 0}%` }} 
                            />
                          </div>
                          <div className="flex flex-wrap gap-1">
                             {real.containers?.slice(0, 2).map((c: any, ci: number) => (
                               <span key={ci} className="text-[8px] font-black bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-100 uppercase">{c.Name}</span>
                             ))}
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 w-fit shadow-sm ${statusClasses}`}>
                          {isRunning && <Activity size={12} className={running > 0 ? 'animate-pulse' : ''} />}
                          {isRunning && running < total ? 'Degraded' : status}
                        </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => showLogs(service.agentKey, service.agentHostname, service.name)}
                           className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm"
                           title="Logs"
                         >
                           <Terminal size={20} />
                         </button>
                         {isRunning ? (
                           <>
                             <button 
                               onClick={() => handleServiceAction(service.agentKey, service.name, 'restart')}
                               className="p-3 text-gray-400 hover:text-amber-600 hover:bg-white rounded-2xl transition-all shadow-sm"
                               title="Restart"
                             >
                               <RotateCcw size={20} />
                             </button>
                             <button 
                               onClick={() => handleServiceAction(service.agentKey, service.name, 'stop')}
                               className="p-3 text-gray-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm"
                               title="Stop"
                             >
                               <Square size={20} fill="currentColor" />
                             </button>
                           </>
                         ) : (
                           <button 
                             onClick={() => handleServiceAction(service.agentKey, service.name, 'start')}
                             className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-2xl transition-all shadow-sm"
                             title="Start"
                           >
                             <Play size={20} fill="currentColor" />
                           </button>
                         )}
                         <button 
                           onClick={() => openUndeployModal(service.agentKey, service.agentHostname, service.name)}
                           className="p-3 text-gray-400 hover:text-red-700 hover:bg-white rounded-2xl transition-all shadow-sm"
                           title="Undeploy"
                         >
                           <Trash2 size={20} />
                         </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal Overlay */}
      {serviceLogs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-[95vw] h-[85vh] flex flex-col border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-blue-600/20 rounded-2xl text-blue-400">
                   <Terminal size={28} />
                 </div>
                 <div>
                   <h2 className="text-white text-sm font-black uppercase tracking-[0.2em]">Remote Trace: {serviceLogs.name}</h2>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Node: {serviceLogs.agentHostname}</p>
                 </div>
              </div>
              <button onClick={() => setServiceLogs(null)} className="p-3 hover:bg-white/5 rounded-2xl text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 p-8 font-mono text-[13px] overflow-y-auto text-slate-300 bg-slate-950/50 custom-scrollbar leading-relaxed">
              {serviceLogs.content ? (
                serviceLogs.content.split('\n').map((line, i) => (
                  <div key={i} className="py-0.5 border-l-2 border-white/5 pl-4 hover:bg-white/10 transition-colors flex gap-6">
                    <span className="text-slate-700 select-none font-bold w-12 text-right opacity-30">{(i+1).toString().padStart(3, '0')}</span>
                    <span className="whitespace-pre-wrap flex-1">{line}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-600">
                  <RefreshCw className="animate-spin" size={32} />
                  <div className="italic text-sm font-black uppercase tracking-[0.3em] opacity-40">Capturing trace buffer...</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 bg-slate-900 text-right">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Buffer snapshot captured from remote node proxy</span>
            </div>
          </div>
        </div>
      )}

      {/* Undeploy Confirmation Modal */}
      {undeployModal.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-red-100 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-50 bg-red-50/50 flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-red-100 flex items-center justify-center text-red-600 shadow-xl shadow-red-500/10">
                <AlertTriangle size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Confirm Purge</h2>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mt-1">Irreversible Workload Action</p>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <p className="text-base text-gray-600 font-bold leading-relaxed">
                You are about to purge service <span className="text-red-600 underline decoration-2 underline-offset-4 font-black">"{undeployModal.serviceName}"</span> from node <span className="font-black text-gray-900 underline decoration-indigo-300 underline-offset-4">"{undeployModal.agentHostname}"</span>.
              </p>
              <div className="flex gap-6">
                <button 
                  onClick={() => setUndeployModal({ show: false, serviceName: null, agentKey: null, agentHostname: null })} 
                  className="flex-1 px-8 py-5 border-2 border-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={executeUndeploy} 
                  disabled={isUndeploying}
                  className="flex-1 px-8 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUndeploying ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Purge'}
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
