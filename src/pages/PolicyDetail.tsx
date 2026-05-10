import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Calendar, User, Tag, Download, FileText, Clock,
  Maximize2, Minimize2, Lock, Printer, ExternalLink, X,
  Send, CheckCircle, AlertCircle, Search, Users, UserCheck,
  ChevronDown, ChevronUp, Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, buildDocCleanUrl } from '../types';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ScrollToTop from '../components/ScrollToTop';

interface PolicyDetailProps {
  slug: string;
  navigate: (to: string) => void;
}

interface Recipient {
  id: string;
  full_name: string;
  email: string;
  area: string;
  position: string | null;
  is_active: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Calidad e Inocuidad':  { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Seguridad Industrial': { bg: 'bg-amber-100',   text: 'text-amber-800' },
  'Recursos Humanos':     { bg: 'bg-blue-100',     text: 'text-blue-800' },
  'Operaciones':          { bg: 'bg-cyan-100',     text: 'text-cyan-800' },
  'Medio Ambiente':       { bg: 'bg-teal-100',     text: 'text-teal-800' },
  'General':              { bg: 'bg-slate-100',    text: 'text-slate-700' },
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

const CONTENT_LINE_CLAMP = 6;

// ── Send Email Modal ─────────────────────────────────────────────────────────
interface SendEmailModalProps {
  policy: Policy;
  onClose: () => void;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({ policy, onClose }) => {
  const { session } = useAuth();
  const [recipients, setRecipients]       = useState<Recipient[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [sending, setSending]             = useState(false);
  const [sent, setSent]                   = useState(false);
  const [error, setError]                 = useState('');
  const [filterArea, setFilterArea]       = useState('Todas');
  const [areaOpen, setAreaOpen]           = useState(false);

  useEffect(() => {
    supabase
      .from('email_recipients')
      .select('id, full_name, email, area, position, is_active')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        const list = (data ?? []) as Recipient[];
        setRecipients(list);
        // Select all active by default
        setSelected(new Set(list.map(r => r.id)));
        setLoading(false);
      });
  }, []);

  const areas = useMemo(() => {
    const s = new Set(recipients.map(r => r.area));
    return ['Todas', ...Array.from(s).sort()];
  }, [recipients]);

  const filtered = useMemo(() => recipients.filter(r => {
    if (filterArea !== 'Todas' && r.area !== filterArea) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.area.toLowerCase().includes(q);
    }
    return true;
  }), [recipients, filterArea, search]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const visibleIds = filtered.map(r => r.id);
    const allSelected = visibleIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedRecipients = recipients.filter(r => selected.has(r.id));

