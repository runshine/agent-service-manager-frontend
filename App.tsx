
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Agents from './pages/Agents';
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
    switch (currentPath) {
      case '/dashboard': return <Dashboard workspaceId={currentWorkspace} />;
      case '/templates': return <Templates />;
      case '/agents': return <Agents workspaceId={currentWorkspace} />;
      case '/tasks': return <Tasks workspaceId={currentWorkspace} />;
      case '/users': return user?.role === 'admin' ? <Users /> : <Dashboard workspaceId={currentWorkspace} />;
      case '/profile': return <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4">My Profile</h2>
        <div className="space-y-4">
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Full Name:</strong> {user?.full_name}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
      </div>;
      default: return <Dashboard workspaceId={currentWorkspace} />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar 
        currentPath={currentPath} 
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
        <main className="p-8 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
