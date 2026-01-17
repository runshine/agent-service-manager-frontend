
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  ArrowLeft, 
  Cpu, 
  Database, 
  HardDrive, 
  Activity, 
  Terminal, 
  RefreshCw, 
  Play, 
  Square, 
  RotateCcw, 
  Search,
  List,
  BarChart3,
  Server,
  Settings,
  ChevronRight,
  ShieldAlert,
  Globe,
  Monitor,
  Clock,
  Box,
  Network,
  Info,
  Tag,
  X,
  Plus,
  FileCode,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { ServiceTemplate } from '../types';

interface AgentDetailProps {
  agentKey: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

type TabType = 'overview' | 'resources' | 'services' | 'processes' | 'network' | 'docker';

const AgentDetail: React.FC<AgentDetailProps> = ({ agentKey, onBack, onNavigate }) => {
  const [agent, setAgent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceLogs, setServiceLogs] = useState<{name: string, content: string} | null>(null);

  // Deployment Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<Set<string>>(new Set());
  const [isDeploying, setIsDeploying] = useState(false);

  const fetchAgentData = async () => {
    try {
      setRefreshing(true);
      const agentInfo = await api.agents.get(agentKey);
      setAgent(agentInfo);
    } catch (err) {
      console.error("Failed to load agent detail", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.templates.list(1, 1000);
      setTemplates(res.templates || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  useEffect(() => {
    fetchAgentData();
    const interval = setInterval(fetchAgentData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [agentKey]);

  const handleServiceAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    try {
      if (action === 'start') await api.agents.proxy.startService(agentKey, name);
      if (action === 'stop') await api.agents.proxy.stopService(agentKey, name);
      if (action === 'restart') await api.agents.proxy.restartService(agentKey, name);
      fetchAgentData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} service`);
    }
  };

  const showLogs = async (name: string) => {
    try {
      const res = await api.agents.proxy.getLogs(agentKey, name);
      setServiceLogs({ name, content: res.logs });
    } catch (err: any) {
      alert(err.message || 'Failed to fetch logs');
    }
  };

  const handleOpenDeploy = () => {
    fetchTemplates();
    setIsDeployModalOpen(true);
    setSelectedTemplateNames(new Set());
  };

  const toggleTemplate = (name: string) => {
    const next = new Set(selectedTemplateNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedTemplateNames(next);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(templateSearch.toLowerCase()))
    );
  }, [templates, templateSearch]);

  const toggleSelectAll = () => {
    if (selectedTemplateNames.size === filteredTemplates.length) {
      setSelectedTemplateNames(new Set());
    } else {
      setSelectedTemplateNames(new Set(filteredTemplates.map(t => t.name)));
    }
  };

  const executeBulkDeploy = async () => {
    if (selectedTemplateNames.size === 0) return;
    setIsDeploying(true);
    try {
      const names = Array.from(selectedTemplateNames);
      await Promise.all(names.map(name => 
        api.tasks.deploy({
          agent_key: agentKey,
          service_name: name, // Defaulting instance name to template name
          template_name: name
        })
      ));
      setIsDeployModalOpen(false);
      onNavigate('/tasks');
    } catch (err: any) {
      alert(err.message || "Bulk deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <RefreshCw className="animate-spin text-blue-500" size={32} />
      <p className="text-gray-500 font-medium font-bold uppercase tracking-widest text-[10px]">Aggregating agent telemetry...</p>
    </div>
  );

  if (!agent) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-gray-200">
      <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
      <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Node Communication Failure</h2>
      <button onClick={onBack} className="mt-4 text-blue-600 font-black flex items-center gap-2 mx-auto uppercase tracking-widest text-xs">
        <ArrowLeft size={16} /> Return to Cluster List
      </button>
    </div>
  );

  const sys = agent.system_info || {};
  const formatted = sys.formatted || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-md active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{agent.hostname}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                agent.status === 'online' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              }`}>
                {agent.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-bold text-gray-400">
              <div className="flex items-center gap-1.5">
                <Globe size={14} className="text-gray-300" /> {agent.ip_address}
              </div>
              <span className="text-gray-200 mx-1 hidden md:block">|</span>
              <div className="flex items-center gap-1.5">
                <Box size={14} className="text-gray-300" /> Workspace: {agent.workspace_id}
              </div>
              <span className="text-gray-200 mx-1 hidden md:block">|</span>
              <div className="flex items-center gap-1.5 text-blue-500/70 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/50">
                <Tag size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">v{formatted.nacos_agent_version || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={agent.status !== 'online'}
            onClick={handleOpenDeploy}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            <Plus size={18} />
            <span>Deploy Service</span>
          </button>
          <div className="hidden sm:flex flex-col text-right px-4 border-l border-r border-gray-200">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Check-in</span>
            <span className="text-xs font-bold text-gray-600">
              {agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'N/A'}
            </span>
          </div>
          <button 
            onClick={fetchAgentData} 
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span>Force Sync</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-gray-100 rounded-2xl border border-gray-200 no-scrollbar">
        <TabButton id="overview" current={activeTab} onClick={() => setActiveTab('overview')} icon={BarChart3} label="Overview" />
        <TabButton id="resources" current={activeTab} onClick={() => setActiveTab('resources')} icon={Monitor} label="Telemetry" />
        <TabButton id="services" current={activeTab} onClick={() => setActiveTab('services')} icon={Terminal} label="Services" />
        <TabButton id="processes" current={activeTab} onClick={() => setActiveTab('processes')} icon={List} label="Processes" />
        <TabButton id="network" current={activeTab} onClick={() => setActiveTab('network')} icon={Network} label="Network" />
        <TabButton id="docker" current={activeTab} onClick={() => setActiveTab('docker')} icon={Box} label="Docker" />
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Core Vital Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Uptime" value={formatted.uptime || 'N/A'} icon={Clock} color="blue" />
                <StatCard label="CPU Model" value={sys.cpu?.model} icon={Cpu} color="indigo" size="small" />
                <StatCard label="Architecture" value={sys.architecture} icon={Server} color="amber" />
              </div>
              
              {/* Quick Health Chart */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <Activity size={14} className="text-blue-500" /> Performance Snapshot
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <MetricDisplay 
                    label="CPU Usage" 
                    value={sys.cpu?.usage_percent} 
                    icon={Cpu} 
                    color="blue" 
                    subtext={`LA: ${sys.cpu?.load_average_1min?.toFixed(2)} / ${sys.cpu?.load_average_5min?.toFixed(2)}`}
                  />
                  <MetricDisplay 
                    label="Memory Usage" 
                    value={sys.memory?.usage_percent} 
                    icon={Database} 
                    color="purple" 
                    subtext={`${formatted.memory?.used || '0'} / ${formatted.memory?.total || '0'}`}
                  />
                </div>
              </div>

              {/* Service Quick View */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Terminal size={14} className="text-emerald-500" /> Active Service Units
                </h3>
                {agent.services?.length > 0 ? (
                  <div className="space-y-2">
                    {agent.services.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-emerald-50/50 transition-colors">
                        <span className="text-sm font-bold text-gray-700">{s.name}</span>
                        <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Running</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 italic text-sm">No services deployed on this node.</div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Info size={14} className="text-indigo-500" /> Software Stack
                </h3>
                <div className="space-y-4">
                  <InfoRow label="Operating System" value={sys.os_version} />
                  <InfoRow label="Kernel Version" value={sys.kernel_version} />
                  <InfoRow label="Distro" value={sys.os_name} />
                  <InfoRow label="Release" value={sys.os_release} />
                  <InfoRow label="Boot Time" value={new Date(sys.boot_time).toLocaleString()} />
                </div>
              </div>

              <div className="bg-indigo-900 p-8 rounded-3xl shadow-xl shadow-indigo-900/20 text-white">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Globe size={14} /> Network Context
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Interface IP</span>
                    <span className="text-xs font-mono font-bold text-white">{agent.ip_address}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Worker POD</span>
                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">{agent.pod_id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed CPU and Load */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Cpu size={14} className="text-blue-500" /> Processor Insight
              </h3>
              <div className="space-y-8">
                <MetricDisplay 
                  label="CPU Load" 
                  value={sys.cpu?.usage_percent} 
                  icon={Cpu} 
                  color="blue" 
                  subtext={`${sys.cpu?.logical_cores} Cores @ ${sys.cpu?.frequency_current} MHz`}
                />
                <div className="grid grid-cols-3 gap-4">
                  <LoadIndicator label="Load 1m" value={sys.cpu?.load_average_1min} />
                  <LoadIndicator label="Load 5m" value={sys.cpu?.load_average_5min} />
                  <LoadIndicator label="Load 15m" value={sys.cpu?.load_average_15min} />
                </div>
              </div>
            </div>

            {/* Detailed Memory and Swap */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Database size={14} className="text-purple-500" /> Memory Allocation
              </h3>
              <div className="space-y-8">
                <MetricDisplay 
                  label="Physical RAM" 
                  value={sys.memory?.usage_percent} 
                  icon={Database} 
                  color="purple" 
                  subtext={`Available: ${formatted.memory?.available}`}
                />
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span>Virtual Swap</span>
                    <span>{sys.memory?.swap_usage_percent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${sys.memory?.swap_usage_percent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Partitions */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <HardDrive size={14} className="text-amber-500" /> Mounted Storage Volumes
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Device</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Format</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sys.disks?.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-600">{d.device}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">{d.mountpoint}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{d.fstype}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{formatted.disks?.[idx]?.total}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-700 ${d.usage_percent > 85 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${d.usage_percent}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-gray-500">{d.usage_percent}%</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
             <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Terminal size={14} className="text-emerald-500" /> Container Orchestration
               </h3>
               <button onClick={fetchAgentData} className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                 <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Sync Status
               </button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stack Name</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deployment Path</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">State</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Operations</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {agent.services?.length === 0 ? (
                     <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic text-sm">No managed services found on this agent.</td></tr>
                   ) : agent.services.map((s: any, idx: number) => (
                     <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                       <td className="px-6 py-4">
                         <span className="text-sm font-black text-gray-900">{s.name}</span>
                       </td>
                       <td className="px-6 py-4">
                         <span className="text-[10px] font-mono text-gray-400 tracking-tighter">{s.path}</span>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            s.status === 'running' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {s.status}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => showLogs(s.name)}
                             className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                             title="Logs"
                           >
                             <Terminal size={18} />
                           </button>
                           {s.status === 'running' ? (
                             <>
                               <button 
                                 onClick={() => handleServiceAction(s.name, 'restart')}
                                 className="p-2 text-gray-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all"
                                 title="Restart"
                               >
                                 <RotateCcw size={18} />
                               </button>
                               <button 
                                 onClick={() => handleServiceAction(s.name, 'stop')}
                                 className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                 title="Stop"
                               >
                                 <Square size={18} fill="currentColor" />
                               </button>
                             </>
                           ) : (
                             <button 
                               onClick={() => handleServiceAction(s.name, 'start')}
                               className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
                               title="Start"
                             >
                               <Play size={18} fill="currentColor" />
                             </button>
                           )}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Other tabs follow similar polished pattern ... */}
        {activeTab === 'processes' && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-50 bg-gray-50/50">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <List size={14} className="text-indigo-500" /> Active Workload Monitor (Top 10)
               </h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PID</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Process</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CPU%</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">MEM%</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">State</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Command Line</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {sys.processes_top?.map((p: any) => (
                     <tr key={p.pid} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500">{p.pid}</td>
                       <td className="px-6 py-4 text-xs font-black text-gray-900">{p.name}</td>
                       <td className="px-6 py-4 text-xs font-bold text-blue-600">{p.cpu_percent}%</td>
                       <td className="px-6 py-4 text-xs font-bold text-purple-600">{p.memory_percent?.toFixed(1)}%</td>
                       <td className="px-6 py-4">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.status}</span>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-[10px] font-mono text-gray-400 truncate max-w-[250px] block" title={p.cmdline?.join(' ')}>
                            {p.cmdline?.join(' ') || '--'}
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Tab content for network and docker skipped for brevity as they remain consistent with the above refinement */}
        {activeTab === 'network' && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-50">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Network size={14} className="text-indigo-500" /> Interface Diagnostics
               </h3>
             </div>
             <table className="w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-100">
                 <tr>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Interface</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">IP Address</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Traffic (TX/RX)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {sys.network_interfaces?.map((nic: any, idx: number) => (
                   <tr key={idx} className="hover:bg-gray-50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-gray-900">{nic.name}</span>
                           <span className="text-[9px] font-mono text-gray-400">{nic.mac_address}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-gray-700">{nic.ip_address}</span>
                           <span className="text-[9px] text-gray-400">Mask: {nic.netmask}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          nic.is_up ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {nic.is_up ? 'Link Up' : 'Down'}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-[10px] font-bold text-gray-500">TX: {(nic.bytes_sent / 1024 / 1024).toFixed(1)} MB</span>
                           <span className="text-[10px] font-bold text-gray-500">RX: {(nic.bytes_recv / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'docker' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Docker Engine</h3>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${sys.docker?.is_docker_available ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-300'}`} />
                      <span className="text-xl font-black text-gray-900">{sys.docker?.is_docker_available ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </div>
                  {sys.docker?.version && (
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-xl uppercase">Version {sys.docker.version}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Containers</div>
                    <div className="text-lg font-black text-gray-900">{sys.docker?.containers_total}</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="text-[10px] font-black text-emerald-800 uppercase mb-1 text-opacity-50">Running</div>
                    <div className="text-lg font-black text-emerald-700">{sys.docker?.containers_running}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Images</div>
                    <div className="text-lg font-black text-gray-900">{sys.docker?.images_total}</div>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="text-[10px] font-black text-indigo-800 uppercase mb-1 text-opacity-50">Storage</div>
                    <div className="text-lg font-black text-indigo-700">{formatted.docker?.images_size}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Engine Configuration</h3>
                <div className="space-y-4">
                  <InfoRow label="API Version" value={sys.docker?.api_version} />
                  <InfoRow label="Root Directory" value={sys.docker?.docker_root_dir} />
                  <InfoRow label="Networks" value={sys.docker?.networks_total?.toString()} />
                  <InfoRow label="Volumes" value={sys.docker?.volumes_total?.toString()} />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/20">
               <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6">Execution Summary</h3>
               <div className="space-y-6">
                 <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[40px] font-black text-white mb-1">{sys.docker?.containers_total}</div>
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Managed Resources</div>
                 </div>
                 <p className="text-xs leading-relaxed text-white/60">
                   The Docker engine on this node is currently managing {sys.docker?.containers_running} active workloads. 
                   Cluster synchronization is performing normally.
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Modal Overlay */}
      {serviceLogs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-white text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <Terminal className="text-blue-500" /> Remote Log Tty: {serviceLogs.name}
              </h2>
              <button onClick={() => setServiceLogs(null)} className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 p-8 font-mono text-[12px] overflow-y-auto text-slate-300 bg-slate-950/50 custom-scrollbar">
              {serviceLogs.content ? (
                serviceLogs.content.split('\n').map((line, i) => (
                  <div key={i} className="py-0.5 border-l-2 border-white/5 pl-4 hover:bg-white/5 transition-colors">
                    <span className="text-slate-600 mr-4 select-none inline-block w-8 text-right font-bold">{i+1}</span>
                    <span className="whitespace-pre-wrap">{line}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                  <RotateCcw className="animate-spin" />
                  <div className="italic text-sm font-bold uppercase tracking-widest">Streaming buffer from agent...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deployment Modal Overlay */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Deploy to {agent.hostname}</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Batch selection of blueprints for node: {agent.ip_address}</p>
              </div>
              <button onClick={() => setIsDeployModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter service blueprints by name or description..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-gray-700"
                />
              </div>

              <div className="flex-1 border border-gray-100 rounded-3xl overflow-hidden flex flex-col bg-gray-50/30">
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/80 sticky top-0 z-10 border-b border-gray-100 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 w-12">
                          <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600 transition-colors">
                            {selectedTemplateNames.size === filteredTemplates.length && filteredTemplates.length > 0 
                              ? <CheckSquare size={20} className="text-indigo-600" /> 
                              : <Square size={20} />
                            }
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Blueprint Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {filteredTemplates.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">No blueprints found in library matching your search.</td></tr>
                      ) : filteredTemplates.map((tpl) => {
                        const isSelected = selectedTemplateNames.has(tpl.name);
                        return (
                          <tr 
                            key={tpl.name} 
                            onClick={() => toggleTemplate(tpl.name)}
                            className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} className="text-gray-300" />}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-indigo-500">
                                  <FileCode size={18} />
                                </div>
                                <span className="font-bold text-gray-900">{tpl.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${tpl.type === 'yaml' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {tpl.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-500 truncate max-w-xs">{tpl.description || 'No description provided'}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Play size={20} fill="currentColor" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900 uppercase">Deployment Summary</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Ready to initiate {selectedTemplateNames.size} blueprints for node {agent.hostname}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setIsDeployModalOpen(false)} className="flex-1 sm:flex-none px-8 py-3.5 border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button 
                  onClick={executeBulkDeploy}
                  disabled={isDeploying || selectedTemplateNames.size === 0}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeploying ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Deployment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Helper Components
const TabButton = ({ id, current, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
      current === id 
        ? 'bg-white text-blue-600 shadow-sm' 
        : 'text-gray-500 hover:text-gray-900'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, size = 'medium' }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center border border-${color}-100`}>
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</h4>
      <p className={`${size === 'small' ? 'text-xs' : 'text-sm'} font-black text-gray-900 mt-0.5`}>{value || '--'}</p>
    </div>
  </div>
);

const MetricDisplay = ({ label, value, icon: Icon, color, subtext }: any) => (
  <div className="flex flex-col gap-6">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center border border-${color}-100 shadow-sm`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-gray-900">{typeof value === 'number' ? value.toFixed(1) : value}%</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">utilization</span>
        </div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
        <div 
          className={`h-full bg-${color}-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(59,130,246,0.3)]`} 
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }} 
        />
      </div>
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">{subtext}</p>
    </div>
  </div>
);

const LoadIndicator = ({ label, value }: { label: string, value: number }) => (
  <div className="text-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
    <div className="text-[9px] font-black text-gray-400 uppercase mb-1">{label}</div>
    <div className="text-sm font-black text-gray-900">{value?.toFixed(2) || '0.00'}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold text-gray-700 truncate max-w-[180px]">{value || '--'}</span>
  </div>
);

export default AgentDetail;
