
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ServiceTemplate } from '../types';
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
  Code
} from 'lucide-react';

interface TemplateDetailProps {
  templateName: string;
  onBack: () => void;
}

const TemplateDetail: React.FC<TemplateDetailProps> = ({ templateName, onBack }) => {
  const [template, setTemplate] = useState<ServiceTemplate | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const [tplRes, yamlRes] = await Promise.all([
        api.templates.get(templateName),
        api.templates.getYaml(templateName)
      ]);
      setTemplate(tplRes);
      setYamlContent(yamlRes.yaml_content || '');
    } catch (err: any) {
      console.error("Failed to fetch template details", err);
      alert(err.message || "Failed to load template");
    } finally {
      setLoading(false);
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
      // Refresh details to update timestamp
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
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-3">
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

          <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw size={20} className="text-white" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Operational Context</h4>
            <p className="text-xs text-blue-100 leading-relaxed">
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
    </div>
  );
};

export default TemplateDetail;