  const handleSend = async () => {
    if (selected.size === 0) { setError('Selecciona al menos un destinatario.'); return; }
    setSending(true);
    setError('');

    const policyNumber = `POL-${String(policy.policy_number).padStart(4, '0')}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-policy-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          policyTitle:    policy.title,
          policyNumber,
          category:       policy.category,
          department:     policy.department || undefined,
          authorName:     policy.author_name,
          summary:        policy.summary || undefined,
          publishedAt:    policy.published_at,
          policyUrl:      `${window.location.origin}/politicas/${policy.slug}`,
          coverImageUrl:  policy.cover_image_url ?? undefined,
          documentUrl:    policy.document_clean_path
            ? `${window.location.origin}/docs/${policy.document_clean_path}`
            : policy.document_url ?? undefined,
          documentName:   policy.document_clean_path
            ? policy.document_clean_path.split('/').pop()
            : (policy.document_name ?? undefined),
          isInternal:     policy.is_internal,
          version:        policy.version || '1.0',
          recipients:     selectedRecipients.map(r => ({ email: r.email, full_name: r.full_name })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? json.errors?.[0] ?? 'Error al enviar.');
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido.');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={30} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Correos enviados</h3>
          <p className="text-slate-500 text-sm mb-1">
            La politica fue enviada a <strong className="text-slate-700">{selectedRecipients.length}</strong> destinatario{selectedRecipients.length !== 1 ? 's' : ''}.
          </p>
          <p className="text-slate-400 text-xs mb-7">{policy.title}</p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const visibleAllSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0A2647] rounded-2xl flex items-center justify-center flex-shrink-0">
              <Send size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Enviar Politica por Correo</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{policy.title} &middot; POL-{String(policy.policy_number).padStart(4, '0')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar destinatario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
            />
          </div>
          {/* Area filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setAreaOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-600 hover:border-gray-300 transition-all whitespace-nowrap"
            >
              {filterArea}
              {areaOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {areaOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-[160px]">
                {areas.map(a => (
                  <button
                    key={a}
                    onClick={() => { setFilterArea(a); setAreaOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${filterArea === a ? 'text-[#0A2647] font-semibold' : 'text-slate-600'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Select all row */}
        <div className="px-6 py-2.5 border-b border-gray-50 flex items-center justify-between flex-shrink-0 bg-slate-50/60">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleAllSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-[#0A2647] cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-600">
              {visibleAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              {filtered.length !== recipients.length && ` (${filtered.length} visibles)`}
            </span>
          </label>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck size={12} className="text-emerald-500" />
            <span><strong className="text-slate-700">{selected.size}</strong> seleccionados de <strong className="text-slate-700">{recipients.length}</strong></span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando destinatarios...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Users size={20} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Sin destinatarios activos</p>
              <p className="text-xs text-slate-400">Agrega destinatarios desde Lista de Envio.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(r => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3.5 px-6 py-3 cursor-pointer transition-colors hover:bg-slate-50/80 ${selected.has(r.id) ? 'bg-blue-50/30' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    className="w-4 h-4 rounded accent-[#0A2647] cursor-pointer flex-shrink-0"
                  />
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold transition-colors"
                    style={{ background: selected.has(r.id) ? '#0A2647' : '#94a3b8' }}
                  >
                    {getInitials(r.full_name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail size={10} className="text-slate-300 flex-shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{r.email}</span>
                    </div>
                  </div>
                  {/* Area badge */}
                  <span className="flex-shrink-0 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:block">
                    {r.area}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-3">
              <AlertCircle size={13} className="flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Enviar a {selected.size} destinatario{selected.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ── PolicyDetail ─────────────────────────────────────────────────────────────
const PolicyDetail: React.FC<PolicyDetailProps> = ({ slug, navigate }) => {
  const { session } = useAuth();
  const [policy, setPolicy]               = useState<Policy | null>(null);
  const [loading, setLoading]             = useState(true);
  const [pdfExpanded, setPdfExpanded]     = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [lightboxOpen, setLightboxOpen]   = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const inlineIframeRef    = React.useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = React.useRef<HTMLIFrameElement>(null);

  const isAdmin = !!session;

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (!error && data) setPolicy(data as Policy);
      setLoading(false);
    };
    fetchPolicy();
  }, [slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pdfFullscreen) setPdfFullscreen(false);
        else if (lightboxOpen) setLightboxOpen(false);
        else if (sendModalOpen) setSendModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, pdfFullscreen, sendModalOpen]);

  const handlePrint = (fromFullscreen: boolean) => {
    const iframe = fromFullscreen ? fullscreenIframeRef.current : inlineIframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

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

  const docUrl = policy.document_clean_path
    ? buildDocCleanUrl(policy.document_clean_path)
    : policy.document_url;

  const docDisplayName = policy.document_clean_path
    ? policy.document_clean_path.split('/').pop()!
    : (policy.document_name ?? 'documento.pdf');

  const isInternal = policy.is_internal === true;

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
      <ScrollToTop />

      {/* Send email modal */}
      {sendModalOpen && (
        <SendEmailModal policy={policy} onClose={() => setSendModalOpen(false)} />
      )}

      {/* Image lightbox */}
      {lightboxOpen && policy.cover_image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <Minimize2 size={20} />
          </button>
          <img
            src={policy.cover_image_url}
            alt={policy.title}
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back + Send button row */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0A2647] text-sm font-medium transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver a Politicas
          </button>

          {isAdmin && (
            <button
              onClick={() => setSendModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm hover:shadow-md"
            >
              <Send size={14} />
              Enviar por email
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[#0A2647] to-[#205295] p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                <Tag size={10} />
                {policy.category}
              </span>
              {policy.policy_number && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white font-mono">
                  POL-{String(policy.policy_number).padStart(4, '0')}
                </span>
              )}
              {policy.version && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200">
                  v{policy.version}
                </span>
              )}
              {policy.department && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200">
                  {policy.department}
                </span>
              )}
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white leading-snug mb-4 max-w-2xl">
              {policy.title}
            </h1>
            {policy.summary && (
              <p className="text-blue-200 text-sm leading-relaxed max-w-2xl">{policy.summary}</p>
            )}
          </div>

          {/* Meta row */}
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

          {/* Cover image */}
          {policy.cover_image_url && (
            <div className="px-8 md:px-10 pt-8">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 group cursor-pointer" onClick={() => setLightboxOpen(true)}>
                <img
                  src={policy.cover_image_url}
                  alt={policy.title}
                  className="w-full max-h-96 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3 shadow-lg">
                    <Maximize2 size={20} className="text-slate-700" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">Click para ampliar</p>
            </div>
          )}

          {/* Content */}
          {policy.content && (
            <div className="px-8 md:px-10 py-8">
              <div className="relative">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-[#0A2647] prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-800 prose-sm overflow-hidden transition-all duration-300"
                  style={contentExpanded ? undefined : { display: '-webkit-box', WebkitLineClamp: CONTENT_LINE_CLAMP, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: policy.content }}
                />
                {!contentExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>
              <button
                onClick={() => setContentExpanded(p => !p)}
                className="mt-3 text-sm font-semibold text-[#0A2647] hover:text-[#144272] transition-colors flex items-center gap-1.5"
              >
                {contentExpanded ? 'Ver menos' : 'Ver mas...'}
              </button>
            </div>
          )}

          {/* PDF viewer */}
          {docUrl && (
            <div className="px-8 md:px-10 pb-10">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-gray-200 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-slate-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-slate-700 truncate">{policy.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isInternal && (
                      <>
                        <button
                          onClick={() => handlePrint(false)}
                          title="Imprimir"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                        >
                          <Printer size={13} />
                          <span className="hidden sm:inline">Imprimir</span>
                        </button>
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span className="hidden sm:inline">Abrir</span>
                        </a>
                        <button
                          onClick={() => handleDownload(docUrl, docDisplayName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                        >
                          <Download size={13} />
                          <span className="hidden sm:inline">Guardar</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setPdfFullscreen(true)}
                      className="inline-flex items-center gap-1.5 bg-[#0A2647] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#144272] transition-all"
                    >
                      <Maximize2 size={13} />
                      <span className="hidden sm:inline">Pantalla completa</span>
                    </button>
                  </div>
                </div>
                <div className="relative h-[680px]">
                  <iframe
                    ref={inlineIframeRef}
                    src={isInternal
                      ? `${docUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
                      : `${docUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                    className="w-full h-full border-0"
                    title={docDisplayName}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Fullscreen */}
      {pdfFullscreen && docUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-[#0A2647] flex-shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center">
                <FileText size={13} className="text-red-400" />
              </div>
              <span className="text-white text-sm font-medium truncate max-w-xs">{docDisplayName}</span>
              {isInternal && (
                <span className="inline-flex items-center gap-1 bg-white/10 text-white/80 text-xs font-semibold px-2 py-0.5 rounded-full border border-white/20">
                  <Lock size={9} />
                  Uso interno
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isInternal && (
                <>
                  <button onClick={() => handlePrint(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors">
                    <Printer size={13} /> Imprimir
                  </button>
                  <a href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors">
                    <ExternalLink size={13} /> Abrir
                  </a>
                  <button onClick={() => handleDownload(docUrl, docDisplayName)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors">
                    <Download size={13} /> Guardar
                  </button>
                </>
              )}
              <button
                onClick={() => setPdfFullscreen(false)}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ml-2"
              >
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>
          <div className="relative flex-1" style={{ minHeight: 0 }}>
            <iframe
              ref={fullscreenIframeRef}
              src={isInternal
                ? `${docUrl}#toolbar=0&navpanes=0&scrollbar=1`
                : `${docUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full border-0"
              style={{ height: '100%', display: 'block' }}
              title={docDisplayName}
            />
            {isInternal && (
              <div
                className="absolute inset-0 z-10"
                onContextMenu={e => e.preventDefault()}
                style={{ background: 'transparent', userSelect: 'none', pointerEvents: 'none' }}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default PolicyDetail;
