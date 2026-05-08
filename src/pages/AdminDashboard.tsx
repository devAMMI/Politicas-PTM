import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, FileText, Calendar, CheckCircle, Clock, AlertCircle, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy } from '../types';

interface AdminDashboardProps {
  navigate: (to: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const togglePublish = async (policy: Policy) => {
    const { error } = await supabase
      .from('policies')
      .update({ is_published: !policy.is_published })
      .eq('id', policy.id);
    if (!error) {
      setPolicies(prev => prev.map(p => p.id === policy.id ? { ...p, is_published: !p.is_published } : p));
      showToast('success', policy.is_published ? 'Politica ocultada.' : 'Politica publicada.');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('policies').delete().eq('id', id);
    setDeleting(null);
    setConfirmDelete(null);
    if (!error) {
      setPolicies(prev => prev.filter(p => p.id !== id));
      showToast('success', 'Politica eliminada.');
    } else {
      showToast('error', 'Error al eliminar la politica.');
    }
  };

  const filtered = policies.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'published' ? p.is_published : !p.is_published);
    return matchSearch && matchFilter;
  });

  const published = policies.filter(p => p.is_published).length;
  const drafts = policies.filter(p => !p.is_published).length;

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
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Eliminar Politica</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Esta accion es irreversible. Se eliminara permanentemente la politica y sus archivos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Politicas PTM</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestiona las politicas publicadas en el portal</p>
          </div>
          <button
            onClick={() => navigate('/panel/nueva')}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all hover:shadow-lg"
          >
            <Plus size={16} />
            Nueva politica
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: policies.length, icon: <FileText size={18} />, color: 'text-[#0A2647] bg-blue-50' },
            { label: 'Publicadas', value: published, icon: <CheckCircle size={18} />, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Borradores', value: drafts, icon: <Clock size={18} />, color: 'text-amber-700 bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por titulo o categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'published', 'draft'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === f ? 'bg-[#0A2647] text-white' : 'text-slate-600 border border-gray-200 hover:bg-slate-50'}`}
                >
                  {f === 'all' ? 'Todas' : f === 'published' ? 'Publicadas' : 'Borradores'}
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
              <p className="text-slate-500 font-medium">No hay politicas</p>
              <p className="text-slate-400 text-sm mt-1">Crea la primera politica para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(policy => (
                <div key={policy.id} className="flex items-start sm:items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                  {policy.cover_image_url ? (
                    <img src={policy.cover_image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 hidden sm:block">
                      <FileText size={20} className="text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      {policy.policy_number && (
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-600">
                          POL-{String(policy.policy_number).padStart(4, '0')}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-1">{policy.title}</h3>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${policy.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {policy.is_published ? <><CheckCircle size={9} /> Publicada</> : <><Clock size={9} /> Borrador</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Tag size={10} /> {policy.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Calendar size={10} /> {formatDate(policy.published_at)}
                      </span>
                      {policy.document_url && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                          <FileText size={10} /> PDF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => togglePublish(policy)}
                      title={policy.is_published ? 'Ocultar' : 'Publicar'}
                      className={`p-2 rounded-lg transition-colors ${policy.is_published ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      {policy.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      onClick={() => navigate(`/panel/editar/${policy.id}`)}
                      title="Editar"
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(policy.id)}
                      title="Eliminar"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
