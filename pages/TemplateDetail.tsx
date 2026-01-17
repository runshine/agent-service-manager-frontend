
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
  Activity
} from 'lucide-react';

interface TemplateDetailProps {
  templateName: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const TemplateDetail: React.FC<TemplateDetailProps> = ({ templateName, onBack, onNavigate }) => {
  const [template, setTemplate] = useState<ServiceTemplate | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Deployment Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgentKeys, setSelectedAgentKeys] = useState<Set<string>>(new Set());
  const [batchServiceName, setBatchServiceName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const [tplRes, yamlRes] = await Promise.all([
        api.templates.get(templateName),
        api.templates.getYaml(templateName)
      ]);
      setTemplate(tplRes);
      setYamlContent(yamlRes.yaml_content || '');
      setBatchServiceName(tplRes.name); // Default service name to template name
    } catch (err: any) {
      console.error("Failed to fetch template details", err);
      alert(err.message || "Failed to load template");
    } finally {
      setLoading(false);
    }
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
    fetchDetail();
  }, [templateName]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.templates.updateYaml(templateName, yamlContent);
      setIsEditing(false);
      const tplRes = await api.templates.get(templateName);
      setTemplate(tplRes);
    } catch (err: any) {
      alert(err.message || "Failed to save YAML content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await api.templates.download(templateName);
    } catch (err: any) {
      alert(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${templateName}"? This cannot be undone.`)) return;
    try {
      setIsDeleting(true);
      await api.templates.delete(templateName);
      onBack();
    } catch (err: any) {
      alert(err.message || "Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDeploy = () => {
    fetchAgents();
    setIsDeployModalOpen(true);
    setSelectedAgentKeys(new Set());
  };

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

  const toggleSelectAll = () => {
    if (selectedAgentKeys.size === filteredAgents.length) {
      setSelectedAgentKeys(new Set());
    } else {
      setSelectedAgentKeys(new Set(filteredAgents.map(a => a.key)));
    }
  };

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-500">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="font-bold uppercase tracking-widest text-xs">Pulling blueprint source...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-gray-200">
        <h2 className="text-xl font-black text-gray-900 mb-4">BLUEPRINT NOT FOUND</h2>
        <button onClick={onBack} className="text-blue-600 font-black flex items-center gap-2 mx-auto">
          <ArrowLeft size={18} /> Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{template.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                template.type === 'yaml' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {template.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-0.5">
              <FileText size={14} /> Blueprint Specification
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenDeploy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Play size={16} fill="currentColor" />
            Deploy to Cluster
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Download size={16} />}
            Export
          </button>
          <button
            disabled={isDeleting}
            onClick={handleDelete}
            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content Split Pane */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Side Panel: Metadata */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-8">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Info size={16} className="text-blue-500" /> Information
            </h3>
            
            <div className="space-y-6">
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Author</span>
                <span className="text-sm font-bold text-gray-800">{template.created_by}</span>
              </div>
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Created</span>
                <span className="text-sm font-bold text-gray-800">{new Date(template.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Update</span>
                <span className="text-sm font-bold text-gray-800">{new Date(template.updated_at).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-50">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</span>
                <p className="text-xs text-gray-600 leading-relaxed italic">
                  {template.description || "No technical description available for this blueprint."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw size={20} className="text-white" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Operational Context</h4>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Modifying the YAML here updates the blueprint globally. Deployments initiated after saving will use the updated configuration.
            </p>
          </div>
        </div>

        {/* Editor Pane */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Code size={16} className="text-blue-500" /> Docker Compose YAML Source
            </h3>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Blueprint
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/20"
                >
                  <Edit3 size={12} />
                  Enter Editor Mode
                </button>
              )}
            </div>
          </div>

          <div className="relative group">
            {isEditing ? (
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                spellCheck={false}
                className="w-full min-h-[600px] p-8 bg-slate-950 text-slate-50 font-mono text-[13px] leading-relaxed rounded-3xl border-2 border-blue-500 focus:outline-none shadow-2xl resize-y custom-scrollbar"
                placeholder="# Paste your docker-compose.yaml here..."
              />
            ) : (
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
                <pre className="w-full min-h-[600px] p-8 font-mono text-[13px] leading-relaxed text-slate-300 overflow-auto whitespace-pre-wrap selection:bg-blue-500/30">
                  {yamlContent || "# Source is empty"}
                </pre>
                <div className="absolute top-0 left-0 w-12 h-full bg-slate-800/50 border-r border-white/5 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deployment Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bulk Deploy Blueprint</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Select target nodes for "{templateName}"</p>
              </div>
              <button onClick={() => setIsDeployModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instance Service Name</label>
                  <input
                    type="text"
                    placeholder="e.g., prod-web-stack"
                    value={batchServiceName}
                    onChange={(e) => setBatchServiceName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-900"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filter target agents..."
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
                          <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600 transition-colors">
                            {selectedAgentKeys.size === filteredAgents.length && filteredAgents.length > 0 
                              ? <CheckSquare size={20} className="text-blue-600" /> 
                              : <Square size={20} />
                            }
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Agent</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Network Info</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {filteredAgents.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">No agents found in registry matching your search.</td></tr>
                      ) : filteredAgents.map((agent) => {
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
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                                  <Server size={18} className="text-blue-500" />
                                </div>
                                <span className="font-bold text-gray-900">{agent.hostname}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono font-bold text-gray-500">{agent.ip_address}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${agent.status === 'online' ? 'text-emerald-600' : 'text-gray-400'}`}>{agent.status}</span>
                              </div>
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
                  <div className="text-sm font-black text-gray-900 uppercase">Batch Summary</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Ready to initiate deployment on {selectedAgentKeys.size} target nodes
                  </div>
                </div>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setIsDeployModalOpen(false)} className="flex-1 sm:flex-none px-8 py-3.5 border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button 
                  onClick={executeBulkDeploy}
                  disabled={isDeploying || selectedAgentKeys.size === 0 || !batchServiceName}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
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

export default TemplateDetail;
