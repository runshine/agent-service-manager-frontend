
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import Login from './pages/Login';

const App: React.FC = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [currentPath, setCurrentPath] = useState(window.location.hash.replace('#', '') || '/dashboard');
  const [currentWorkspace, setCurrentWorkspace] = useState(localStorage.getItem('selectedWorkspace') || '');

  useEffect(() => {
    const handleHashChange = () => {
      const path = window.location.hash.replace('#', '') || '/dashboard';
      setCurrentPath(path);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogin = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    window.location.hash = '#/dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.hash = '#/login';
  };

  const handleWorkspaceChange = (id: string) => {
    setCurrentWorkspace(id);
    localStorage.setItem('selectedWorkspace', id);
  };

  const navigate = (path: string) => {
    window.location.hash = `#${path}`;
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (currentPath.startsWith('/agents/')) {
      const agentKey = currentPath.split('/')[2];
      return <AgentDetail agentKey={agentKey} onBack={() => navigate('/agents')} onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/templates/')) {
      const templateName = currentPath.split('/')[2];
      return <TemplateDetail templateName={decodeURIComponent(templateName)} onBack={() => navigate('/templates')} onNavigate={navigate} />;
    }

    switch (currentPath) {
      case '/dashboard': return <Dashboard workspaceId={currentWorkspace} onNavigate={navigate} />;
      case '/templates': return <Templates />;
      case '/agents': return <Agents workspaceId={currentWorkspace} onSelectAgent={(key) => navigate(`/agents/${key}`)} />;
      case '/tasks': return <Tasks workspaceId={currentWorkspace} />;
      case '/users': return user?.role === 'admin' ? <Users /> : <Dashboard workspaceId={currentWorkspace} onNavigate={navigate} />;
      case '/profile': return (
        <div className="p-10 bg-white rounded-3xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-black mb-8">My Profile</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-gray-50 rounded-2xl">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Username</p>
                <p className="text-lg font-bold text-gray-900">{user?.username}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Role</p>
                <p className="text-lg font-bold text-blue-600 uppercase">{user?.role}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                <p className="text-lg font-bold text-gray-900">{user?.full_name}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                <p className="text-lg font-bold text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      );
      default: return <Dashboard workspaceId={currentWorkspace} onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar 
        currentPath={currentPath.startsWith('/agents/') ? '/agents' : currentPath.startsWith('/templates/') ? '/templates' : currentPath} 
        userRole={user?.role || 'user'} 
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header 
          currentWorkspace={currentWorkspace} 
          onWorkspaceChange={handleWorkspaceChange} 
          userName={user?.full_name || user?.username || 'User'}
        />
        <main className="p-6 md:p-10 flex-1 flex flex-col">
          {/* Removed max-w-7xl and mx-auto to allow full screen width */}
          <div className="w-full flex-1">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
