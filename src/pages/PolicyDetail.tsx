import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, User, Tag, Download, FileText, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

interface PolicyDetailProps {
  id: string;
  navigate: (to: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Calidad e Inocuidad': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Seguridad Industrial': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Recursos Humanos': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Operaciones': { bg: 'bg-violet-100', text: 'text-violet-800' },
  'Medio Ambiente': { bg: 'bg-teal-100', text: 'text-teal-800' },
  'General': { bg: 'bg-slate-100', text: 'text-slate-700' },
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-GT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

const PolicyDetail: React.FC<PolicyDetailProps> = ({ id, navigate }) => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (!error && data) setPolicy(data as Policy);
      setLoading(false);
    };
    fetchPolicy();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] pt-6">
        <LoadingSpinner message="Cargando politica..." />
      </main>
    );
  }

  if (!policy) {
    return (
      <main className="min-h-screen bg-[#F8F9FC]">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Politica no encontrada</h2>
          <p className="text-slate-500 text-sm mb-6">La politica que buscas no existe o no esta disponible.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl hover:bg-[#144272] transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  const colors = CATEGORY_COLORS[policy.category] ?? CATEGORY_COLORS['General'];

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
      {policy.cover_image_url && (
        <div className="w-full h-64 md:h-80 overflow-hidden bg-slate-200">
          <img src={policy.cover_image_url} alt={policy.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0A2647] text-sm font-medium mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver a Politicas
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0A2647] to-[#205295] p-8 md:p-10">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} mb-4`}>
              <Tag size={10} />
              {policy.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
              {policy.title}
            </h1>
            {policy.summary && (
              <p className="text-blue-200 text-base leading-relaxed">{policy.summary}</p>
            )}
          </div>

          <div className="px-8 md:px-10 py-5 border-b border-gray-100 flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar size={15} className="text-slate-400" />
              <span>{formatDateTime(policy.published_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock size={15} className="text-slate-400" />
              <span>{formatTime(policy.published_at)} hrs</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User size={15} className="text-slate-400" />
              <span>{policy.author_name}</span>
            </div>
          </div>

          {policy.document_url && (
            <div className="px-8 md:px-10 py-4 bg-slate-50 border-b border-gray-100">
              <a
                href={policy.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#0A2647] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#144272] transition-all hover:shadow-md"
              >
                <Download size={15} />
                Descargar documento
                {policy.document_name && <span className="text-blue-200 font-normal ml-1">({policy.document_name})</span>}
              </a>
            </div>
          )}

          <div className="px-8 md:px-10 py-8">
            {policy.content ? (
              <div
                className="prose prose-slate max-w-none prose-headings:text-[#0A2647] prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-800"
                dangerouslySetInnerHTML={{ __html: policy.content }}
              />
            ) : (
              <p className="text-slate-400 italic text-sm">Sin contenido adicional.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default PolicyDetail;
