import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, Eye, EyeOff, FileText, Calendar,
  CheckCircle, Clock, AlertCircle, Tag, Archive, FolderOpen, RotateCcw,
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

const STATUS_META: Record<PolicyStatus, { label: string; color: string }> = {
  published: { label: 'Publicada', color: 'bg-emerald-100 text-emerald-700' },
  hidden:    { label: 'Oculta',    color: 'bg-amber-100 text-amber-700' },
  archived:  { label: 'Archivada', color: 'bg-blue-100 text-blue-700' },
  deleted:   { label: 'Papelera',  color: 'bg-red-100 text-red-600' },
};

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

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Mover a Papelera</h3>
            <p className="text-slate-500 text-sm text-center mb-6">La politica se movera a la papelera. Podras restaurarla o eliminarla permanentemente desde el Archivo.</p>
            <div className="flex gap-3">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Politicas PTM</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestiona las politicas del portal</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/panel/archivo')}
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
            >
              <FolderOpen size={15} />
              Archivo
            </button>
            <button
              onClick={() => navigate('/panel/nueva')}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all hover:shadow-lg"
            >
              <Plus size={16} />
              Nueva politica
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {([
            { label: 'Publicadas', value: counts.published, icon: <Eye size={16} />, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Ocultas',    value: counts.hidden,    icon: <EyeOff size={16} />, color: 'text-amber-700 bg-amber-50' },
            { label: 'Archivadas', value: counts.archived,  icon: <Archive size={16} />, color: 'text-blue-700 bg-blue-50' },
            { label: 'Papelera',   value: counts.deleted,   icon: <Trash2 size={16} />, color: 'text-red-600 bg-red-50' },
          ]).map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por titulo o categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {([
                { key: 'all',       label: 'Todas' },
                { key: 'published', label: 'Publicadas' },
                { key: 'hidden',    label: 'Ocultas' },
                { key: 'archived',  label: 'Archivadas' },
                { key: 'deleted',   label: 'Papelera' },
              ] as { key: StatusFilter; label: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === f.key ? 'bg-[#0A2647] text-white' : 'text-slate-600 border border-gray-200 hover:bg-slate-50'}`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {counts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hay politicas en esta vista</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'deleted' ? 'La papelera esta vacia.' : 'Ajusta los filtros o crea una nueva politica.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(policy => {
                const isBusy = busy === policy.id;
                const statusMeta = STATUS_META[policy.status ?? (policy.is_published ? 'published' : 'hidden')];
                return (
                  <div key={policy.id} className="flex items-start sm:items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                    {/* Cover */}
                    {policy.cover_image_url ? (
                      <img src={policy.cover_image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 hidden sm:block">
                        <FileText size={18} className="text-slate-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {policy.policy_number && (
                          <span className="flex-shrink-0 font-mono text-xs font-bold text-slate-400">
                            POL-{String(policy.policy_number).padStart(4, '0')}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{policy.title}</h3>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        {policy.version && (
                          <span className="text-xs text-slate-400">v{policy.version}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Tag size={9} /> {policy.category}
                        </span>
                        {policy.department && (
                          <span className="text-xs text-slate-400">{policy.department}</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Calendar size={9} /> {formatDate(policy.published_at)}
                        </span>
                        {policy.document_url && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                            <FileText size={9} /> PDF
                          </span>
                        )}
                        {policy.status === 'deleted' && policy.deleted_at && (
                          <span className="text-xs text-red-400">Eliminado: {formatDate(policy.deleted_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {policy.status === 'deleted' ? (
                        <>
                          <button
                            onClick={() => updateStatus(policy.id, 'hidden', { deleted_at: null } as Partial<Policy>)}
                            disabled={isBusy}
                            title="Restaurar"
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => handleHardDelete(policy.id)}
                            disabled={isBusy}
                            title="Eliminar permanentemente"
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => updateStatus(policy.id, policy.status === 'published' ? 'hidden' : 'published')}
                            disabled={isBusy}
                            title={policy.status === 'published' ? 'Ocultar' : 'Publicar'}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${policy.status === 'published' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                          >
                            {policy.status === 'published' ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={() => updateStatus(policy.id, 'archived', { archived_at: new Date().toISOString() })}
                            disabled={isBusy}
                            title="Archivar"
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/panel/editar/${policy.id}`)}
                            disabled={isBusy}
                            title="Editar"
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(policy.id)}
                            title="Mover a papelera"
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer with total */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">{filtered.length} de {policies.length} politicas</span>
              <button
                onClick={() => navigate('/panel/archivo')}
                className="inline-flex items-center gap-1.5 text-xs text-[#0A2647] hover:underline font-medium"
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

export default AdminDashboard;
