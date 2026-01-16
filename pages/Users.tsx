
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User } from '../types';
import { Shield, Mail, Calendar, Trash2, Plus, X } from 'lucide-react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', email: '', full_name: '' });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.users.list();
      setUsers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.users.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create(newUser);
      setModalOpen(false);
      setNewUser({ username: '', password: '', role: 'user', email: '', full_name: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Directory</h1>
          <p className="text-gray-500">Manage console access and permissions.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>New User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User / Full Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase">
                      {user.username.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{user.username}</span>
                      <span className="text-xs text-gray-400">{user.full_name || 'No name provided'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mail size={14} className="text-gray-400" /> {user.email || '--'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create System User</h2>
              <button onClick={() => setModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                {/* Fixed error: Property 'underline' does not exist on type 'DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>' */}
                <input required type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                  <option value="user">User (View Only)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
