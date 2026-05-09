import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, FolderOpen, Settings, Users,
  LogOut, ExternalLink, ChevronRight, X, Menu, User,
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
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { key: 'admin-dashboard', label: 'Politicas', icon: <FileText size={17} />, path: '/admin' },
    { key: 'admin-archive', label: 'Archivo', icon: <FolderOpen size={17} />, path: '/admin/archivo' },
    { key: 'admin-categories', label: 'Categorias', icon: <Settings size={17} />, path: '/admin/categorias' },
    ...(adminUser?.role === 'superadmin'
      ? [{ key: 'admin-users', label: 'Usuarios', icon: <Users size={17} />, path: '/admin/usuarios' }]
      : []),
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';
  const emailDisplay = user?.email ?? '';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-[#0A2647] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-9 object-contain" />
          <div className="h-5 w-px bg-white/20" />
          <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest leading-tight">
            Admin
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 text-white/50 hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map(item => {
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={active ? 'text-white' : 'text-blue-300/70'}>{item.icon}</span>
                {item.label}
                {active && <ChevronRight size={13} className="ml-auto text-white/50" />}
              </button>
            );
          })}
        </nav>

        {/* Ver sitio */}
        <div className="px-3 pb-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-blue-300/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <ExternalLink size={14} />
            Ver sitio publico
          </button>
        </div>

        {/* User profile strip */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{adminUser?.role === 'superadmin' ? 'Super Admin' : 'Administrador'}</p>
              <p className="text-blue-300/70 text-[10px] truncate">{emailDisplay}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesion"
              className="p-1.5 rounded-lg text-blue-300/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 h-14 flex items-center px-4 sm:px-6 gap-4">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb / page title */}
          <div className="flex-1">
            <span className="text-sm font-semibold text-slate-700">
              {navItems.find(n => n.key === currentPage)?.label ?? 'Panel'}
            </span>
          </div>

          {/* Right: profile avatar */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{adminUser?.role === 'superadmin' ? 'Super Admin' : 'Administrador'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{emailDisplay}</p>
              </div>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{adminUser?.role === 'superadmin' ? 'Super Admin' : 'Administrador'}</p>
                        <p className="text-xs text-slate-400 truncate">{emailDisplay}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { navigate('/'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink size={14} className="text-slate-400" />
                      Ver sitio publico
                    </button>
                    <button
                      onClick={() => { handleSignOut(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Cerrar sesion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
