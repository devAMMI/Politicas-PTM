import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, FolderOpen, Folder, FileText, ChevronRight, Search,
  RotateCcw, Trash2, Eye, EyeOff, Archive, CheckCircle, AlertCircle,
  Calendar, Filter, Copy, ExternalLink, Tag, Hash,
  LayoutGrid, List, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, PolicyStatus, CATEGORIES, buildDocCleanUrl } from '../types';

interface AdminArchiveProps {
  navigate: (to: string) => void;
}

type StatusTab = 'all' | PolicyStatus;
type SortKey = 'policy_number' | 'title' | 'published_at' | 'category';
type ViewMode = 'folders' | 'list';

const STATUS_META: Record<PolicyStatus, { label: string; dot: string; badge: string }> = {
  published: { label: 'Publicada',  dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' },
  hidden:    { label: 'Oculta',     dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200' },
  archived:  { label: 'Archivada',  dot: 'bg-sky-500',     badge: 'text-sky-700 bg-sky-50 ring-1 ring-sky-200' },
  deleted:   { label: 'Papelera',   dot: 'bg-red-400',     badge: 'text-red-600 bg-red-50 ring-1 ring-red-200' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Calidad e Inocuidad':  'text-emerald-600 bg-emerald-50',
  'Seguridad Industrial': 'text-amber-600 bg-amber-50',
  'Recursos Humanos':     'text-blue-600 bg-blue-50',
  'Operaciones':          'text-cyan-600 bg-cyan-50',
  'Medio Ambiente':       'text-teal-600 bg-teal-50',
  'General':              'text-slate-600 bg-slate-100',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}
function polNum(n: number) {
  return `POL-${String(n).padStart(5, '0')}`;
}

const AdminArchive: React.FC<AdminArchiveProps> = ({ navigate }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [sortKey, setSortKey] = useState<SortKey>('policy_number');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('policy_number', { ascending: true });
    if (data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const toast$ = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3200);
  };

  const updateStatus = async (id: string, status: PolicyStatus, extra: Partial<Policy> = {}) => {
    setBusy(id);
    const { error } = await supabase
      .from('policies')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id);
    if (!error) {
      setPolicies(prev => prev.map(p =>
        p.id === id ? { ...p, status, is_published: status === 'published', ...extra } as Policy : p
      ));
      toast$('success', `Movido a "${STATUS_META[status].label}"`);
    } else {
      toast$('error', 'No se pudo actualizar.');
    }
    setBusy(null);
  };

  const hardDelete = async (id: string) => {
    if (!confirm('Eliminar permanentemente. Esta accion no puede deshacerse.')) return;
    setBusy(id);
    const { error } = await supabase.from('policies').delete().eq('id', id);
    if (!error) {
      setPolicies(prev => prev.filter(p => p.id !== id));
      toast$('success', 'Eliminado permanentemente.');
    } else {
      toast$('error', 'No se pudo eliminar.');
    }
    setBusy(null);
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(`/docs/${path}`).catch(() => {});
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };

  const counts = useMemo(() => ({
    all:       policies.length,
    published: policies.filter(p => p.status === 'published').length,
    hidden:    policies.filter(p => p.status === 'hidden').length,
    archived:  policies.filter(p => p.status === 'archived').length,
    deleted:   policies.filter(p => p.status === 'deleted').length,
  }), [policies]);

  const filtered = useMemo(() => {
    return policies
      .filter(p => {
        if (statusTab !== 'all' && p.status !== statusTab) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.department ?? '').toLowerCase().includes(q) ||
            String(p.policy_number).includes(q) ||
            (p.document_clean_path ?? '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'policy_number') return a.policy_number - b.policy_number;
        if (sortKey === 'title') return a.title.localeCompare(b.title, 'es');
        if (sortKey === 'published_at') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        if (sortKey === 'category') return a.category.localeCompare(b.category, 'es');
        return 0;
      });
  }, [policies, statusTab, selectedCategory, search, sortKey]);

  const tree = useMemo(() => {
    const t: Record<string, Record<string, Policy[]>> = {};
    filtered.forEach(p => {
      const yr = new Date(p.published_at).getFullYear().toString();
      if (!t[p.category]) t[p.category] = {};
      if (!t[p.category][yr]) t[p.category][yr] = [];
      t[p.category][yr].push(p);
    });
    return t;
  }, [filtered]);

  const toggle = (key: string) => {
    setExpandedFolders(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const expandAll = () => {
    const keys = new Set<string>();
    Object.keys(tree).forEach(cat => {
      keys.add(cat);
      Object.keys(tree[cat]).forEach(yr => keys.add(`${cat}/${yr}`));
    });
    setExpandedFolders(keys);
  };
  const collapseAll = () => setExpandedFolders(new Set());

  /* ── Sub-components ── */
  const StatusBadge = ({ status }: { status: PolicyStatus }) => {
    const m = STATUS_META[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${m.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
        {m.label}
      </span>
    );
  };

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    amber:   'text-amber-500 hover:bg-amber-50',
    blue:    'text-blue-500 hover:bg-blue-50',
    slate:   'text-slate-400 hover:bg-slate-100',
    red:     'text-red-400 hover:bg-red-50',
  };
  const Btn = ({ icon, label, color, disabled, onClick }: { icon: React.ReactNode; label: string; color: string; disabled: boolean; onClick: () => void }) => (
    <button title={label} onClick={onClick} disabled={disabled} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${colorMap[color]}`}>
      {icon}
    </button>
  );

  const ActionRow = ({ p }: { p: Policy }) => {
    const isBusy = busy === p.id;
    return (
      <div className="flex items-center gap-0.5">
        {p.status === 'deleted' ? (
          <>
            <Btn icon={<RotateCcw size={13} />} label="Restaurar" color="emerald" disabled={isBusy} onClick={() => updateStatus(p.id, 'hidden', { deleted_at: null } as Partial<Policy>)} />
            <Btn icon={<Trash2 size={13} />} label="Eliminar" color="red" disabled={isBusy} onClick={() => hardDelete(p.id)} />
          </>
        ) : (
          <>
            {p.status !== 'published' && <Btn icon={<Eye size={13} />} label="Publicar" color="emerald" disabled={isBusy} onClick={() => updateStatus(p.id, 'published')} />}
            {p.status !== 'hidden'    && <Btn icon={<EyeOff size={13} />} label="Ocultar" color="amber" disabled={isBusy} onClick={() => updateStatus(p.id, 'hidden')} />}
            {p.status !== 'archived'  && <Btn icon={<Archive size={13} />} label="Archivar" color="blue" disabled={isBusy} onClick={() => updateStatus(p.id, 'archived', { archived_at: new Date().toISOString() })} />}
            <Btn icon={<FileText size={13} />} label="Editar" color="slate" disabled={isBusy} onClick={() => navigate(`/admin/editar/${p.id}`)} />
            <Btn icon={<Trash2 size={13} />} label="Papelera" color="red" disabled={isBusy} onClick={() => updateStatus(p.id, 'deleted', { deleted_at: new Date().toISOString() })} />
          </>
        )}
      </div>
    );
  };

  const PolicyRow = ({ p, indent = false }: { p: Policy; indent?: boolean }) => {
    const cleanUrl = p.document_clean_path ? buildDocCleanUrl(p.document_clean_path) : null;
    const catColor = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS['General'];

    return (
      <div className={`group flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors border-b border-gray-50 last:border-0 ${indent ? 'pl-16' : ''}`}>
        <div className="mt-0.5 w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
          <FileText size={14} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
              {polNum(p.policy_number)}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">{p.title}</span>
            <StatusBadge status={p.status} />
            {p.version && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">v{p.version}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${catColor}`}>
              <Tag size={9} />{p.category}
            </span>
            {p.department && <span className="text-xs text-slate-400">{p.department}</span>}
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={9} />{fmt(p.published_at)}
            </span>
            {p.author_name && <span className="text-xs text-slate-400">{p.author_name}</span>}
          </div>
          {cleanUrl && (
            <div className="flex items-center gap-1.5 group/path">
              <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono truncate max-w-xs sm:max-w-sm md:max-w-lg group-hover/path:text-[#0A2647] transition-colors">
                {cleanUrl}
              </code>
              <button onClick={() => copyPath(p.document_clean_path!)} title="Copiar ruta" className="opacity-0 group-hover/path:opacity-100 p-1 rounded text-slate-400 hover:text-[#0A2647] hover:bg-slate-200 transition-all">
                {copied === p.document_clean_path ? <CheckCircle size={11} className="text-emerald-500" /> : <Copy size={11} />}
              </button>
              <a href={cleanUrl} target="_blank" rel="noopener noreferrer" title="Abrir documento" className="opacity-0 group-hover/path:opacity-100 p-1 rounded text-slate-400 hover:text-[#0A2647] hover:bg-slate-200 transition-all">
                <ExternalLink size={11} />
              </a>
            </div>
          )}
          {!cleanUrl && p.document_url && (
            <span className="text-xs text-amber-500 italic">Sin ruta limpia — re-sube el documento para generarla</span>
          )}
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionRow p={p} />
        </div>
      </div>
    );
  };

  const STATUS_TABS: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all',       label: 'Todas',     count: counts.all },
    { key: 'published', label: 'Publicadas', count: counts.published },
    { key: 'hidden',    label: 'Ocultas',    count: counts.hidden },
    { key: 'archived',  label: 'Archivadas', count: counts.archived },
    { key: 'deleted',   label: 'Papelera',   count: counts.deleted },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center gap-4 mb-7">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Gobierno Corporativo</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Repositorio</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('folders')}
              title="Vista carpetas"
              className={`p-2.5 rounded-xl border text-sm transition-all ${viewMode === 'folders' ? 'bg-[#0A2647] border-[#0A2647] text-white shadow-sm' : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vista lista"
              className={`p-2.5 rounded-xl border text-sm transition-all ${viewMode === 'list' ? 'bg-[#0A2647] border-[#0A2647] text-white shadow-sm' : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300'}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                statusTab === t.key
                  ? 'bg-[#0A2647] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-slate-600 hover:border-gray-300 hover:text-slate-800'
              }`}
            >
              {t.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${statusTab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-4 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre, categoria, ruta, numero..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400 flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
            >
              <option value="all">Todas las categorias</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
            >
              <option value="policy_number">Ordenar: Numero</option>
              <option value="title">Ordenar: Nombre</option>
              <option value="published_at">Ordenar: Fecha</option>
              <option value="category">Ordenar: Categoria</option>
            </select>
          </div>
          {viewMode === 'folders' && (
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={expandAll} className="text-xs text-slate-500 hover:text-[#0A2647] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">Expandir</button>
              <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-[#0A2647] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">Colapsar</button>
            </div>
          )}
        </div>

        {/* Papelera warning */}
        {statusTab === 'deleted' && counts.deleted > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4 flex items-start gap-3">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 size={13} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Papelera de politicas</p>
              <p className="text-xs text-red-500 mt-0.5 leading-relaxed">Los documentos en papelera pueden restaurarse o eliminarse definitivamente. La eliminacion permanente no puede deshacerse.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Cargando repositorio...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold">Sin resultados</p>
            <p className="text-slate-400 text-sm mt-1.5">Ajusta los filtros o el termino de busqueda</p>
          </div>

        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-slate-400">Vista de lista</span>
            </div>
            {filtered.map(p => <PolicyRow key={p.id} p={p} />)}
          </div>

        ) : (
          <div className="space-y-3">
            {Object.keys(tree).sort().map(category => {
              const catPolicies = Object.values(tree[category]).flat();
              const catExpanded = expandedFolders.has(category);
              const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['General'];
              const catCounts = catPolicies.reduce((acc, p) => {
                acc[p.status] = (acc[p.status] ?? 0) + 1;
                return acc;
              }, {} as Record<PolicyStatus, number>);

              return (
                <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggle(category)}
                    className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor}`}>
                      {catExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-800 text-sm">{category}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {catPolicies.length} politica{catPolicies.length !== 1 ? 's' : ''} &bull; {Object.keys(tree[category]).length} periodo{Object.keys(tree[category]).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mr-3 flex-wrap justify-end">
                      {(Object.entries(catCounts) as [PolicyStatus, number][]).map(([s, c]) => (
                        <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[s].badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />{c}
                        </span>
                      ))}
                    </div>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${catExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {catExpanded && (
                    <div className="border-t border-gray-100">
                      {Object.keys(tree[category]).sort((a, b) => Number(b) - Number(a)).map(year => {
                        const yrKey = `${category}/${year}`;
                        const yrExpanded = expandedFolders.has(yrKey);
                        const yrPolicies = tree[category][year];

                        return (
                          <div key={year}>
                            <button
                              onClick={() => toggle(yrKey)}
                              className="w-full flex items-center gap-3 px-5 py-3 pl-16 hover:bg-slate-50/60 transition-colors border-b border-gray-50"
                            >
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {yrExpanded ? <FolderOpen size={11} className="text-slate-500" /> : <Folder size={11} className="text-slate-500" />}
                              </div>
                              <div className="flex items-center gap-2 flex-1 text-left">
                                <span className="text-sm font-semibold text-slate-600">{year}</span>
                                <span className="text-xs text-slate-400">— {yrPolicies.length} archivo{yrPolicies.length !== 1 ? 's' : ''}</span>
                              </div>
                              <code className="hidden md:block text-xs text-slate-300 font-mono mr-3">
                                PTM / {category} / {year}
                              </code>
                              <ChevronRight size={12} className={`text-slate-300 transition-transform duration-200 flex-shrink-0 ${yrExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {yrExpanded && (
                              <div>
                                {yrPolicies
                                  .sort((a, b) => a.policy_number - b.policy_number)
                                  .map(p => <PolicyRow key={p.id} p={p} indent />)
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Storage path reference */}
        <div className="mt-6 bg-slate-900 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={13} className="text-slate-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estructura del repositorio</p>
          </div>
          <div className="font-mono text-xs space-y-1.5 leading-relaxed">
            <p className="text-slate-500">politicas-ptm.vercel.app/</p>
            <div className="pl-4 border-l border-slate-700 ml-2 space-y-1">
              <p><span className="text-slate-400">docs/</span></p>
              <div className="pl-4 border-l border-slate-700 ml-2 space-y-1">
                <p><span className="text-slate-400">politicas/</span></p>
                <div className="pl-4 border-l border-slate-700 ml-2 space-y-1">
                  <p className="text-sky-400">RRHH/ <span className="text-slate-500">← Recursos Humanos</span></p>
                  <p className="text-sky-400">Calidad/ <span className="text-slate-500">← Calidad e Inocuidad</span></p>
                  <p className="text-sky-400">Seguridad/ <span className="text-slate-500">← Seguridad Industrial</span></p>
                  <p className="text-sky-400">Operaciones/ <span className="text-slate-500">← Operaciones</span></p>
                  <p className="text-sky-400">MedioAmbiente/ <span className="text-slate-500">← Medio Ambiente</span></p>
                  <div className="pl-4 border-l border-slate-700 ml-2 space-y-1">
                    <p><span className="text-emerald-400">{'{Departamento}/'}</span></p>
                    <div className="pl-4 border-l border-slate-700 ml-2">
                      <p className="text-yellow-300">{'{nombre-politica}-{dia}-{mes}-{año}.pdf'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/60">
            <p className="text-xs text-slate-500">
              Ejemplo: <code className="text-emerald-400">/docs/politicas/RRHH/PTM/conflicto-de-interes-8-mayo-2026.pdf</code>
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total documentos',  value: counts.all,                                          sub: 'en el repositorio' },
            { label: 'Publicadas',        value: counts.published,                                    sub: 'visibles publicamente' },
            { label: 'Con ruta limpia',   value: policies.filter(p => !!p.document_clean_path).length, sub: 'URL estructurada' },
            { label: 'Sin documento',     value: policies.filter(p => !p.document_url).length,        sub: 'falta adjuntar PDF' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminArchive;
