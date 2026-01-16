
import React from 'react';
import { 
  LayoutDashboard, 
  FileCode, 
  Server, 
  ClipboardList, 
  Users, 
  UserCircle, 
  LogOut,
  Container
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  userRole: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, userRole, onNavigate, onLogout }) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Templates', icon: FileCode, path: '/templates' },
    { name: 'Agents', icon: Server, path: '/agents' },
    { name: 'Tasks', icon: ClipboardList, path: '/tasks' },
  ];

  if (userRole === 'admin') {
    menuItems.push({ name: 'User Management', icon: Users, path: '/users' });
  }

  menuItems.push({ name: 'Profile', icon: UserCircle, path: '/profile' });

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <Container className="text-blue-400 w-8 h-8" />
        <span className="text-xl font-bold tracking-tight">Hub Console</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
