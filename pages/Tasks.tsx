
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../api';
import { TaskInfo } from '../types';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  List, 
  RefreshCw,
  Square,
  CheckSquare,
  X,
  Terminal,
  Maximize2,
  Minimize2,
  Download,
  Search as SearchIcon,
  ArrowDownCircle,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';

interface TasksProps {
  workspaceId?: string;
}

const Tasks: React.FC<TasksProps> = ({ workspaceId }) => {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskInfo | null>(null);
  const [taskLogs, setTaskLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Selection & UI state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isFullscreenLog, setIsFullscreenLog] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Deletion Modal State
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    targets: TaskInfo[];
  }>({ show: false, targets: [] });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchTasks = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.tasks.list(1, 100, undefined, undefined, workspaceId);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [workspaceId]);

  const fetchLogs = useCallback(async (taskId: string) => {
    try {
      if (taskLogs.length === 0) setLoadingLogs(true);
      const res = await api.tasks.getLogs(taskId, 1, 2000);
      const rawLogs = res.logs || [];
      
      let processedLogs: string[] = [];
      if (Array.isArray(rawLogs)) {
        processedLogs = rawLogs.map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour12: false }) : '';
            const level = item.level ? `[${String(item.level).toUpperCase()}]` : '';
            const msg = item.message || '';
            return `${time ? `[${time}] ` : ''}${level} ${msg}`.trim();
          }
          return String(item);
        });
      } else if (typeof rawLogs === 'string') {
        processedLogs = rawLogs.split('\n');
      }
      setTaskLogs(processedLogs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [taskLogs.length]);

  useEffect(() => {
    fetchTasks(true);
    const timer = setInterval(() => fetchTasks(false), 10000); 
    return () => clearInterval(timer);
  }, [fetchTasks]);

  useEffect(() => {
    if (selectedTask) {
      fetchLogs(selectedTask.task_id);
      let logInterval: any;
      if (selectedTask.status === 'running') {
        logInterval = setInterval(() => fetchLogs(selectedTask.task_id), 3000);
      }
      return () => { if (logInterval) clearInterval(logInterval); };
    } else {
      setTaskLogs([]);
      setLogSearchQuery('');
    }
  }, [selectedTask?.task_id, selectedTask?.status, fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [taskLogs, autoScroll]);

  const filteredLogs = useMemo(() => {
    if (!logSearchQuery) return taskLogs;
    const query = logSearchQuery.toLowerCase();
    return taskLogs.filter(line => line.toLowerCase().includes(query));
  }, [taskLogs, logSearchQuery]);

  const downloadLogs = () => {
    if (!selectedTask || taskLogs.length === 0) return;
    const blob = new Blob([taskLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-log-${selectedTask.service_name}-${selectedTask.task_id.substring(0, 8)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDeleteModal = (e: React.MouseEvent, targets: TaskInfo[]) => {
    e.stopPropagation();
    const nonRunning = targets.filter(t => t.status !== 'running');
    if (nonRunning.length === 0) {
      alert("Only completed or failed tasks can be deleted.");
      return;
    }
    setDeleteModal({ show: true, targets: nonRunning });
  };

  const executeDelete = async () => {
    setIsBatchDeleting(true);
    try {
      await Promise.all(deleteModal.targets.map(t => api.tasks.delete(t.task_id)));
      setSelectedTaskIds(new Set());
      if (selectedTask && deleteModal.targets.find(t => t.task_id === selectedTask.task_id)) {
        setSelectedTask(null);
      }
      setDeleteModal({ show: false, targets: [] });
      fetchTasks(true);
    } catch (err: any) {
      alert('Deletion error: ' + err.message);
    } finally {
      setIsBatchDeleting(false);
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
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <List className="text-blue-600" size={32} />
            Execution Archives
          </h1>
          <p className="text-gray-500 text-base font-bold mt-1">
            Audit trail and real-time tracing for distributed cluster operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {selectedTaskIds.size > 0 && (
            <button
              onClick={(e) => openDeleteModal(e, tasks.filter(t => selectedTaskIds.has(t.task_id)))}
              className="bg-red-50 text-red-600 border border-red-100 px-6 py-3 rounded-2xl flex items-center gap-3 transition-all hover:bg-red-100 font-black text-sm uppercase tracking-widest shadow-sm active:scale-95"
            >
              <Trash2 size={20} />
              <span>Purge Selected ({selectedTaskIds.size})</span>
            </button>
          )}
          <button 
            onClick={() => fetchTasks(true)} 
            className="p-3 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center gap-3"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Task List Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-5 w-16">
                  <button onClick={() => {
                    if (selectedTaskIds.size === tasks.length) setSelectedTaskIds(new Set());
                    else setSelectedTaskIds(new Set(tasks.map(t => t.task_id)));
                  }} className="text-gray-400 hover:text-blue-500 transition-colors">
                    {selectedTaskIds.size === tasks.length && tasks.length > 0 
                      ? <CheckSquare size={22} className="text-blue-500" /> 
                      : <Square size={22} />
                    }
                  </button>
                </th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status & Progress</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Service Entity</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Agent Node</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Lifecycle Log</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-40 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Retrieving audit buffers...</p>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-40 text-center">
                    <div className="flex flex-col items-center gap-6 text-gray-300">
                      <List size={48} className="opacity-20" />
                      <p className="text-sm font-black uppercase tracking-widest">Archival log is empty</p>
                    </div>
                  </td>
                </tr>
              ) : tasks.map((task) => {
                const S = (statusMap as any)[task.status] || statusMap.pending;
                const isSelected = selectedTask?.task_id === task.task_id;
                const isChecked = selectedTaskIds.has(task.task_id);

                return (
                  <tr 
                    key={task.task_id} 
                    className={`group hover:bg-blue-50/40 cursor-pointer transition-all border-l-[8px] ${isSelected ? 'bg-blue-50 border-blue-600' : 'border-transparent'}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <td className="px-8 py-6" onClick={(e) => {
                      e.stopPropagation();
                      const next = new Set(selectedTaskIds);
                      if (next.has(task.task_id)) next.delete(task.task_id);
                      else next.add(task.task_id);
                      setSelectedTaskIds(next);
                    }}>
                       {isChecked ? <CheckSquare size={22} className="text-blue-500" /> : <Square size={22} className="text-gray-200 group-hover:text-gray-300" />}
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-2xl w-fit border shadow-sm ${S.color}`}>
                          <S.icon size={16} className={task.status === 'running' ? 'animate-spin' : ''} />
                          <span className="text-xs font-black uppercase tracking-widest">{task.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                             <div className={`h-full transition-all duration-1000 ${task.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${task.progress}%` }} />
                          </div>
                          <span className="text-xs font-black text-gray-500">{task.progress}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-gray-900 flex items-center gap-2">
                          {task.service_name}
                          <ChevronRight size={18} className="text-gray-200 group-hover:text-blue-500 transition-all" />
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black tracking-widest uppercase border ${
                            task.task_type === 'deploy' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {task.task_type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800 uppercase tracking-widest">ID: {task.agent_key.substring(0, 12)}</span>
                          <span className="text-xs font-bold text-gray-400 mt-1 uppercase">Distributed Node</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{new Date(task.created_at).toLocaleString()}</span>
                          <span className="text-xs font-bold text-gray-400 mt-1 uppercase">Initiated moment</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                         disabled={task.status === 'running'}
                         onClick={(e) => openDeleteModal(e, [task])}
                         className={`p-3 rounded-2xl transition-all ${task.status !== 'running' ? 'text-gray-300 hover:text-red-600 hover:bg-red-50 hover:shadow-md' : 'text-gray-100 cursor-not-allowed'}`}
                       >
                         <Trash2 size={24} />
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliding Drawer for Logs (占据 60% 宽度) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300" 
            onClick={() => setSelectedTask(null)}
          />
          <div className={`absolute right-0 top-0 h-full bg-slate-950 shadow-2xl transition-transform duration-500 transform ${selectedTask ? 'translate-x-0' : 'translate-x-full'} ${isFullscreenLog ? 'w-full' : 'w-full lg:w-3/5'}`}>
             <div className="flex flex-col h-full">
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-10 py-6 bg-slate-900/80 border-b border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-600/20 rounded-2xl text-blue-400 shadow-xl shadow-blue-500/10">
                      <Terminal size={28} />
                    </div>
                    <div>
                      <h3 className="text-white text-base font-black uppercase tracking-[0.2em] mb-1">Tele-Audit Stream</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedTask.service_name} • SESSION_{selectedTask.task_id.substring(0, 8)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative group/search hidden xl:block">
                      <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-blue-400" />
                      <input 
                        type="text"
                        placeholder="Filter trace lines..."
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        className="bg-slate-800/40 border border-white/10 rounded-xl pl-11 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64 transition-all"
                      />
                    </div>
                    <button onClick={downloadLogs} className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl" title="Export Buffer">
                      <Download size={22} />
                    </button>
                    <button 
                      onClick={() => setAutoScroll(!autoScroll)} 
                      className={`p-3 rounded-xl transition-all ${autoScroll ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white'}`}
                      title="Auto-scroll"
                    >
                      <ArrowDownCircle size={22} />
                    </button>
                    <button onClick={() => setIsFullscreenLog(!isFullscreenLog)} className="p-3 text-slate-400 hover:text-white transition-colors hidden lg:block">
                      {isFullscreenLog ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                    </button>
                    <button onClick={() => setSelectedTask(null)} className="p-3 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors ml-4">
                      <X size={32} />
                    </button>
                  </div>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-10 font-mono text-[13px] leading-relaxed custom-scrollbar bg-slate-950/50">
                   <div className="space-y-1">
                    {loadingLogs && taskLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-600 animate-pulse">
                        <Loader2 size={32} className="animate-spin" />
                        <span className="uppercase font-black text-sm tracking-[0.3em]">Connecting to remote trace point...</span>
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="text-slate-600 italic py-10 text-center uppercase tracking-widest font-black opacity-30">
                        {logSearchQuery ? "No matches found in trace buffer." : "Awaiting initial agent feedback stream..."}
                      </div>
                    ) : (
                      filteredLogs.map((log, i) => (
                        <div key={i} className="flex gap-6 group/line hover:bg-white/5 px-4 py-1 rounded-lg transition-colors border-l border-white/5">
                          <span className="text-slate-800 select-none font-bold w-12 text-right shrink-0">{(i+1).toString().padStart(3, '0')}</span>
                          <span className={`text-slate-300 break-all whitespace-pre-wrap ${log.includes('[ERROR]') || log.toLowerCase().includes('failed') ? 'text-red-400' : log.includes('[WARN]') ? 'text-amber-400' : ''}`}>
                            {log}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                    
                    {selectedTask.status === 'running' && (
                      <div className="mt-12 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex items-center gap-6 text-blue-400 animate-pulse">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="font-black italic text-xs uppercase tracking-[0.3em]">Live Feed Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="px-10 py-4 bg-slate-900 border-t border-white/5 flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-8">
                    <span>Captured: {taskLogs.length} events</span>
                    <span className="text-slate-700">|</span>
                    <span className={selectedTask.status === 'success' ? 'text-emerald-500' : selectedTask.status === 'failed' ? 'text-red-500' : ''}>
                      State: {selectedTask.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Engine: Nacos-Distributed-v1</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (包含任务明细) */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-all" onClick={() => setDeleteModal({ show: false, targets: [] })} />
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-300 border border-red-100 relative z-[210]">
            <div className="p-10 border-b border-gray-50 bg-red-50/50 flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2rem] bg-red-100 flex items-center justify-center text-red-600 shadow-xl shadow-red-500/10">
                <AlertTriangle size={48} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Confirm Purge</h2>
                <p className="text-xs font-black text-red-500 uppercase tracking-[0.3em] mt-2">Irreversible System Operation</p>
              </div>
            </div>
            
            <div className="p-10 space-y-10">
              <div className="space-y-6">
                <p className="text-base text-gray-600 leading-relaxed font-bold">
                  You are about to permanently remove <span className="font-black text-red-600 underline underline-offset-4">{deleteModal.targets.length}</span> execution record(s) from the audit archive:
                </p>
                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 max-h-[320px] overflow-y-auto custom-scrollbar space-y-4">
                  {deleteModal.targets.map(t => (
                    <div key={t.task_id} className="flex items-center justify-between py-3 border-b border-gray-200/50 last:border-0">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-gray-900">{t.service_name}</span>
                        <span className="text-[10px] font-mono text-gray-400 uppercase font-black tracking-[0.1em] mt-1">{t.task_id}</span>
                      </div>
                      <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        t.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 p-5 bg-amber-50 rounded-[1.5rem] border border-amber-100 text-amber-700">
                  <Info size={20} className="shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest leading-relaxed">
                    This action will destroy all associated metadata, trace logs, and completion artifacts.
                  </span>
                </div>
              </div>

              <div className="flex gap-6">
                <button
                  onClick={() => setDeleteModal({ show: false, targets: [] })}
                  className="flex-1 px-8 py-5 border-2 border-gray-100 text-gray-500 rounded-[1.5rem] hover:bg-gray-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Discard Action
                </button>
                <button
                  disabled={isBatchDeleting}
                  onClick={executeDelete}
                  className="flex-1 px-8 py-5 bg-red-600 text-white rounded-[1.5rem] hover:bg-red-700 font-black text-xs uppercase tracking-widest shadow-2xl shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {isBatchDeleting ? <Loader2 size={20} className="animate-spin" /> : 'Confirm Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
