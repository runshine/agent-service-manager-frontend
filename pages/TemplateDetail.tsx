
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { ServiceTemplate, AgentInfo } from '../types';
import { 
  ArrowLeft, 
  FileText, 
  Info, 
  Edit3, 
  Save, 
  Download, 
  Trash2, 
  Loader2, 
  RefreshCw,
  X,
  Code,
  Play,
  CheckSquare,
  Square,
  Search,
  Server,
  Activity,
  Folder,
  File,
  ChevronRight,
  ChevronLeft,
  FileCode,
  Upload,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';

interface TemplateDetailProps {
  templateName: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

interface TemplateFile {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
}

const TemplateDetail: React.FC<TemplateDetailProps> = ({ templateName, onBack, onNavigate }) => {
  const [template, setTemplate] = useState<ServiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  
  // File Explorer State
  const [currentFiles, setCurrentFiles] = useState<TemplateFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // File Content / Editor State
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; info: any } | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Deletion State
  const [fileToDelete, setFileToDelete] = useState<TemplateFile | null>(null);
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  // Deployment Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgentKeys, setSelectedAgentKeys] = useState<Set<string>>(new Set());
  const [batchServiceName, setBatchServiceName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const fetchTemplateDetail = async () => {
    try {
      setLoading(true);
      const tplRes = await api.templates.get(templateName);
      setTemplate(tplRes);
      setBatchServiceName(tplRes.name);
    } catch (err: any) {
      console.error("Failed to fetch template detail", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (path: string = '') => {
    try {
      setLoadingFiles(true);
      const res = await api.templates.files.list(templateName, path);
      setCurrentFiles(res.files || []);
      setCurrentPath(path);
    } catch (err: any) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchFileContent = async (filePath: string) => {
    try {
      setLoadingContent(true);
      setIsEditing(false);
      const res = await api.templates.files.getContent(templateName, filePath);
      setSelectedFile({
        path: filePath,
        content: res.content || '',
        info: res.file_info
      });
      setEditContent(res.content || '');
    } catch (err: any) {
      alert("Failed to load file content. It might be a binary file or too large.");
      console.error(err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      setIsSaving(true);
      await api.templates.files.updateContent(templateName, {
        path: selectedFile.path,
        content: editContent
      });
      setSelectedFile({ ...selectedFile, content: editContent });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!fileToDelete) return;
    setIsDeletingAsset(true);
    try {
      if (fileToDelete.is_directory) {
        await api.templates.files.deleteDirectory(templateName, fileToDelete.path, isForceDelete);
      } else {
        await api.templates.files.deleteFile(templateName, fileToDelete.path);
      }
      
      // If we deleted the currently selected file, clear the editor
      if (selectedFile?.path === fileToDelete.path) {
        setSelectedFile(null);
      }
      
      setFileToDelete(null);
      setIsForceDelete(false);
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message || "Deletion failed. Note: Non-empty directories require 'force' delete.");
    } finally {
      setIsDeletingAsset(false);
    }
  };

  const handleDownloadFile = (filePath: string) => {
    api.templates.files.download(templateName, filePath);
  };

  const fetchAgents = async () => {
    try {
      const res = await api.agents.list(1, 1000);
      setAgents(res.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  };

  useEffect(() => {
    fetchTemplateDetail();
    fetchFiles();
  }, [templateName]);

  const toggleAgent = (key: string) => {
    const next = new Set(selectedAgentKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedAgentKeys(next);
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(a => 
      a.hostname.toLowerCase().includes(agentSearch.toLowerCase()) || 
      a.ip_address.includes(agentSearch)
    );
  }, [agents, agentSearch]);

  const executeBulkDeploy = async () => {
    if (selectedAgentKeys.size === 0 || !batchServiceName) return;
    setIsDeploying(true);
    try {
      const keys = Array.from(selectedAgentKeys);
      await Promise.all(keys.map(key => 
        api.tasks.deploy({
          agent_key: key,
          service_name: batchServiceName,
          template_name: templateName
        })
      ));
      setIsDeployModalOpen(false);
      onNavigate('/tasks');
    } catch (err: any) {
      alert(err.message || "Batch deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Accessing blueprint directory...</p>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{templateName}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                template?.type === 'yaml' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {template?.type || 'Blueprint'}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 mt-0.5">{template?.description || 'Managed Template Source'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchAgents(); setIsDeployModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Play size={16} fill="currentColor" />
            Deploy to Cluster
          </button>
          <button
            onClick={() => api.templates.download(templateName)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export Template
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-[600px]">
        {/* File Explorer (Left) */}
        <div className="w-80 bg-white rounded-[2rem] border border-gray-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Folder size={14} className="text-blue-500" /> Explorer
            </h3>
            <button onClick={() => fetchFiles(currentPath)} className="text-gray-400 hover:text-blue-600">
              <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
            {/* Breadcrumbs for navigation */}
            {currentPath && (
              <button 
                onClick={() => {
                  const parts = currentPath.split('/');
                  parts.pop();
                  fetchFiles(parts.join('/'));
                }}
                className="w-full text-left px-6 py-3 flex items-center gap-3 text-sm font-black text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <ChevronLeft size={16} />
                <span>.. / {currentPath}</span>
              </button>
            )}

            {currentFiles.length === 0 && !loadingFiles ? (
              <div className="px-6 py-10 text-center text-gray-400 text-xs italic">No files in directory</div>
            ) : (
              currentFiles.map((file, idx) => (
                <div key={idx} className="group relative">
                  <button
                    onClick={() => {
                      if (file.is_directory) fetchFiles(file.path);
                      else fetchFileContent(file.path);
                    }}
                    className={`w-full text-left px-6 py-3 flex items-center justify-between transition-colors ${
                      selectedFile?.path === file.path ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-8">
                      {file.is_directory ? (
                        <Folder size={18} className="text-amber-400 shrink-0" />
                      ) : (
                        <FileCode size={18} className="text-blue-400 shrink-0" />
                      )}
                      <span className="text-sm font-bold truncate">{file.name}</span>
                    </div>
                    {file.is_directory && <ChevronRight size={14} className="text-gray-300" />}
                  </button>
                  {/* Delete button appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-white shadow-sm border border-transparent hover:border-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/30">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Managed Assets</div>
          </div>
        </div>

        {/* Editor Area (Right) */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {selectedFile ? (
            <div className="flex flex-col h-full">
              {/* Editor Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <File size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">{selectedFile.path}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {selectedFile.info?.is_text ? 'Text Source' : 'Binary File'} • {(selectedFile.info?.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDownloadFile(selectedFile.path)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Download File"
                  >
                    <Download size={20} />
                  </button>
                  
                  {selectedFile.info?.is_text && (
                    <div className="h-6 w-[1px] bg-gray-200 mx-2" />
                  )}

                  {selectedFile.info?.is_text && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isEditing) handleSaveFile();
                          else setIsEditing(true);
                        }}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isEditing 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isEditing ? (
                          <Save size={14} />
                        ) : (
                          <Unlock size={14} />
                        )}
                        {isEditing ? 'Save Changes' : 'Enter Edit Mode'}
                      </button>
                      
                      {isEditing && (
                        <button
                          onClick={() => { setIsEditing(false); setEditContent(selectedFile.content); }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 relative overflow-hidden bg-slate-950">
                {loadingContent ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hydrating editor...</span>
                  </div>
                ) : !selectedFile.info?.is_text ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <Lock size={48} className="opacity-20" />
                    <div className="text-center">
                      <p className="text-sm font-black uppercase tracking-widest">Binary Content</p>
                      <p className="text-xs mt-2 opacity-60">This file type cannot be edited online.</p>
                      <button 
                        onClick={() => handleDownloadFile(selectedFile.path)}
                        className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                      >
                        Download for local editing
                      </button>
                    </div>
                  </div>
                ) : (
                  <textarea
                    readOnly={!isEditing}
                    value={isEditing ? editContent : selectedFile.content}
                    onChange={(e) => setEditContent(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full p-10 bg-transparent text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar selection:bg-blue-500/30"
                  />
                )}
                
                {/* Visual line counter bar */}
                <div className="absolute top-0 left-0 w-12 h-full bg-slate-900/50 border-r border-white/5 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-300 mb-6 border border-gray-100">
                <FileCode size={40} />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Source Manager</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-sm font-medium leading-relaxed">
                Select a file from the explorer to view or modify its contents. Binary files can be downloaded.
              </p>
              
              <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left">
                   <Code size={20} className="text-indigo-500 mb-3" />
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Format Support</div>
                   <div className="text-sm font-bold text-gray-700 mt-1">YAML, JSON, JS, Shell</div>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left">
                   <Activity size={20} className="text-emerald-500 mb-3" />
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sync Logic</div>
                   <div className="text-sm font-bold text-gray-700 mt-1">Archive Hot-swapping</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Deletion Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-red-100 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-50 bg-red-50/50 flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase">Confirm Delete</h2>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Asset Removal</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-gray-600 font-bold leading-relaxed">
                Delete {fileToDelete.is_directory ? 'directory' : 'file'} <span className="text-red-600 font-black">"{fileToDelete.path}"</span>?
              </p>
              
              {fileToDelete.is_directory && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <input
                    type="checkbox"
                    id="forceDelete"
                    checked={isForceDelete}
                    onChange={(e) => setIsForceDelete(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="forceDelete" className="text-xs font-bold text-amber-800 cursor-pointer">
                    Force delete (if directory is not empty)
                  </label>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => { setFileToDelete(null); setIsForceDelete(false); }} 
                  className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAsset} 
                  disabled={isDeletingAsset}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingAsset ? <Loader2 size={16} className="animate-spin" /> : 'Delete Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cluster Deployment</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Select target nodes for "{templateName}"</p>
              </div>
              <button onClick={() => setIsDeployModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instance Service Name</label>
                  <input
                    type="text"
                    placeholder="e.g., prod-stack-01"
                    value={batchServiceName}
                    onChange={(e) => setBatchServiceName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-900"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filter nodes..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-gray-700"
                  />
                </div>
              </div>

              <div className="flex-1 border border-gray-100 rounded-3xl overflow-hidden flex flex-col bg-gray-50/30">
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/80 sticky top-0 z-10 border-b border-gray-100 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 w-12">
                          <button onClick={() => {
                            if (selectedAgentKeys.size === filteredAgents.length) setSelectedAgentKeys(new Set());
                            else setSelectedAgentKeys(new Set(filteredAgents.map(a => a.key)));
                          }} className="text-gray-400 hover:text-blue-600">
                            {selectedAgentKeys.size === filteredAgents.length && filteredAgents.length > 0 
                              ? <CheckSquare size={20} className="text-blue-600" /> 
                              : <Square size={20} />
                            }
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Node</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">IP Context</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {filteredAgents.map((agent) => {
                        const isSelected = selectedAgentKeys.has(agent.key);
                        return (
                          <tr 
                            key={agent.key} 
                            onClick={() => toggleAgent(agent.key)}
                            className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-gray-300" />}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-500">
                                  <Server size={18} />
                                </div>
                                <span className="font-bold text-gray-900">{agent.hostname}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono font-bold text-gray-500">{agent.ip_address}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${agent.status === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                 {agent.status}
                               </span>
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
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Play size={20} fill="currentColor" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900 uppercase">Batch Manifest</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Ready to scale {selectedAgentKeys.size} instance(s)
                  </div>
                </div>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setIsDeployModalOpen(false)} className="px-8 py-3.5 border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100">
                  Cancel
                </button>
                <button 
                  onClick={executeBulkDeploy}
                  disabled={isDeploying || selectedAgentKeys.size === 0 || !batchServiceName}
                  className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl disabled:opacity-50"
                >
                  {isDeploying ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Deploy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDetail;
