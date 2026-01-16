
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ServiceTemplate } from '../types';
import { Plus, Trash2, Download, FileText, FileArchive, Search, X } from 'lucide-react';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', type: 'yaml' as 'yaml' | 'zip' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.templates.list();
      setTemplates(res.templates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete template ${name}?`)) return;
    try {
      await api.templates.delete(name);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');

    const form = new FormData();
    form.append('file', file);
    form.append('name', formData.name);
    form.append('description', formData.description);
    form.append('type', formData.type);

    try {
      await api.templates.upload(form);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', type: 'yaml' });
      setFile(null);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Templates</h1>
          <p className="text-gray-500">Manage Docker Compose blueprints for one-click deployment.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Upload Template</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading templates...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No templates found.</td></tr>
            ) : templates.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{tpl.name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs">{tpl.description || 'No description'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {tpl.type === 'yaml' ? (
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded flex items-center gap-1">
                        <FileText size={12} /> YAML
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded flex items-center gap-1">
                        <FileArchive size={12} /> ZIP
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{tpl.created_by}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(tpl.updated_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-3">
                    <a
                      href={api.templates.download(tpl.name)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onClick={() => handleDelete(tpl.name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold">New Service Template</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., redis-cluster"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'yaml' | 'zip' })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="yaml">Single YAML</option>
                    <option value="zip">ZIP Package</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    required
                    type="file"
                    accept={formData.type === 'yaml' ? '.yaml,.yml' : '.zip'}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
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
