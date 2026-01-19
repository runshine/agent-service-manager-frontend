
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { ServiceTemplate } from '../types';
import { 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  FileArchive, 
  X, 
  Edit3, 
  Upload, 
  Loader2, 
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Search,
  Code,
  AlertCircle
} from 'lucide-react';

type SortField = 'name' | 'type' | 'updated_at';
type SortOrder = 'asc' | 'desc';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'batch';
    targetTemplate?: ServiceTemplate;
  }>({ show: false, type: 'single' });

  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);

  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({
    field: 'updated_at',
    order: 'desc'
  });

  // Create Form State - changed 'zip' to 'archive'
  const [formData, setFormData] = useState({ name: '', description: '', type: 'yaml' as 'yaml' | 'archive' });
  const [file, setFile] = useState<File | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'editor'>('file');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.templates.list(page, perPage);
      setTemplates(res.templates || []);
      setTotal(res.total || 0);
      setSelectedNames(new Set());
    } catch (err: any) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [page, perPage]);

  const filteredAndSortedTemplates = useMemo(() => {
    let items = [...templates];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(query));
    }
    items.sort((a, b) => {
      let valA = (a as any)[sortConfig.field] || '';
      let valB = (b as any)[sortConfig.field] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [templates, sortConfig, searchQuery]);

  const toggleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const executeDelete = async () => {
    if (deleteConfirm.type === 'single' && deleteConfirm.targetTemplate) {
      const name = deleteConfirm.targetTemplate.name;
      try {
        setDeleting(name);
        setDeleteConfirm({ ...deleteConfirm, show: false });
        await api.templates.delete(name);
        await fetchTemplates();
      } catch (err: any) {
        alert(err.message || 'Deletion failed');
      } finally {
        setDeleting(null);
      }
    } else if (deleteConfirm.type === 'batch') {
      const names = Array.from(selectedNames);
      setBatchDeleting(true);
      setDeleteConfirm({ ...deleteConfirm, show: false });
      try {
        await Promise.all(names.map((name: string) => api.templates.delete(name)));
        await fetchTemplates();
      } catch (err: any) {
        alert(err.message || 'Some deletions failed');
      } finally {
        setBatchDeleting(false);
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloading(name);
      await api.templates.download(name);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!formData.name) return setSubmitError('Name is required');

    setIsSubmitting(true);
    const form = new FormData();
    form.append('name', formData.name);
    form.append('description', formData.description);
    form.append('type', formData.type);

    if (formData.type === 'yaml' && importMode === 'editor') {
      if (!yamlContent) {
        setIsSubmitting(false);
        return setSubmitError('Please enter YAML content');
      }
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      form.append('file', blob, 'service.yaml');
    } else {
      if (!file) {
        setIsSubmitting(false);
        return setSubmitError('Please select a file to upload');
      }
      form.append('file', file);
    }

    try {
      await api.templates.upload(form);
      setIsModalOpen(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      // The error handling is based on the API response structure { "error": "..." }
      setSubmitError(err.message || 'An unexpected error occurred during upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', type: 'yaml' });
    setFile(null);
    setYamlContent('');
    setImportMode('file');
    setSubmitError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Blueprint Library
          </h1>
          <p className="text-gray-500 text-base font-bold mt-1">Repository of distributed Docker Compose specifications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search blueprints..."
              className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none w-72 shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {selectedNames.size > 0 && (
            <button
              onClick={() => setDeleteConfirm({ show: true, type: 'batch' })}
              className="bg-red-50 text-red-600 border border-red-100 px-6 py-3 rounded-2xl flex items-center gap-3 transition-all hover:bg-red-100 font-black text-xs uppercase tracking-widest shadow-sm"
            >
              <Trash2 size={18} />
              <span>Delete Selection ({selectedNames.size})</span>
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 font-black text-xs uppercase tracking-widest active:scale-95"
          >
            <Plus size={20} />
            <span>Create New</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                <th className="px-10 py-5 w-16">
                  <button onClick={() => {
                    if (selectedNames.size === filteredAndSortedTemplates.length) setSelectedNames(new Set());
                    else setSelectedNames(new Set(filteredAndSortedTemplates.map(t => t.name)));
                  }} className="text-gray-400 hover:text-blue-600">
                    {selectedNames.size === filteredAndSortedTemplates.length && filteredAndSortedTemplates.length > 0 ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} />}
                  </button>
                </th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">Blueprint Specification <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer" onClick={() => toggleSort('type')}>
                  <div className="flex items-center gap-2">Encoding <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer" onClick={() => toggleSort('updated_at')}>
                  <div className="flex items-center gap-2">Last Modified <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && templates.length === 0 ? (
                <tr><td colSpan={5} className="px-10 py-40 text-center"><Loader2 className="animate-spin inline text-blue-600" size={48} /></td></tr>
              ) : filteredAndSortedTemplates.length === 0 ? (
                <tr><td colSpan={5} className="px-10 py-40 text-center text-gray-400 font-bold uppercase tracking-widest italic opacity-40">Blueprint catalog is empty</td></tr>
              ) : filteredAndSortedTemplates.map((tpl) => {
                const isSelected = selectedNames.has(tpl.name);
                return (
                  <tr 
                    key={tpl.id} 
                    onClick={() => window.location.hash = `#/templates/${encodeURIComponent(tpl.name)}`}
                    className={`hover:bg-blue-50/40 transition-all cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-10 py-8" onClick={(e) => {
                      e.stopPropagation();
                      const next = new Set(selectedNames);
                      if (next.has(tpl.name)) next.delete(tpl.name);
                      else next.add(tpl.name);
                      setSelectedNames(next);
                    }}>
                      {isSelected ? <CheckSquare size={22} className="text-blue-600" /> : <Square size={22} className="text-gray-200 group-hover:text-gray-300" />}
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 text-base flex items-center gap-3">
                          {tpl.name} <ChevronRight size={18} className="text-gray-200 group-hover:text-blue-500 transition-all" />
                        </span>
                        <span className="text-sm text-gray-500 font-medium truncate max-w-xl mt-1">{tpl.description || 'No detailed blueprint specification provided.'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      {tpl.type === 'yaml' ? (
                        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-xl border border-indigo-100 flex items-center gap-2 w-fit">
                          <FileText size={14} /> YAML Specification
                        </span>
                      ) : (
                        <span className="px-4 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-xl border border-amber-100 flex items-center gap-2 w-fit">
                          <FileArchive size={14} /> Archive Bundle
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-gray-800">{new Date(tpl.updated_at).toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Modified by {tpl.created_by}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button onClick={(e) => handleDownload(e, tpl.name)} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm">
                          {downloading === tpl.name ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ show: true, type: 'single', targetTemplate: tpl });
                        }} className="p-3 text-gray-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm">
                          <Trash2 size={24} />
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

      {/* --- MODALS --- */}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-300 border border-white/20 relative z-[160]">
             <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 tracking-tight">Create Blueprint</h2>
                   <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-2">New Service Definition</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                   <X size={24} />
                </button>
             </div>

             <form onSubmit={handleUpload} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {submitError && (
                  <div className="p-6 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-start gap-4 text-red-700 animate-in slide-in-from-top-2 duration-200">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">Submission Error</p>
                      <p className="text-sm font-bold leading-relaxed">{submitError}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Specification Name</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g., redis-cluster"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-900"
                        value={formData.name}
                        onChange={e => { setFormData({...formData, name: e.target.value}); setSubmitError(null); }}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Blueprint Format</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-black text-gray-900 uppercase text-xs"
                        value={formData.type}
                        onChange={e => { setFormData({...formData, type: e.target.value as any}); setSubmitError(null); }}
                      >
                         <option value="yaml">Docker Compose YAML</option>
                         <option value="archive">Compressed Archive (ZIP, TAR, TGZ, etc.)</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Brief Description</label>
                   <textarea 
                     placeholder="Technical summary of this service stack..."
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-medium text-gray-700 min-h-[100px]"
                     value={formData.description}
                     onChange={e => { setFormData({...formData, description: e.target.value}); setSubmitError(null); }}
                   />
                </div>

                {formData.type === 'yaml' && (
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl border border-gray-200 w-fit">
                    <button 
                      type="button"
                      onClick={() => setImportMode('file')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      <Upload size={14} /> Local File
                    </button>
                    <button 
                      type="button"
                      onClick={() => setImportMode('editor')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'editor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      <Code size={14} /> Inline Editor
                    </button>
                  </div>
                )}

                <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem]">
                   {formData.type === 'yaml' && importMode === 'editor' ? (
                     <textarea 
                        required
                        placeholder="Paste your docker-compose.yaml here..."
                        className="w-full h-64 bg-slate-950 text-slate-300 font-mono text-sm p-6 rounded-2xl border border-white/10 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
                        value={yamlContent}
                        onChange={e => { setYamlContent(e.target.value); setSubmitError(null); }}
                     />
                   ) : (
                     <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                           <Upload size={28} />
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          id="file-upload" 
                          accept={formData.type === 'yaml' ? '.yaml,.yml' : '.zip,.tar,.tar.gz,.tgz,.tar.bz2,.tbz,.tbz2,.tar.xz,.txz'}
                          onChange={e => { setFile(e.target.files?.[0] || null); setSubmitError(null); }}
                        />
                        <label htmlFor="file-upload" className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
                           {file ? file.name : 'Choose Blueprint File'}
                        </label>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">
                          {formData.type === 'yaml' ? 'Supported: .yaml, .yml' : 'Supported: .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tbz, .tbz2, .tar.xz, .txz'}
                        </p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Max file size: 50MB</p>
                     </div>
                   )}
                </div>

                <div className="flex gap-6 pt-4 sticky bottom-0 bg-white py-4 mt-auto">
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 px-8 py-5 border-2 border-gray-100 text-gray-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={isSubmitting}
                     className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                   >
                     {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Create Blueprint'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setDeleteConfirm({ show: false, type: 'single' })} />
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-red-100 relative z-[210]">
            <div className="p-10 border-b border-gray-50 bg-red-50/50 flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-red-100 flex items-center justify-center text-red-600 shadow-lg shadow-red-500/10">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Confirm Removal</h2>
                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Destructive Operation</p>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <p className="text-base text-gray-600 font-bold leading-relaxed">
                You are about to purge {deleteConfirm.type === 'single' ? `"${deleteConfirm.targetTemplate?.name}"` : `${selectedNames.size} templates`} from the blueprint library. This action cannot be reversed.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirm({ show: false, type: 'single' })} className="flex-1 px-8 py-5 border-2 border-gray-100 text-gray-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Discard</button>
                <button 
                  onClick={executeDelete} 
                  disabled={batchDeleting || deleting !== null}
                  className="flex-1 px-8 py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {(batchDeleting || deleting !== null) ? <Loader2 size={16} className="animate-spin" /> : 'Execute Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
