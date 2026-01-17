
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
  Search
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
  
  // Deletion Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'batch';
    targetTemplate?: ServiceTemplate;
  }>({ show: false, type: 'single' });

  // Selection state
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(1000);
  const [total, setTotal] = useState(0);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({
    field: 'updated_at',
    order: 'desc'
  });

  const [formData, setFormData] = useState({ name: '', description: '', type: 'yaml' as 'yaml' | 'zip' });
  const [file, setFile] = useState<File | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'editor'>('file');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.templates.list(page, perPage);
      setTemplates(res.templates || []);
      setTotal(res.total || 0);
      setSelectedNames(new Set()); // Clear selection on refresh
    } catch (err: any) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [page, perPage]);

  // Frontend Search and Sorting Logic
  const filteredAndSortedTemplates = useMemo(() => {
    let items = [...templates];
    
    // Filter by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(query));
    }

    // Sort items
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

  const handleSelectRow = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const next = new Set(selectedNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedNames(next);
  };

  const handleSelectAll = () => {
    if (selectedNames.size === filteredAndSortedTemplates.length) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(filteredAndSortedTemplates.map(t => t.name)));
    }
  };

  const triggerSingleDelete = (e: React.MouseEvent, tpl: ServiceTemplate) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ show: true, type: 'single', targetTemplate: tpl });
  };

  const triggerBatchDelete = () => {
    setDeleteConfirm({ show: true, type: 'batch' });
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
        // Explicitly type 'name' as string to fix 'unknown' assignability error
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
    const form = new FormData();
    form.append('name', formData.name);
    form.append('description', formData.description);
    form.append('type', formData.type);

    if (formData.type === 'yaml' && importMode === 'editor') {
      if (!yamlContent.trim()) return alert('Please enter YAML content');
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      form.append('file', blob, 'service.yaml');
    } else {
      if (!file) return alert('Please select a file');
      form.append('file', file);
    }

    try {
      await api.templates.upload(form);
      setIsModalOpen(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', type: 'yaml' });
    setFile(null);
    setYamlContent('');
    setImportMode('file');
  };

  const navigateToDetails = (name: string) => {
    window.location.hash = `#/templates/${encodeURIComponent(name)}`;
  };

  const totalPages = Math.ceil(total / perPage);

  // Batch Overview Computation
  const selectedTemplatesData = useMemo(() => {
    return templates.filter(t => selectedNames.has(t.name));
  }, [templates, selectedNames]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={28} />
            Service Templates
          </h1>
          <p className="text-gray-500 font-medium">Repository of Docker Compose blueprints for one-click deployment.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search blueprints..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {selectedNames.size > 0 && (
            <button
              onClick={triggerBatchDelete}
              disabled={batchDeleting}
              className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:bg-red-100 font-bold text-sm shadow-sm active:scale-95"
            >
              {batchDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Delete Selected ({selectedNames.size})</span>
            </button>
          )}
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 font-semibold active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>New Blueprint</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button 
                    onClick={handleSelectAll}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {selectedNames.size === filteredAndSortedTemplates.length && filteredAndSortedTemplates.length > 0 
                      ? <CheckSquare size={18} className="text-blue-600" /> 
                      : <Square size={18} />
                    }
                  </button>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Blueprint
                    <ArrowUpDown size={12} className={sortConfig.field === 'name' ? 'text-blue-600' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('type')}
                >
                   <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown size={12} className={sortConfig.field === 'type' ? 'text-blue-600' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('updated_at')}
                >
                   <div className="flex items-center gap-1">
                    Modified
                    <ArrowUpDown size={12} className={sortConfig.field === 'updated_at' ? 'text-blue-600' : 'text-gray-300'} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && templates.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></td></tr>
              ) : filteredAndSortedTemplates.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">No blueprints found.</td></tr>
              ) : filteredAndSortedTemplates.map((tpl) => {
                const isSelected = selectedNames.has(tpl.name);
                return (
                  <tr 
                    key={tpl.id} 
                    onClick={() => navigateToDetails(tpl.name)}
                    className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4" onClick={(e) => handleSelectRow(e, tpl.name)}>
                      {isSelected 
                        ? <CheckSquare size={18} className="text-blue-600" /> 
                        : <Square size={18} className="text-gray-300 group-hover:text-gray-400" />
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          {tpl.name}
                          <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <span className="text-xs text-gray-400 truncate max-w-xs font-medium">{tpl.description || 'No description'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tpl.type === 'yaml' ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded border border-indigo-100 flex items-center gap-1 w-fit">
                          <FileText size={10} /> YAML
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded border border-amber-100 flex items-center gap-1 w-fit">
                          <FileArchive size={10} /> ZIP
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-[10px] text-gray-500">
                        <span className="font-bold uppercase tracking-widest">{tpl.created_by}</span>
                        <span>{new Date(tpl.updated_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={(e) => handleDownload(e, tpl.name)}
                          disabled={downloading === tpl.name}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                        >
                          {downloading === tpl.name ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Download size={16} />}
                        </button>
                        <button
                          onClick={(e) => triggerSingleDelete(e, tpl)}
                          disabled={deleting === tpl.name}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                          {deleting === tpl.name ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Showing {filteredAndSortedTemplates.length} of {total} templates
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Per Page:</span>
              <select 
                value={perPage} 
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs font-bold bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={1000}>1000</option>
                <option value={5000}>5000</option>
              </select>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all active:scale-90"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1 px-4">
                 <span className="text-xs font-black text-gray-900">{page}</span>
                 <span className="text-[10px] font-bold text-gray-400 uppercase">of {totalPages}</span>
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all active:scale-90"
              >
                <ChevronRightIcon size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-red-100">
            <div className="p-8 border-b border-gray-50 bg-red-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Confirm Deletion</h2>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {deleteConfirm.type === 'single' && deleteConfirm.targetTemplate ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    You are about to permanently delete the following service blueprint:
                  </p>
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</span>
                      <span className="text-sm font-black text-gray-900">{deleteConfirm.targetTemplate.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</span>
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold uppercase text-gray-600">
                        {deleteConfirm.targetTemplate.type}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200/50">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Description</span>
                       <p className="text-xs text-gray-500 italic leading-relaxed">
                         {deleteConfirm.targetTemplate.description || 'No description provided.'}
                       </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    You are about to delete <span className="font-black text-red-600">{selectedNames.size}</span> templates. Here is an overview of the selection:
                  </p>
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                    {selectedTemplatesData.map(tpl => (
                      <div key={tpl.name} className="flex items-center justify-between py-1 border-b border-gray-200/50 last:border-0">
                        <span className="text-xs font-bold text-gray-800">{tpl.name}</span>
                        <span className="text-[9px] font-black uppercase text-gray-400">{tpl.type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-700">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Total templates affected: {selectedNames.size}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setDeleteConfirm({ show: false, type: 'single' })}
                  className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-[0.98] transition-all"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Blueprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Upload Service Blueprint</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Service Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., redis-cluster"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Blueprint Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const val = e.target.value as 'yaml' | 'zip';
                      setFormData({ ...formData, type: val });
                      if (val === 'zip') setImportMode('file');
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-900 cursor-pointer"
                  >
                    <option value="yaml">Single YAML File</option>
                    <option value="zip">ZIP Package (with mounts)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional technical description..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-medium text-gray-700"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                {formData.type === 'yaml' && (
                  <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setImportMode('file')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${importMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Upload size={14} /> File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('editor')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${importMode === 'editor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Edit3 size={14} /> Online Editor
                    </button>
                  </div>
                )}

                {importMode === 'file' ? (
                  <div className="relative p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 hover:border-blue-300 transition-all group">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-500 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">
                          {file ? file.name : `Select ${formData.type.toUpperCase()} file`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Drop your file here or click to browse</p>
                      </div>
                      <input
                        required={importMode === 'file'}
                        type="file"
                        accept={formData.type === 'yaml' ? '.yaml,.yml' : '.zip'}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">YAML Buffer</label>
                      <span className="text-[9px] font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase font-black">Ready for parse</span>
                    </div>
                    <textarea
                      required={importMode === 'editor'}
                      value={yamlContent}
                      onChange={(e) => setYamlContent(e.target.value)}
                      placeholder="version: '3.8'\nservices:\n  web:\n    image: nginx:latest..."
                      className="w-full h-64 p-4 bg-slate-900 text-slate-100 font-mono text-sm rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:outline-none border-none resize-none shadow-inner"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
