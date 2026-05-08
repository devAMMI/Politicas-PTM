import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, FolderOpen, Folder, FileText, ChevronRight, Search,
  RotateCcw, Trash2, Eye, EyeOff, Archive, CheckCircle, AlertCircle,
  Calendar, Hash, Tag, LayoutGrid, List, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, PolicyStatus, CATEGORIES } from '../types';

interface AdminArchiveProps {
  navigate: (to: string) => void;
}

type ViewMode = 'folders' | 'list';
type StatusTab = 'all' | PolicyStatus;

const STATUS_META: Record<PolicyStatus, { label: string; color: string; icon: React.ReactNode }> = {
  published: { label: 'Publicada',  color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <Eye size={11} /> },
  hidden:    { label: 'Oculta',     color: 'text-amber-600 bg-amber-50 border-amber-200',       icon: <EyeOff size={11} /> },
  archived:  { label: 'Archivada',  color: 'text-blue-600 bg-blue-50 border-blue-200',          icon: <Archive size={11} /> },
  deleted:   { label: 'Papelera',   color: 'text-red-600 bg-red-50 border-red-200',             icon: <Trash2 size={11} /> },
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

const AdminArchive: React.FC<AdminArchiveProps> = ({ navigate }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('policy_number', { ascending: true });
    if (data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3500);
  };

  const updateStatus = async (id: string, status: PolicyStatus, extra: Partial<Policy> = {}) => {
    setBusy(id);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString(), ...extra };
    const { error } = await supabase.from('policies').update(patch).eq('id', id);
    if (error) {
      showToast('error', 'No se pudo actualizar.');
    } else {
      setPolicies(prev => prev.map(p => p.id === id ? { ...p, status, ...extra } as Policy : p));
      showToast('success', `Estado actualizado a "${STATUS_META[status].label}".`);
    }
    setBusy(null);
  };

  const hardDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente? Esta accion no se puede deshacer.')) return;
    setBusy(id);
    const { error } = await supabase.from('policies').delete().eq('id', id);
    if (error) {
      showToast('error', 'No se pudo eliminar.');
    } else {
      setPolicies(prev => prev.filter(p => p.id !== id));
      showToast('success', 'Politica eliminada permanentemente.');
    }
    setBusy(null);
  };

  const filtered = useMemo(() => {
    return policies.filter(p => {
      if (statusTab !== 'all' && p.status !== statusTab) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.department ?? '').toLowerCase().includes(q) ||
          String(p.policy_number).includes(q)
        );
      }
      return true;
    });
  }, [policies, statusTab, selectedCategory, search]);

  // Build folder tree: category → year → policies
  const folderTree = useMemo(() => {
    const tree: Record<string, Record<string, Policy[]>> = {};
    filtered.forEach(p => {
      const year = new Date(p.published_at).getFullYear().toString();
      if (!tree[p.category]) tree[p.category] = {};
      if (!tree[p.category][year]) tree[p.category][year] = [];
      tree[p.category][year].push(p);
    });
    return tree;
  }, [filtered]);

  const counts = useMemo(() => ({
    all:       policies.length,
    published: policies.filter(p => p.status === 'published').length,
    hidden:    policies.filter(p => p.status === 'hidden').length,
    archived:  policies.filter(p => p.status === 'archived').length,
    deleted:   policies.filter(p => p.status === 'deleted').length,
  }), [policies]);

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const StatusBadge = ({ status }: { status: PolicyStatus }) => {
    const m = STATUS_META[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.color}`}>
        {m.icon}{m.label}
      </span>
    );
  };

  const ActionButtons = ({ policy }: { policy: Policy }) => {
    const isBusy = busy === policy.id;
    return (
      <div className="flex items-center gap-1">
        {policy.status === 'deleted' ? (
          <>
            <button
              onClick={() => updateStatus(policy.id, 'hidden')}
              disabled={isBusy}
              title="Restaurar"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => hardDelete(policy.id)}
              disabled={isBusy}
              title="Eliminar permanentemente"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <>
            {policy.status !== 'published' && (
              <button
                onClick={() => updateStatus(policy.id, 'published')}
                disabled={isBusy}
                title="Publicar"
                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
              >
                <Eye size={13} />
              </button>
            )}
            {policy.status !== 'hidden' && (
              <button
                onClick={() => updateStatus(policy.id, 'hidden')}
                disabled={isBusy}
                title="Ocultar"
                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 disabled:opacity-40 transition-colors"
              >
                <EyeOff size={13} />
              </button>
            )}
            {policy.status !== 'archived' && (
              <button
                onClick={() => updateStatus(policy.id, 'archived', { archived_at: new Date().toISOString() })}
                disabled={isBusy}
                title="Archivar"
                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 disabled:opacity-40 transition-colors"
              >
                <Archive size={13} />
              </button>
            )}
            <button
              onClick={() => navigate(`/admin/editar/${policy.id}`)}
              disabled={isBusy}
              title="Editar"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <FileText size={13} />
            </button>
            <button
              onClick={() => updateStatus(policy.id, 'deleted', { deleted_at: new Date().toISOString() })}
              disabled={isBusy}
              title="Mover a papelera"
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    );
  };

  const PolicyRow = ({ policy }: { policy: Policy }) => (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors border-b border-gray-50 last:border-0 group">
      <div className="w-6 h-6 bg-red-50 rounded flex items-center justify-center flex-shrink-0">
        <FileText size={12} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-slate-400 flex-shrink-0">
            POL-{String(policy.policy_number).padStart(4, '0')}
          </span>
          <span className="text-sm font-medium text-slate-800 truncate">{policy.title}</span>
          <StatusBadge status={policy.status} />
          {policy.version && (
            <span className="text-xs text-slate-400">v{policy.version}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {policy.department && (
            <span className="text-xs text-slate-400">{policy.department}</span>
          )}
          {policy.document_url && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <FileText size={10} /> PDF adjunto
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar size={10} /> {formatDate(policy.published_at)}
          </span>
          {policy.status === 'deleted' && policy.deleted_at && (
            <span className="text-xs text-red-400">Eliminado: {formatDate(policy.deleted_at)}</span>
          )}
          {policy.status === 'archived' && policy.archived_at && (
            <span className="text-xs text-blue-400">Archivado: {formatDate(policy.archived_at)}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionButtons policy={policy} />
      </div>
      <div className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {/* Always visible on mobile */}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">Archivo de Politicas</h1>
            <p className="text-sm text-slate-500">Biblioteca organizada — control completo de ciclo de vida</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('folders')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'folders' ? 'bg-[#0A2647] text-white' : 'text-slate-500 hover:bg-white'}`}
              title="Vista carpetas"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0A2647] text-white' : 'text-slate-500 hover:bg-white'}`}
              title="Vista lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Status tabs + counts */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {([
            { key: 'all',       label: 'Todas',      count: counts.all },
            { key: 'published', label: 'Publicadas',  count: counts.published },
            { key: 'hidden',    label: 'Ocultas',     count: counts.hidden },
            { key: 'archived',  label: 'Archivadas',  count: counts.archived },
            { key: 'deleted',   label: 'Papelera',    count: counts.deleted },
          ] as { key: StatusTab; label: string; count: number }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusTab === tab.key
                  ? 'bg-[#0A2647] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-gray-200 hover:border-[#0A2647]/30 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${statusTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + category filter */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoria, departamento o numero..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
            />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
            >
              <option value="all">Todas las categorias</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Deleted warning */}
        {statusTab === 'deleted' && counts.deleted > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
            <Trash2 size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Papelera</p>
              <p className="text-xs text-red-600 mt-0.5">
                Los archivos en papelera pueden restaurarse o eliminarse permanentemente. La eliminacion permanente no se puede deshacer.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0A2647] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <FolderOpen size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No se encontraron politicas</p>
            <p className="text-slate-400 text-sm mt-1">Ajusta los filtros o el termino de busqueda</p>
          </div>
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <Hash size={12} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{filtered.length} politicas</span>
            </div>
            {filtered.map(p => <PolicyRow key={p.id} policy={p} />)}
          </div>
        ) : (
          /* FOLDER VIEW */
          <div className="space-y-3">
            {Object.keys(folderTree).sort().map(category => (
              <div key={category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Category folder header */}
                <button
                  onClick={() => toggleFolder(category)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  {expandedFolders.has(category)
                    ? <FolderOpen size={18} className="text-[#0A2647] flex-shrink-0" />
                    : <Folder size={18} className="text-[#0A2647] flex-shrink-0" />
                  }
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-slate-800 text-sm">{category}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      {Object.values(folderTree[category]).flat().length} politica{Object.values(folderTree[category]).flat().length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {Object.values(folderTree[category]).flat().reduce((acc, p) => {
                      acc[p.status] = (acc[p.status] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string, number>) && (() => {
                      const counts2 = Object.values(folderTree[category]).flat().reduce((acc, p) => {
                        acc[p.status] = (acc[p.status] ?? 0) + 1;
                        return acc;
                      }, {} as Record<PolicyStatus, number>);
                      return (Object.entries(counts2) as [PolicyStatus, number][]).map(([s, c]) => (
                        <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_META[s].color}`}>
                          {STATUS_META[s].icon}{c}
                        </span>
                      ));
                    })()}
                  </div>
                  <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedFolders.has(category) ? 'rotate-90' : ''}`} />
                </button>

                {expandedFolders.has(category) && (
                  <div className="border-t border-gray-100">
                    {Object.keys(folderTree[category]).sort((a, b) => Number(b) - Number(a)).map(year => (
                      <div key={year}>
                        {/* Year sub-folder */}
                        <button
                          onClick={() => toggleFolder(`${category}/${year}`)}
                          className="w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-50/80 transition-colors border-b border-gray-50"
                        >
                          {expandedFolders.has(`${category}/${year}`)
                            ? <FolderOpen size={14} className="text-slate-400 flex-shrink-0" />
                            : <Folder size={14} className="text-slate-400 flex-shrink-0" />
                          }
                          <span className="text-sm text-slate-600 font-medium flex-1 text-left">{year}</span>
                          <span className="text-xs text-slate-400 mr-2">
                            {folderTree[category][year].length} archivos
                          </span>
                          <ChevronRight size={12} className={`text-slate-300 transition-transform ${expandedFolders.has(`${category}/${year}`) ? 'rotate-90' : ''}`} />
                        </button>

                        {expandedFolders.has(`${category}/${year}`) && (
                          <div className="pl-8 border-b border-gray-50">
                            {folderTree[category][year]
                              .sort((a, b) => a.policy_number - b.policy_number)
                              .map(p => (
                                <PolicyRow key={p.id} policy={p} />
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Storage path reference */}
        {statusTab !== 'deleted' && (
          <div className="mt-6 bg-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Estructura de almacenamiento</p>
            <div className="font-mono text-xs text-slate-300 space-y-1">
              <p className="text-slate-500">politicas/</p>
              <p className="text-slate-400 pl-4">documentos/PoliticaPTM/</p>
              <p className="text-slate-400 pl-8">{`{categoria}/`}</p>
              <p className="text-slate-300 pl-12">{`{año}/`}</p>
              <p className="text-emerald-400 pl-16">{`POL-{####}_{nombre-politica}/`}</p>
              <p className="text-emerald-300 pl-20">{`{nombre-politica}.pdf`}</p>
              <p className="text-slate-400 pl-4">portadas/PoliticaPTM/</p>
              <p className="text-slate-400 pl-8">{`{categoria}/{año}/POL-{####}_{nombre}/portada.{ext}`}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminArchive;
