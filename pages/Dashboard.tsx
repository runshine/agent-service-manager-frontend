
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AgentInfo } from '../types';
import { Server, FileCode, CheckCircle, Activity, ChevronRight } from 'lucide-react';

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
    { name: 'Templates', value: stats.templates, icon: FileCode, color: 'bg-indigo-500', subtitle: 'Docker Compose', path: '/templates' },
    { name: 'Running Tasks', value: stats.runningTasks, icon: Activity, color: 'bg-amber-500', subtitle: 'Deployment status', path: '/tasks' },
    { name: 'Health Status', value: '100%', icon: CheckCircle, color: 'bg-emerald-500', subtitle: 'System operational', path: null },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">Synchronizing cluster data...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-gray-500">Monitor your distributed docker services and infrastructure.</p>
        </div>
        {workspaceId && (
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 uppercase tracking-wider">
            Viewing: {workspaceId}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const isClickable = !!card.path;
          return (
            <div 
              key={card.name} 
              onClick={() => isClickable && onNavigate(card.path!)}
              className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all duration-200 group ${
                isClickable 
                ? 'cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.98]' 
                : 'cursor-default'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`${card.color} p-3 rounded-lg text-white shadow-lg shadow-${card.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
                  <card.icon size={24} />
                </div>
                {isClickable && (
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{card.name}</h3>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 font-medium">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            System Notifications
          </h2>
          <div className="space-y-4">
             <div className="flex gap-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md">
                <div className="text-blue-600 font-bold text-sm">INFO</div>
                <div className="text-sm text-blue-700">Agent discovery synchronized with Nacos registry successfully.</div>
             </div>
             <div className="flex gap-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-md">
                <div className="text-amber-600 font-bold text-sm">WARN</div>
                <div className="text-sm text-amber-700">Periodic status check completed for workspace {workspaceId || 'Default'}.</div>
             </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="text-sm text-gray-500 italic">Historical logs and recent deployment successes for {workspaceId || 'all agents'} will appear here.</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
