import React from 'react';
import { Calendar, ChevronRight, FileText, Tag } from 'lucide-react';
import { Policy } from '../types';

interface PolicyCardProps {
  policy: Policy;
  navigate: (to: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Calidad e Inocuidad': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Seguridad Industrial': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Recursos Humanos': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Operaciones': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Medio Ambiente': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  'General': { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, navigate }) => {
  const colors = CATEGORY_COLORS[policy.category] ?? CATEGORY_COLORS['General'];

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/politica/${policy.slug}`)}
    >
      {policy.cover_image_url && (
        <div className="h-44 overflow-hidden bg-slate-100">
          <img
            src={policy.cover_image_url}
            alt={policy.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {!policy.cover_image_url && (
        <div className="h-2 bg-gradient-to-r from-[#0A2647] to-[#205295]" />
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            <Tag size={10} />
            {policy.category}
          </span>
          <div className="flex items-center gap-1.5">
            {policy.policy_number && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-500">
                POL-{String(policy.policy_number).padStart(4, '0')}
              </span>
            )}
            {policy.document_url && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <FileText size={12} />
                PDF
              </span>
            )}
          </div>
        </div>

        <h3 className="text-[#0A2647] font-bold text-lg leading-snug mb-3 group-hover:text-[#205295] transition-colors line-clamp-2">
          {policy.title}
        </h3>

        {policy.summary && (
          <p className="text-slate-500 text-sm leading-relaxed mb-5 line-clamp-3">
            {policy.summary}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={12} />
            <span>
              {formatDate(policy.published_at)} &middot; {formatTime(policy.published_at)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#205295] group-hover:gap-2 transition-all">
            Ver mas
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </article>
  );
};

export default PolicyCard;
