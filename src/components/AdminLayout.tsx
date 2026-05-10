import React, { useState } from 'react';
import {
  FileText, FolderOpen, Settings, Users,
  LogOut, ExternalLink, X, Menu, Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  navigate: (to: string) => void;
  currentPage: string;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ navigate, currentPage, children }) => {
  const { user, adminUser, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { key: 'admin-dashboard',  label: 'Politicas',  icon: <FileText size={16} />,  path: '/admin' },
    { key: 'admin-archive',    label: 'Archivo',     icon: <FolderOpen size={16} />, path: '/admin/archivo' },
    { key: 'admin-categories', label: 'Categorias',  icon: <Settings size={16} />,  path: '/admin/categorias' },
    ...(adminUser?.role === 'superadmin'
      ? [{ key: 'admin-users', label: 'Usuarios', icon: <Users size={16} />, path: '/admin/usuarios' }]
      : []),
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';
  const roleName = adminUser?.role === 'superadmin' ? 'Super Admin' : 'Admin';

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#0B1F3A]">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/8 flex-shrink-0">
        <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-8 object-contain" />
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">Admin</span>
        <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/30 hover:text-white/70 lg:hidden transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        <p className="px-2 pb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Menu</p>
        {navItems.map(item => {
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className={active ? 'text-white' : 'text-white/35'}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 flex-shrink-0">

        {/* Nueva politica */}
        <button
          onClick={() => { navigate('/admin/nueva'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-white/8 text-white/70 hover:bg-white/12 hover:text-white transition-all"
        >
          <Plus size={15} className="text-white/50" />
          Nueva politica
        </button>

        {/* Ver sitio */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/35 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <ExternalLink size={14} />
          Ver sitio publico
        </button>

        {/* Divider */}
        <div className="pt-2 pb-1 border-t border-white/8" />

        {/* User */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-semibold truncate leading-none">{roleName}</p>
            <p className="text-white/30 text-[10px] truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Cerrar sesion"
            className="p-1.5 rounded-lg text-white/25 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-56 z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 h-[60px] flex items-center px-5 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <Menu size={18} />
          </button>

          <span className="text-sm font-semibold text-slate-700">
            {navItems.find(n => n.key === currentPage)?.label ?? 'Panel'}
          </span>

          <div className="flex-1" />

          {/* Profile chip */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#0B1F3A] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-700 leading-none">{roleName}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">{user?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
