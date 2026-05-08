import React, { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, CATEGORIES } from '../types';
import PolicyCard from '../components/PolicyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ScrollToTop from '../components/ScrollToTop';

interface HomeProps {
  navigate: (to: string) => void;
  initialCategory?: string;
}

const Home: React.FC<HomeProps> = ({ navigate, initialCategory = 'Todas' }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('status', 'published')
      .order('policy_number', { ascending: true });

    if (!error && data) setPolicies(data as Policy[]);
    setLoading(false);
  };

  const filtered = policies.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Todas' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todas', ...CATEGORIES];

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
      <ScrollToTop />
      <div id="politicas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-[#0A2647] mb-1">
            {initialCategory !== 'Todas' ? initialCategory : 'Politicas Publicadas'}
          </h2>
          <p className="text-slate-500 text-sm">
            {initialCategory !== 'Todas'
              ? 'Politicas de la categoria seleccionada'
              : 'Consulta la normativa interna vigente de PTM'}
          </p>
        </div>

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
            <p className="text-xs text-slate-400 mb-5">
              Mostrando <strong>{filtered.length}</strong> {filtered.length === 1 ? 'politica' : 'politicas'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(policy => (
                <PolicyCard key={policy.id} policy={policy} navigate={navigate} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
