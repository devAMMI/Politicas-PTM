import React, { useState, useEffect } from 'react';
import {
  FileText, FolderOpen, Settings, Users,
  LogOut, ExternalLink, ChevronRight, X, Menu,
  Eye, EyeOff, Archive, Trash2, Plus, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminLayoutProps {
  navigate: (to: string) => void;
  currentPage: string;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ navigate, currentPage, children }) => {
  const { user, adminUser, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [stats, setStats] = useState({ published: 0, hidden: 0, archived: 0, deleted: 0, total: 0 });

  useEffect(() => {
    supabase.from('policies').select('status').then(({ data }) => {
      if (!data) return;
      setStats({
        published: data.filter(p => p.status === 'published').length,
        hidden:    data.filter(p => p.status === 'hidden').length,
        archived:  data.filter(p => p.status === 'archived').length,
        deleted:   data.filter(p => p.status === 'deleted').length,
        total:     data.length,
      });
    });
  }, [currentPage]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { key: 'admin-dashboard',  label: 'Politicas',   icon: <FileText size={16} />,  path: '/admin' },
    { key: 'admin-archive',    label: 'Archivo',      icon: <FolderOpen size={16} />, path: '/admin/archivo' },
    { key: 'admin-categories', label: 'Categorias',   icon: <Settings size={16} />,  path: '/admin/categorias' },
    ...(adminUser?.role === 'superadmin'
      ? [{ key: 'admin-users', label: 'Usuarios', icon: <Users size={16} />, path: '/admin/usuarios' }]
      : []),
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';
  const roleName = adminUser?.role === 'superadmin' ? 'Super Admin' : 'Administrador';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-9 object-contain" />
        <div className="h-5 w-px bg-white/20" />
        <div>
          <p className="text-white text-xs font-bold tracking-widest uppercase leading-none">Admin</p>
          <p className="text-blue-300/60 text-[10px] mt-0.5">Panel de control</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto p-1 text-white/40 hover:text-white lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Nav label ── */}
      <div className="px-5 pt-5 pb-2 flex-shrink-0">
        <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-widest">Menu</p>
      </div>

      {/* ── Nav items ── */}
      <nav className="px-3 space-y-0.5 flex-shrink-0">
        {navItems.map(item => {
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-white/15 text-white shadow-sm' : 'text-blue-200/75 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className={active ? 'text-white' : 'text-blue-300/60'}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight size={12} className="text-white/40" />}
            </button>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-5 my-5 border-t border-white/8 flex-shrink-0" />

      {/* ── Stats label ── */}
      <div className="px-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={11} className="text-blue-300/40" />
          <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-widest">Estadisticas</p>
        </div>
      </div>

      {/* ── Total highlight ── */}
      <div className="px-3 flex-shrink-0">
        <div className="bg-white/8 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
          <div>
            <p className="text-blue-200/60 text-xs mb-0.5">Total de politicas</p>
            <p className="text-white text-3xl font-bold leading-none">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <FileText size={18} className="text-blue-200/70" />
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="px-3 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Publicadas', value: stats.published, icon: <Eye size={13} />,     dot: 'bg-emerald-400', num: 'text-emerald-300' },
            { label: 'Ocultas',    value: stats.hidden,    icon: <EyeOff size={13} />,  dot: 'bg-amber-400',   num: 'text-amber-300' },
            { label: 'Archivadas', value: stats.archived,  icon: <Archive size={13} />, dot: 'bg-sky-400',     num: 'text-sky-300' },
            { label: 'Papelera',   value: stats.deleted,   icon: <Trash2 size={13} />,  dot: 'bg-red-400',     num: 'text-red-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/6 hover:bg-white/10 transition-colors rounded-xl p-3 cursor-default">
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="text-blue-200/50 text-[10px]">{s.label}</span>
              </div>
              <p className={`text-xl font-bold leading-none ${s.num}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Quick action ── */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="mx-5 mb-4 border-t border-white/8" />
        <button
          onClick={() => { navigate('/admin/nueva'); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#0A2647] text-sm font-bold hover:bg-blue-50 transition-all shadow-lg shadow-black/20"
        >
          <Plus size={15} />
          Nueva politica
        </button>
      </div>

      {/* ── Ver sitio ── */}
      <div className="px-3 pb-3 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium text-blue-300/60 hover:bg-white/8 hover:text-blue-200 transition-all"
        >
          <ExternalLink size={13} />
          Ver sitio publico
        </button>
      </div>

      {/* ── User profile ── */}
      <div className="border-t border-white/10 px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{roleName}</p>
            <p className="text-blue-300/60 text-[10px] truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Cerrar sesion"
            className="p-1.5 rounded-lg text-blue-300/50 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#0A2647] z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 h-14 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1">
            <span className="text-sm font-semibold text-slate-700">
              {navItems.find(n => n.key === currentPage)?.label ?? 'Panel'}
            </span>
          </div>

          {/* Profile button */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{roleName}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user?.email}</p>
              </div>
            </button>

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
                        <p className="text-sm font-semibold text-slate-800 truncate">{roleName}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
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

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
