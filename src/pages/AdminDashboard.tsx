import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, Eye, EyeOff, FileText, Calendar,
  CheckCircle, AlertCircle, Tag, Archive, FolderOpen, RotateCcw, Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, PolicyStatus } from '../types';

interface AdminDashboardProps {
  navigate: (to: string) => void;
}

type StatusFilter = 'all' | 'published' | 'hidden' | 'archived' | 'deleted';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<PolicyStatus, { label: string; color: string; dot: string }> = {
  published: { label: 'Publicada', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  hidden:    { label: 'Oculta',    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-400' },
  archived:  { label: 'Archivada', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',          dot: 'bg-sky-500' },
  deleted:   { label: 'Papelera',  color: 'bg-red-50 text-red-600 ring-1 ring-red-200',          dot: 'bg-red-400' },
};

const STAT_CARDS = [
  { key: 'published' as PolicyStatus, label: 'Publicadas', icon: Eye,    accent: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  { key: 'hidden'    as PolicyStatus, label: 'Ocultas',    icon: EyeOff, accent: 'text-amber-600',   bg: 'bg-amber-50',   bar: 'bg-amber-400' },
  { key: 'archived'  as PolicyStatus, label: 'Archivadas', icon: Archive, accent: 'text-sky-600',     bg: 'bg-sky-50',     bar: 'bg-sky-500' },
  { key: 'deleted'   as PolicyStatus, label: 'Papelera',   icon: Trash2,  accent: 'text-red-500',     bg: 'bg-red-50',     bar: 'bg-red-400' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('policy_number', { ascending: true });
    if (data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const updateStatus = async (id: string, status: PolicyStatus, extra: Partial<Policy> = {}) => {
    setBusy(id);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString(), ...extra };
    const { error } = await supabase.from('policies').update(patch).eq('id', id);
    if (error) {
      showToast('error', 'No se pudo actualizar el estado.');
    } else {
      setPolicies(prev => prev.map(p => p.id === id ? { ...p, status, is_published: status === 'published', ...extra } as Policy : p));
      showToast('success', `Estado actualizado a "${STATUS_META[status].label}".`);
    }
    setBusy(null);
  };

  const handleSoftDelete = async (id: string) => {
    setConfirmDelete(null);
    await updateStatus(id, 'deleted', { deleted_at: new Date().toISOString() });
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente? Esta accion no se puede deshacer.')) return;
    setBusy(id);
    const { error } = await supabase.from('policies').delete().eq('id', id);
    setBusy(null);
    if (!error) {
      setPolicies(prev => prev.filter(p => p.id !== id));
      showToast('success', 'Politica eliminada permanentemente.');
    } else {
      showToast('error', 'Error al eliminar la politica.');
    }
  };

  const counts = useMemo(() => ({
    all:       policies.length,
    published: policies.filter(p => p.status === 'published').length,
    hidden:    policies.filter(p => p.status === 'hidden').length,
    archived:  policies.filter(p => p.status === 'archived').length,
    deleted:   policies.filter(p => p.status === 'deleted').length,
  }), [policies]);

  const filtered = useMemo(() => policies.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  }), [policies, filter, search]);

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Todas' },
    { key: 'published', label: 'Publicadas' },
    { key: 'hidden',    label: 'Ocultas' },
    { key: 'archived',  label: 'Archivadas' },
    { key: 'deleted',   label: 'Papelera' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Mover a Papelera</h3>
            <p className="text-slate-500 text-sm text-center mb-6 leading-relaxed">La politica se movera a la papelera. Podras restaurarla o eliminarla permanentemente desde el Archivo.</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSoftDelete(confirmDelete)}
                disabled={!!busy}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                Mover a papelera
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Gobierno Corporativo</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Politicas</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/categorias')}
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-slate-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-gray-300 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Settings size={14} />
              Categorias
            </button>
            <button
              onClick={() => navigate('/admin/archivo')}
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-slate-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-gray-300 hover:bg-slate-50 transition-all shadow-sm"
            >
              <FolderOpen size={14} />
              Archivo
            </button>
            <button
              onClick={() => navigate('/admin/nueva')}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={15} />
              Nueva politica
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map(({ key, label, icon: Icon, accent, bg, bar }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-3.5 text-left transition-all hover:shadow-md ${filter === key ? 'border-[#0A2647]/20 shadow-sm ring-1 ring-[#0A2647]/10' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon size={17} className={accent} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 leading-none">{counts[key]}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
              </div>
              {filter === key && <div className={`ml-auto w-1 h-8 rounded-full ${bar} flex-shrink-0`} />}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar politica o categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filter === f.key
                      ? 'bg-[#0A2647] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'}`}>
                      {counts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-b border-gray-50 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center">
              <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-12">Portada</span>
              <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Numero</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titulo</span>
              <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando politicas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">Sin resultados</p>
              <p className="text-slate-400 text-sm mt-1.5">
                {filter === 'deleted' ? 'La papelera esta vacia.' : 'Ajusta el filtro o crea una nueva politica.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(policy => {
                const isBusy = busy === policy.id;
                const sm = STATUS_META[policy.status ?? (policy.is_published ? 'published' : 'hidden')];
                return (
                  <div
                    key={policy.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors group ${isBusy ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {/* Cover */}
                    {policy.cover_image_url ? (
                      <img src={policy.cover_image_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 hidden sm:block ring-1 ring-gray-100" />
                    ) : (
                      <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 hidden sm:block">
                        <FileText size={16} className="text-slate-300" />
                      </div>
                    )}

                    {/* Number */}
                    {policy.policy_number ? (
                      <span className="hidden sm:block font-mono text-xs font-bold text-slate-400 flex-shrink-0 w-20">
                        POL-{String(policy.policy_number).padStart(4, '0')}
                      </span>
                    ) : (
                      <span className="hidden sm:block w-20" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{policy.title}</h3>
                        {policy.version && (
                          <span className="flex-shrink-0 text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md">v{policy.version}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Tag size={9} className="text-slate-300" /> {policy.category}
                        </span>
                        {policy.department && (
                          <span className="text-xs text-slate-400 hidden sm:inline">{policy.department}</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Calendar size={9} className="text-slate-300" /> {formatDate(policy.published_at)}
                        </span>
                        {policy.document_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-md font-semibold hidden sm:inline-flex">
                            <FileText size={9} /> PDF
                          </span>
                        )}
                        {policy.status === 'deleted' && policy.deleted_at && (
                          <span className="text-xs text-red-400 hidden sm:inline">Eliminado: {formatDate(policy.deleted_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="hidden sm:flex flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sm.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                        {sm.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      {policy.status === 'deleted' ? (
                        <>
                          <ActionBtn onClick={() => updateStatus(policy.id, 'hidden', { deleted_at: null } as Partial<Policy>)} title="Restaurar" color="emerald"><RotateCcw size={14} /></ActionBtn>
                          <ActionBtn onClick={() => handleHardDelete(policy.id)} title="Eliminar permanentemente" color="red"><Trash2 size={14} /></ActionBtn>
                        </>
                      ) : (
                        <>
                          <ActionBtn
                            onClick={() => updateStatus(policy.id, policy.status === 'published' ? 'hidden' : 'published')}
                            title={policy.status === 'published' ? 'Ocultar' : 'Publicar'}
                            color={policy.status === 'published' ? 'emerald' : 'slate'}
                          >
                            {policy.status === 'published' ? <Eye size={14} /> : <EyeOff size={14} />}
                          </ActionBtn>
                          <ActionBtn onClick={() => updateStatus(policy.id, 'archived', { archived_at: new Date().toISOString() })} title="Archivar" color="sky"><Archive size={14} /></ActionBtn>
                          <ActionBtn onClick={() => navigate(`/admin/editar/${policy.id}`)} title="Editar" color="slate"><Pencil size={14} /></ActionBtn>
                          <ActionBtn onClick={() => setConfirmDelete(policy.id)} title="Mover a papelera" color="red"><Trash2 size={14} /></ActionBtn>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table footer */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {filtered.length} de {policies.length} {policies.length === 1 ? 'politica' : 'politicas'}
              </span>
              <button
                onClick={() => navigate('/admin/archivo')}
                className="inline-flex items-center gap-1.5 text-xs text-[#0A2647] hover:underline font-semibold"
              >
                <FolderOpen size={12} />
                Ver archivo completo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-600 hover:bg-emerald-50',
  sky:     'text-sky-500 hover:bg-sky-50',
  amber:   'text-amber-500 hover:bg-amber-50',
  slate:   'text-slate-400 hover:bg-slate-100',
  red:     'text-red-400 hover:bg-red-50',
};

function ActionBtn({ children, onClick, title, color }: { children: React.ReactNode; onClick: () => void; title: string; color: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${COLOR_MAP[color] ?? COLOR_MAP.slate}`}
    >
      {children}
    </button>
  );
}

export default AdminDashboard;
