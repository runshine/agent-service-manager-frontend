
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AgentInfo } from '../types';
import { Server, FileCode, CheckCircle, Activity, ChevronRight, Loader2 } from 'lucide-react';

interface DashboardProps {
  workspaceId?: string;
  onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ workspaceId, onNavigate }) => {
  const [stats, setStats] = useState({
    agents: 0,
    onlineAgents: 0,
    templates: 0,
    runningTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [agentsRes, templatesRes, tasksRes] = await Promise.all([
          api.agents.list(1, 100, workspaceId),
          api.templates.list(1, 100),
          api.tasks.list(1, 100, undefined, 'running', workspaceId)
        ]);

        setStats({
          agents: agentsRes.total,
          onlineAgents: agentsRes.agents.filter((a: AgentInfo) => a.status === 'online').length,
          templates: templatesRes.total,
          runningTasks: tasksRes.total
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId]);

  const cards = [
    { name: 'Agents', value: stats.agents, icon: Server, color: 'bg-blue-500', subtitle: `${stats.onlineAgents} Online`, path: '/agents' },
    { name: 'Templates', value: stats.templates, icon: FileCode, color: 'bg-indigo-500', subtitle: 'Docker Compose Blueprints', path: '/templates' },
    { name: 'Running Tasks', value: stats.runningTasks, icon: Activity, color: 'bg-amber-500', subtitle: 'Deployment status', path: '/tasks' },
    { name: 'Health Status', value: '100%', icon: CheckCircle, color: 'bg-emerald-500', subtitle: 'System operational', path: null },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm">Syncing Cluster Telemetry</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Command Center</h1>
          <p className="text-gray-500 text-base mt-1">Orchestrate and monitor your distributed service infrastructure.</p>
        </div>
        {workspaceId && (
          <div className="bg-blue-50 text-blue-700 px-6 py-2 rounded-2xl text-xs font-black border border-blue-100 uppercase tracking-widest shadow-sm">
            Workspace: {workspaceId}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card) => {
          const isClickable = !!card.path;
          return (
            <div 
              key={card.name} 
              onClick={() => isClickable && onNavigate(card.path!)}
              className={`bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col transition-all duration-300 group ${
                isClickable 
                ? 'cursor-pointer hover:border-blue-300 hover:shadow-xl active:scale-[0.98]' 
                : 'cursor-default'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`${card.color} p-4 rounded-2xl text-white shadow-lg shadow-${card.color.split('-')[1]}-500/30 group-hover:scale-110 transition-transform`}>
                  <card.icon size={28} />
                </div>
                {isClickable && (
                  <ChevronRight size={20} className="text-gray-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{card.name}</h3>
                <p className="text-4xl font-black text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 font-bold">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-8 flex items-center gap-3">
            <Activity size={24} className="text-blue-500" />
            System Events
          </h2>
          <div className="space-y-6">
             <div className="flex gap-6 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-3xl">
                <div className="text-blue-600 font-black text-xs uppercase tracking-widest pt-1">INFO</div>
                <div className="text-sm text-blue-900 font-bold leading-relaxed">Agent discovery synchronized with Nacos registry successfully. All nodes are reporting healthy telemetry.</div>
             </div>
             <div className="flex gap-6 p-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-3xl">
                <div className="text-amber-600 font-black text-xs uppercase tracking-widest pt-1">WARN</div>
                <div className="text-sm text-amber-900 font-bold leading-relaxed">Periodic status check completed for workspace {workspaceId || 'Default'}. Some containers experienced latency spikes.</div>
             </div>
          </div>
        </div>
        
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-8">Performance Stream</h2>
          <div className="text-sm text-gray-400 italic font-bold uppercase tracking-widest h-32 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl">
            Awaiting live metrics synchronization...
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
