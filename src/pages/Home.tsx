import React, { useEffect, useState } from 'react';
import { Search, Filter, ArrowLeft, LayoutGrid, List, ChevronLeft, ChevronRight, Calendar, FileText, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy } from '../types';
import PolicyCard from '../components/PolicyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ScrollToTop from '../components/ScrollToTop';

interface HomeProps {
  navigate: (to: string) => void;
  initialCategory?: string;
  showBackButton?: boolean;
}

interface DbCategory {
  id: string;
  name: string;
  color: string;
}

const PAGE_SIZE = 6;


function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

const Home: React.FC<HomeProps> = ({ navigate, initialCategory = 'Todas', showBackButton = true }) => {
  const [policies, setPolicies]             = useState<Policy[]>([]);
  const [dbCategories, setDbCategories]     = useState<DbCategory[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [page, setPage]                     = useState(1);

  useEffect(() => {
    setActiveCategory(initialCategory);
    setPage(1);
  }, [initialCategory]);

  useEffect(() => {
    fetchPolicies();
    supabase
      .from('categories')
      .select('id, name, color')
      .eq('is_active', true)
      .order('order_num')
      .then(({ data }) => { if (data) setDbCategories(data as DbCategory[]); });
  }, []);

  useEffect(() => { setPage(1); }, [search, activeCategory]);

  const fetchPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('status', 'published')
      .order('policy_number', { ascending: false });
    if (!error && data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const filtered = policies.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Todas' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const categoryNames = dbCategories.map(c => c.name);
  const categories = ['Todas', ...categoryNames];

  // Build color lookup by name for the list-view chip
  const colorByName: Record<string, string> = {};
  dbCategories.forEach(c => { colorByName[c.name] = c.color; });

  // Pagination page numbers (show max 5 around current)
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

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
      <ScrollToTop />
      <div id="politicas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Header */}
        <div className="mb-10">
          {showBackButton && (
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0A2647] text-sm font-medium mb-5 transition-colors group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
              Volver al inicio
            </button>
          )}
          <h2 className="text-2xl font-bold text-[#0A2647] mb-1">
            {initialCategory !== 'Todas' ? initialCategory : 'Políticas Publicadas'}
          </h2>
          <p className="text-slate-500 text-sm">
            {initialCategory !== 'Todas'
              ? 'Políticas de la categoria seleccionada'
              : 'Consulta la normativa interna vigente de PTM'}
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar politica..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={14} className="text-slate-400 mr-1" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-[#0A2647] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Cargando politicas..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No se encontraron politicas</p>
            <p className="text-slate-400 text-sm mt-1">Intenta con otros terminos o categorias</p>
          </div>
        ) : (
          <>
            {/* Toolbar: count + view toggle */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-slate-400">
                Mostrando <strong className="text-slate-600">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de <strong className="text-slate-600">{filtered.length}</strong> {filtered.length === 1 ? 'politica' : 'politicas'}
              </p>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Vista tarjetas"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#0A2647] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Vista lista"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#0A2647] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* Grid view */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} navigate={navigate} />
                ))}
              </div>
            )}

            {/* List view */}
            {viewMode === 'list' && (
              <div className="flex flex-col gap-3">
                {paginated.map(policy => {
                  const catColor = colorByName[policy.category] ?? '#64748b';
                  return (
                    <article
                      key={policy.id}
                      onClick={() => navigate(`/politicas/${policy.slug}`)}
                      className="group bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-[#0A2647]/20 transition-all duration-200 cursor-pointer flex gap-0 overflow-hidden"
                    >
                      {/* Cover thumbnail */}
                      {policy.cover_image_url ? (
                        <div className="w-28 sm:w-36 flex-shrink-0 overflow-hidden bg-slate-100">
                          <img
                            src={policy.cover_image_url}
                            alt={policy.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="w-1.5 flex-shrink-0 bg-gradient-to-b from-[#0A2647] to-[#205295]" />
                      )}

                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: `${catColor}18`, color: catColor }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
                              <Tag size={9} />
                              {policy.category}
                            </span>
                            {policy.policy_number && (
                              <span className="text-xs font-bold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                POL-{String(policy.policy_number).padStart(4, '0')}
                              </span>
                            )}
                            {policy.document_url && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileText size={11} />
                                PDF
                              </span>
                            )}
                          </div>
                          <h3 className="text-[#0A2647] font-bold text-base leading-snug group-hover:text-[#205295] transition-colors line-clamp-1">
                            {policy.title}
                          </h3>
                          {policy.summary && (
                            <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{policy.summary}</p>
                          )}
                        </div>

                        {/* Date + arrow */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                            <Calendar size={11} />
                            {formatDate(policy.published_at)}
                          </div>
                          <div className="hidden sm:block text-xs text-slate-400">{formatTime(policy.published_at)}</div>
                          <ChevronRight size={16} className="text-[#205295] opacity-0 group-hover:opacity-100 transition-opacity ml-auto sm:ml-0" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={15} />
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 py-2 text-slate-400 text-sm select-none">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-150 ${
                          safePage === n
                            ? 'bg-[#0A2647] text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647]'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
