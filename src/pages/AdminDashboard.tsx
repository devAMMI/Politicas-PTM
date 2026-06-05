import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, Eye, EyeOff, FileText, Calendar,
  CheckCircle, AlertCircle, Tag, Archive, FolderOpen, RotateCcw, Settings,
  LayoutGrid, List, ChevronLeft, ChevronRight, Send, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, PolicyStatus } from '../types';
import PolicyCard from '../components/PolicyCard';
import SendEmailModal, { NotificationType } from '../components/SendEmailModal';

interface AdminDashboardProps {
  navigate: (to: string) => void;
}

type StatusFilter = 'all' | 'published' | 'hidden' | 'archived' | 'deleted';

const PAGE_SIZE = 6;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<PolicyStatus, { label: string; color: string; dot: string }> = {
  published: { label: 'Publicada', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  hidden:    { label: 'Oculta',    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-400' },
  archived:  { label: 'Archivada', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',             dot: 'bg-sky-500' },
  deleted:   { label: 'Papelera',  color: 'bg-red-50 text-red-600 ring-1 ring-red-200',             dot: 'bg-red-400' },
};

const STAT_CARDS = [
  { key: 'published' as PolicyStatus, label: 'Publicadas', icon: Eye,    accent: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  { key: 'hidden'    as PolicyStatus, label: 'Ocultas',    icon: EyeOff, accent: 'text-amber-600',   bg: 'bg-amber-50',   bar: 'bg-amber-400' },
  { key: 'archived'  as PolicyStatus, label: 'Archivadas', icon: Archive, accent: 'text-sky-600',     bg: 'bg-sky-50',     bar: 'bg-sky-500' },
  { key: 'deleted'   as PolicyStatus, label: 'Papelera',   icon: Trash2,  accent: 'text-red-500',     bg: 'bg-red-50',     bar: 'bg-red-400' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const [policies, setPolicies]     = useState<Policy[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [busy, setBusy]             = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode]     = useState<'list' | 'grid'>('list');
  const [page, setPage]             = useState(1);
  const [sendPolicy, setSendPolicy] = useState<Policy | null>(null);
  const [sendType, setSendType]     = useState<NotificationType>('nueva');
  const [confirmArchive, setConfirmArchive] = useState<Policy | null>(null);
  const [confirmHide, setConfirmHide]       = useState<Policy | null>(null);

  useEffect(() => { fetchPolicies(); }, []);
  useEffect(() => { setPage(1); }, [search, filter]);

  const fetchPolicies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('policy_number', { ascending: false });
    if (data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const updateStatus = async (
    id: string,
    status: PolicyStatus,
    extra: Partial<Policy> = {},
    notifyType?: NotificationType,
  ) => {
    setBusy(id);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString(), ...extra };
    const { error } = await supabase.from('policies').update(patch).eq('id', id);
    if (error) {
      showToast('error', 'No se pudo actualizar el estado.');
    } else {
      const updated = { ...policies.find(p => p.id === id)!, status, is_published: status === 'published', ...extra } as Policy;
      setPolicies(prev => prev.map(p => p.id === id ? updated : p));
      showToast('success', `Estado actualizado a "${STATUS_META[status].label}".`);
      if (notifyType) {
        setSendType(notifyType);
        setSendPolicy(updated);
      }
    }
    setBusy(null);
  };

  const handleSoftDelete = async (id: string) => {
    setConfirmDelete(null);
    await updateStatus(id, 'deleted', { deleted_at: new Date().toISOString() });
  };

  const handleArchive = async (policy: Policy) => {
    setConfirmArchive(null);
    await updateStatus(policy.id, 'archived', { archived_at: new Date().toISOString() });
  };

  const handleHide = async (policy: Policy) => {
    setConfirmHide(null);
    await updateStatus(policy.id, 'hidden', {}, 'oculta');
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push('…');
    pageNumbers.push(totalPages);
  }

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Todas' },
    { key: 'published', label: 'Publicadas' },
    { key: 'hidden',    label: 'Ocultas' },
    { key: 'archived',  label: 'Archivadas' },
    { key: 'deleted',   label: 'Papelera' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Send email modal */}
      {sendPolicy && (
        <SendEmailModal
          policy={sendPolicy}
          notificationType={sendType}
          onClose={() => setSendPolicy(null)}
        />
      )}

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

      {/* Confirm archive modal */}
      {confirmArchive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl p-7 max-w-md w-full">
            <button onClick={() => setConfirmArchive(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Archive size={20} className="text-sky-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Archivar politica</h3>
            <p className="text-slate-500 text-sm text-center mb-2 leading-relaxed">
              <strong className="text-slate-700">"{confirmArchive.title}"</strong> sera movida al archivo historico.
            </p>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mb-6 space-y-2">
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">¿Que significa archivar?</p>
              <ul className="space-y-1.5 text-xs text-sky-800">
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />La politica <strong>deja de aparecer en el sitio publico</strong> para los empleados.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />Queda guardada en el <strong>Archivo</strong> como registro historico, con su PDF e historial de versiones.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />Puede ser <strong>restaurada o consultada</strong> en cualquier momento desde el Archivo.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />Usualmente se archiva cuando <strong>una nueva version reemplaza a la anterior</strong> o ya no esta vigente.</li>
              </ul>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmArchive(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleArchive(confirmArchive)} disabled={!!busy} className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <Archive size={14} /> Archivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm hide modal */}
      {confirmHide && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl p-7 max-w-md w-full">
            <button onClick={() => setConfirmHide(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <EyeOff size={20} className="text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Ocultar politica</h3>
            <p className="text-slate-500 text-sm text-center mb-2 leading-relaxed">
              <strong className="text-slate-700">"{confirmHide.title}"</strong> sera ocultada temporalmente.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">¿Que significa ocultar?</p>
              <ul className="space-y-1.5 text-xs text-amber-800">
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />La politica <strong>deja de ser visible en el sitio publico</strong>, pero no se elimina ni archiva.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />Sigue apareciendo aqui en el panel admin con el estado <strong>"Oculta"</strong>.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />Puedes <strong>volver a publicarla</strong> con un clic cuando estes listo.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />Util para <strong>pausar una politica temporalmente</strong> sin perder su historial ni configuracion.</li>
              </ul>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmHide(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleHide(confirmHide)} disabled={!!busy} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <EyeOff size={14} /> Ocultar
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Políticas</h1>
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

        {/* Table / Grid card */}
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
            <div className="flex items-center gap-2 flex-wrap">
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
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto sm:ml-0">
                <button
                  onClick={() => setViewMode('list')}
                  title="Vista lista"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#0A2647] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  title="Vista tarjetas"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#0A2647] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Column headers — list mode only */}
          {!loading && filtered.length > 0 && viewMode === 'list' && (
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
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-gray-50">
              {paginated.map(policy => {
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
                        POL-{String(policy.policy_number).padStart(5, '0')}
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
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {policy.status === 'deleted' ? (
                        <>
                          <LabelBtn onClick={() => updateStatus(policy.id, 'hidden', { deleted_at: null } as Partial<Policy>)} icon={<RotateCcw size={13} />} label="Restaurar" color="emerald" />
                          <LabelBtn onClick={() => handleHardDelete(policy.id)} icon={<Trash2 size={13} />} label="Eliminar" color="red" />
                        </>
                      ) : (
                        <>
                          <LabelBtn onClick={() => navigate(`/politicas/${policy.slug}`)} icon={<Eye size={13} />} label="Ver" color="sky" />
                          <LabelBtn onClick={() => { setSendType('nueva'); setSendPolicy(policy); }} icon={<Send size={13} />} label="Enviar" color="emerald" />
                          {policy.status === 'published' ? (
                            <LabelBtn onClick={() => setConfirmHide(policy)} icon={<EyeOff size={13} />} label="Ocultar" color="amber" />
                          ) : policy.status === 'hidden' ? (
                            <LabelBtn onClick={() => updateStatus(policy.id, 'published')} icon={<Eye size={13} />} label="Publicar" color="emerald" />
                          ) : null}
                          {policy.status !== 'archived' && (
                            <LabelBtn onClick={() => setConfirmArchive(policy)} icon={<Archive size={13} />} label="Archivar" color="sky" />
                          )}
                          <LabelBtn onClick={() => navigate(`/admin/editar/${policy.id}`)} icon={<Pencil size={13} />} label="Editar" color="slate" />
                          <LabelBtn onClick={() => setConfirmDelete(policy.id)} icon={<Trash2 size={13} />} label="Papelera" color="red" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid view */
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map(policy => {
                const isBusy = busy === policy.id;
                const sm = STATUS_META[policy.status ?? (policy.is_published ? 'published' : 'hidden')];
                return (
                  <div key={policy.id} className={`relative group ${isBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                    <PolicyCard policy={policy} navigate={navigate} />
                    {/* Admin overlay */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sm.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                        {sm.label}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 rounded-b-2xl px-3 py-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                      {policy.status === 'deleted' ? (
                        <>
                          <LabelBtn onClick={() => updateStatus(policy.id, 'hidden', { deleted_at: null } as Partial<Policy>)} icon={<RotateCcw size={12} />} label="Restaurar" color="emerald" />
                          <LabelBtn onClick={() => handleHardDelete(policy.id)} icon={<Trash2 size={12} />} label="Eliminar" color="red" />
                        </>
                      ) : (
                        <>
                          <LabelBtn onClick={() => navigate(`/politicas/${policy.slug}`)} icon={<Eye size={12} />} label="Ver" color="sky" />
                          <LabelBtn onClick={() => { setSendType('nueva'); setSendPolicy(policy); }} icon={<Send size={12} />} label="Enviar" color="emerald" />
                          {policy.status === 'published' ? (
                            <LabelBtn onClick={() => setConfirmHide(policy)} icon={<EyeOff size={12} />} label="Ocultar" color="amber" />
                          ) : policy.status === 'hidden' ? (
                            <LabelBtn onClick={() => updateStatus(policy.id, 'published')} icon={<Eye size={12} />} label="Publicar" color="emerald" />
                          ) : null}
                          {policy.status !== 'archived' && (
                            <LabelBtn onClick={() => setConfirmArchive(policy)} icon={<Archive size={12} />} label="Archivar" color="sky" />
                          )}
                          <LabelBtn onClick={() => navigate(`/admin/editar/${policy.id}`)} icon={<Pencil size={12} />} label="Editar" color="slate" />
                          <LabelBtn onClick={() => setConfirmDelete(policy.id)} icon={<Trash2 size={12} />} label="Papelera" color="red" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: counter + pagination */}
          {filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Mostrando <strong className="text-slate-600">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de <strong className="text-slate-600">{filtered.length}</strong> {filtered.length === 1 ? 'politica' : 'politicas'}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={13} />
                    Anterior
                  </button>
                  {pageNumbers.map((n, i) =>
                    n === '…' ? (
                      <span key={`e-${i}`} className="px-1.5 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                          safePage === n
                            ? 'bg-[#0A2647] text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647]'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}

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

const LABEL_BTN_MAP: Record<string, string> = {
  emerald: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200',
  sky:     'text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200',
  amber:   'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200',
  slate:   'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200',
  red:     'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200',
};

function LabelBtn({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${LABEL_BTN_MAP[color] ?? LABEL_BTN_MAP.slate}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default AdminDashboard;
