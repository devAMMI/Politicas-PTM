import React, { useState } from 'react';
import { FolderOpen, Settings, Users, LogOut, ExternalLink, X, Menu, Plus, LayoutGrid, CircleUser as UserCircle, Send } from 'lucide-react';
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
    navigate('/login');
  };

  const navItems = [
    { key: 'admin-dashboard',   label: 'Políticas',     icon: <LayoutGrid size={16} />, path: '/admin' },
    { key: 'admin-archive',     label: 'Archivo',       icon: <FolderOpen size={16} />, path: '/admin/archivo' },
    { key: 'admin-categories',  label: 'Categorias',    icon: <Settings size={16} />,   path: '/admin/categorias' },
    { key: 'admin-users',       label: 'Usuarios',      icon: <Users size={16} />,      path: '/admin/usuarios' },
    { key: 'admin-recipients',  label: 'Lista de Envio', icon: <Send size={16} />,      path: '/admin/lista-envio' },
  ];

  const allPageLabels: Record<string, string> = {
    'admin-dashboard':   'Políticas',
    'admin-archive':     'Archivo',
    'admin-categories':  'Categorias',
    'admin-users':       'Usuarios',
    'admin-recipients':  'Lista de Envio',
    'admin-profile':     'Mi Perfil',
    'admin-create':      'Nueva Politica',
    'admin-edit':        'Editar Politica',
  };

  const displayName = adminUser?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleName    = adminUser?.role === 'superadmin' ? 'Super Admin' : 'Administrador';
  const initials    = displayName.slice(0, 2).toUpperCase();

  const NavBtn = ({ item }: { item: typeof navItems[0] }) => {
    const active = currentPage === item.key;
    return (
      <button
        onClick={() => { navigate(item.path); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-white/10 text-white'
            : 'text-white/45 hover:text-white/75 hover:bg-white/5'
        }`}
      >
        <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-white/30'}`}>{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
      </button>
    );
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0D1B2E 0%, #111D30 100%)' }}>

      {/* Logo */}
      <div className="px-6 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-8 object-contain mb-2" />
            <p className="text-[10px] font-bold text-[#C9973A] uppercase tracking-[0.2em] leading-none">Panel Admin</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white/25 hover:text-white/60 transition-colors mt-1 lg:hidden">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="px-4 flex-shrink-0">
        <p className="px-2 mb-2 text-[10px] font-bold text-white/25 uppercase tracking-[0.18em]">Navegacion</p>
        <nav className="space-y-0.5">
          {navItems.map(item => <NavBtn key={item.key} item={item} />)}
        </nav>
      </div>

      {/* Acciones */}
      <div className="px-4 mt-5 flex-shrink-0">
        <p className="px-2 mb-2 text-[10px] font-bold text-white/25 uppercase tracking-[0.18em]">Acciones</p>
        <button
          onClick={() => { navigate('/admin/nueva'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/45 hover:text-white/75 hover:bg-white/5 transition-all"
        >
          <span className="text-white/30 flex-shrink-0"><Plus size={16} /></span>
          Nueva politica
        </button>
        <button
          onClick={() => { navigate('/'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/45 hover:text-white/75 hover:bg-white/5 transition-all"
        >
          <span className="text-white/30 flex-shrink-0"><ExternalLink size={16} /></span>
          Ver sitio de politicas
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User section */}
      <div className="px-4 pb-5 flex-shrink-0">
        <div className="border-t border-white/8 mb-3" />

        {/* Mi Perfil */}
        <button
          onClick={() => { navigate('/admin/perfil'); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
            currentPage === 'admin-profile'
              ? 'bg-white/10 text-white'
              : 'text-white/45 hover:text-white/75 hover:bg-white/5'
          }`}
        >
          <span className={`flex-shrink-0 ${currentPage === 'admin-profile' ? 'text-white' : 'text-white/30'}`}>
            <UserCircle size={16} />
          </span>
          Mi Perfil
        </button>

        {/* Avatar + info */}
        <div className="flex items-center gap-3 px-2 mt-3 mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[#0D1B2E] font-bold text-sm"
            style={{ backgroundColor: '#C9973A' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none truncate">{displayName}</p>
            <p className="text-white/35 text-xs mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Cerrar sesion */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-white/35 hover:text-white/60 hover:bg-white/5 transition-all mt-1"
        >
          <LogOut size={15} className="flex-shrink-0" />
          Cerrar sesion
        </button>
      </div>

      {/* Accent bar */}
      <div className="h-[3px] flex-shrink-0" style={{ background: 'linear-gradient(90deg, #C9973A 0%, #E8B84B 50%, transparent 100%)' }} />
    </div>
  );

  return (
    <div className="h-screen bg-[#F7F8FA] flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-60 z-50 shadow-2xl flex-shrink-0
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 h-[60px] flex items-center px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <Menu size={18} />
          </button>

          <span className="text-sm font-semibold text-slate-700">
            {allPageLabels[currentPage] ?? 'Panel Admin'}
          </span>

          <div className="flex-1" />

          {/* User chip */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#0D1B2E] font-bold text-[11px] flex-shrink-0"
              style={{ backgroundColor: '#C9973A' }}
            >
              {initials}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700 leading-none">{roleName}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">{user?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
