
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TaskInfo } from '../types';
import { Search, Loader2, CheckCircle2, XCircle, Clock, Trash2, List } from 'lucide-react';

interface TasksProps {
  workspaceId?: string;
}

const Tasks: React.FC<TasksProps> = ({ workspaceId }) => {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskInfo | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await api.tasks.list(1, 100, undefined, undefined, workspaceId);
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 5000); // Polling for progress
    return () => clearInterval(timer);
  }, [workspaceId]);

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete task record?')) return;
    try {
      await api.tasks.delete(id);
      if (selectedTask?.task_id === id) setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusMap = {
    pending: { color: 'text-gray-400 bg-gray-50 border-gray-100', icon: Clock },
    running: { color: 'text-blue-500 bg-blue-50 border-blue-100', icon: Loader2 },
    success: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
    failed: { color: 'text-red-500 bg-red-50 border-red-100', icon: XCircle },
    cancelled: { color: 'text-orange-500 bg-orange-50 border-orange-100', icon: XCircle },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Execution History</h1>
          <p className="text-gray-500">
            {workspaceId ? `Showing tasks for: ${workspaceId}` : 'Track asynchronous deployment jobs across all workspaces.'}
          </p>
        </div>
        <button onClick={fetchTasks} className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
          Refresh List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service / Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && tasks.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">Initializing task list...</td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">No tasks recorded for this selection.</td></tr>
                ) : tasks.map((task) => {
                  const S = (statusMap as any)[task.status] || statusMap.pending;
                  const isSelected = selectedTask?.task_id === task.task_id;
                  return (
                    <tr 
                      key={task.task_id} 
                      className={`hover:bg-blue-50/50 cursor-pointer transition-all border-l-4 ${isSelected ? 'bg-blue-50/70 border-blue-500' : 'border-transparent'}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 leading-tight">{task.service_name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-sm w-fit mt-1 uppercase font-bold tracking-tighter">
                            {task.task_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit border ${S.color}`}>
                          <S.icon size={12} className={task.status === 'running' ? 'animate-spin' : ''} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{task.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-gray-700">{task.progress}%</span>
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${task.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono mt-1">
                            {new Date(task.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden flex flex-col h-[700px] border border-slate-800">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <List size={14} className="text-blue-400" /> Remote Execution Log
            </h3>
            {selectedTask && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteTask(selectedTask.task_id); }}
                className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-all"
                title="Delete Record"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 p-5 font-mono text-[11px] overflow-y-auto space-y-2 text-slate-400 custom-scrollbar">
            {!selectedTask ? (
              <div className="text-slate-600 text-center mt-32 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center opacity-30">
                   <List size={24} />
                </div>
                <div className="italic text-xs font-bold uppercase tracking-widest">Select a session to view logs</div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1 mb-4 pb-4 border-b border-slate-800">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Session Summary</div>
                  <div className="text-blue-400">ID: {selectedTask.task_id}</div>
                  <div className="text-slate-300">Type: {selectedTask.task_type.toUpperCase()}</div>
                </div>
                
                <div className="space-y-1">
                  {(Array.isArray(selectedTask.logs) ? selectedTask.logs : []).map((log, i) => (
                    <div key={i} className="leading-relaxed flex gap-3">
                      <span className="text-slate-700 select-none">[{i+1}]</span>
                      <span className="text-slate-300 break-all">{log}</span>
                    </div>
                  ))}
                  
                  {selectedTask.status === 'running' && (
                    <div className="flex items-center gap-2 text-blue-400 animate-pulse mt-4">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="font-bold italic">Awaiting output from agent...</span>
                    </div>
                  )}
                  
                  {selectedTask.status === 'success' && (
                    <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 mt-4 rounded font-bold text-center">
                      ✓ EXECUTION COMPLETED SUCCESSFULLY
                    </div>
                  )}
                  
                  {selectedTask.status === 'failed' && (
                    <div className="p-2 bg-red-950/20 border border-red-900/30 text-red-400 mt-4 rounded font-bold">
                      ⚠ CRITICAL ERROR: {selectedTask.message || 'Unknown failure'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
