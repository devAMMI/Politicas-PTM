import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, CheckCircle, Clock, AlertCircle, User, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Evaluation } from '../types';

interface EvaluationListProps {
  navigate: (to: string) => void;
}

const EvaluationList: React.FC<EvaluationListProps> = ({ navigate }) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'completed'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchEvaluations(); }, []);

  const fetchEvaluations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEvaluations(data as Evaluation[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('evaluations').delete().eq('id', id);
    setDeleting(false);
    setConfirmDelete(null);
    if (!error) {
      setEvaluations(prev => prev.filter(e => e.id !== id));
      showToast('success', 'Evaluacion eliminada.');
    } else {
      showToast('error', 'Error al eliminar.');
    }
  };

  const filtered = evaluations.filter(e => {
    const matchSearch = e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_department.toLowerCase().includes(search.toLowerCase()) ||
      e.period.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const completed = evaluations.filter(e => e.status === 'completed').length;
  const drafts = evaluations.filter(e => e.status === 'draft').length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });

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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Eliminar Evaluacion</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Esta accion es irreversible. Se eliminara la evaluacion y todos sus datos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
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
            <h1 className="text-2xl font-bold text-slate-800">Evaluaciones de Desempeno</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestiona las evaluaciones del personal PTM</p>
          </div>
          <button
            onClick={() => navigate('/panel/evaluaciones/nueva')}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all hover:shadow-lg"
          >
            <Plus size={16} />
            Nueva evaluacion
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: evaluations.length, icon: <ClipboardList size={18} />, color: 'text-[#0A2647] bg-blue-50' },
            { label: 'Completadas', value: completed, icon: <CheckCircle size={18} />, color: 'text-emerald-700 bg-emerald-50' },
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
                placeholder="Buscar por colaborador, departamento o periodo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'completed', 'draft'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === f ? 'bg-[#0A2647] text-white' : 'text-slate-600 border border-gray-200 hover:bg-slate-50'}`}
                >
                  {f === 'all' ? 'Todas' : f === 'completed' ? 'Completadas' : 'Borradores'}
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
              <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hay evaluaciones</p>
              <p className="text-slate-400 text-sm mt-1">Crea la primera evaluacion para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(ev => (
                <div key={ev.id} className="flex items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-10 h-10 bg-[#0A2647]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-[#0A2647]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">{ev.employee_name || 'Sin nombre'}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ev.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ev.status === 'completed' ? <><CheckCircle size={9} /> Completada</> : <><Clock size={9} /> Borrador</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-400">{ev.employee_position}</span>
                      {ev.employee_department && <span className="text-xs text-slate-400">&bull; {ev.employee_department}</span>}
                      <span className="text-xs text-slate-400">&bull; {ev.period}</span>
                      <span className="text-xs text-slate-400">&bull; {formatDate(ev.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/panel/evaluaciones/ver/${ev.id}`)}
                      title="Vista previa"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/panel/evaluaciones/editar/${ev.id}`)}
                      title="Editar"
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(ev.id)}
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

export default EvaluationList;
