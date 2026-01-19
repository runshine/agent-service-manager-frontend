
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AgentInfo, ServiceTemplate } from '../types';
import { 
  RefreshCw, 
  Play, 
  Activity, 
  Search, 
  Cpu, 
  Database, 
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Box,
  Loader2,
  Tag
} from 'lucide-react';

interface AgentsProps {
  workspaceId?: string;
  onSelectAgent?: (key: string) => void;
}

const Agents: React.FC<AgentsProps> = ({ workspaceId, onSelectAgent }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const filteredAgents = agents.filter(a => 
    a.hostname.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.ip_address.includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={32} />
            Distributed Agents
          </h1>
          <p className="text-gray-500 text-base font-bold mt-1">Registry-synchronized node management and monitoring.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
            <input 
              type="text"
              placeholder="Search cluster nodes..."
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
            <span>Sync Registry</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Node Entity</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Agent Version</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Network Context</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">System Telemetry</th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-10 py-40 text-center">
                    <Loader2 className="animate-spin text-blue-600 inline-block" size={48} />
                    <p className="mt-4 text-sm font-black text-gray-400 uppercase tracking-widest">Querying Cluster Registry...</p>
                  </td>
                </tr>
              ) : filteredAgents.map((agent) => (
                <tr 
                  key={agent.key} 
                  className="group hover:bg-blue-50/40 cursor-pointer transition-all"
                  onClick={() => onSelectAgent?.(agent.key)}
                >
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-gray-300'}`} />
                      <span className={`text-xs font-black uppercase tracking-widest ${agent.status === 'online' ? 'text-emerald-700' : 'text-gray-400'}`}>{agent.status}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-gray-900">{agent.hostname}</span>
                      <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">ID: {agent.key.substring(0, 12)}...</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-xl border border-blue-100 flex items-center gap-2 w-fit">
                       <Tag size={12} /> {agent.system_info?.formatted?.nacos_agent_version || 'v1.0.0-native'}
                     </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-mono font-bold text-gray-800">{agent.ip_address}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">WS: {agent.workspace_id}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-8 min-w-[200px]">
                        <div className="flex-1 space-y-2">
                           <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>CPU</span><span>{agent.system_info?.cpu?.usage_percent || 0}%</span></div>
                           <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${agent.system_info?.cpu?.usage_percent || 0}%` }} /></div>
                        </div>
                        <div className="flex-1 space-y-2">
                           <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>RAM</span><span>{agent.system_info?.memory?.usage_percent || 0}%</span></div>
                           <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${agent.system_info?.memory?.usage_percent || 0}%` }} /></div>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm">
                      <ExternalLink size={24} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Agents;
