import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, User, Tag, Download, FileText, Clock, Maximize2, Minimize2, Printer, ExternalLink, X, Lock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, buildDocCleanUrl } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

interface PolicyDetailProps {
  slug: string;
  navigate: (to: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Calidad e Inocuidad': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Seguridad Industrial': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Recursos Humanos': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Operaciones': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
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

const CONTENT_LINE_CLAMP = 6;

const PolicyDetail: React.FC<PolicyDetailProps> = ({ slug, navigate }) => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const inlineIframeRef = React.useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = React.useRef<HTMLIFrameElement>(null);

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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, pdfFullscreen]);

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

  // Use clean in-app URL when available, fall back to raw storage URL
  const docUrl = policy.document_clean_path
    ? buildDocCleanUrl(policy.document_clean_path)
    : policy.document_url;

  // Derive display filename from clean path (last segment) or fall back to stored name
  const docDisplayName = policy.document_clean_path
    ? policy.document_clean_path.split('/').pop()!
    : (policy.document_name ?? 'documento.pdf');

  const isInternal = policy.is_internal === true;

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
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
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0A2647] text-sm font-medium mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver a Politicas
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
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

          {policy.content && (
            <div className="px-8 md:px-10 py-8">
              <div className="relative">
                <div
                  className={`prose prose-slate max-w-none prose-headings:text-[#0A2647] prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-800 prose-sm overflow-hidden transition-all duration-300`}
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

          {docUrl && (
            <div className="px-8 md:px-10 pb-10">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-gray-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">Documento adjunto</p>
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                            <Lock size={9} />
                            Uso interno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                            <Globe size={9} />
                            Uso externo
                          </span>
                        )}
                      </div>
                      {policy.document_clean_path ? (
                        <p className="text-xs text-slate-400 font-mono">/docs/{policy.document_clean_path}</p>
                      ) : policy.document_name ? (
                        <p className="text-xs text-slate-400">{policy.document_name}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                          title="Abrir en nueva pestaña"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span className="hidden sm:inline">Abrir</span>
                        </a>
                        <button
                          onClick={() => handleDownload(docUrl, docDisplayName)}
                          title="Guardar PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                        >
                          <Download size={13} />
                          <span className="hidden sm:inline">Guardar</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setPdfExpanded(p => !p)}
                      title={pdfExpanded ? 'Compactar' : 'Expandir'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-gray-200 hover:bg-white hover:text-slate-800 transition-colors"
                    >
                      {pdfExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      <span className="hidden sm:inline">{pdfExpanded ? 'Compactar' : 'Expandir'}</span>
                    </button>
                    <button
                      onClick={() => setPdfFullscreen(true)}
                      title="Pantalla completa"
                      className="inline-flex items-center gap-1.5 bg-[#0A2647] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#144272] transition-all"
                    >
                      <Maximize2 size={13} />
                      <span className="hidden sm:inline">Pantalla completa</span>
                    </button>
                  </div>
                </div>
                {/* Inline viewer */}
                <div className={`relative transition-all duration-300 ${pdfExpanded ? 'h-[90vh]' : 'h-[680px]'}`}>
                  <iframe
                    ref={inlineIframeRef}
                    src={isInternal
                      ? `${docUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
                      : `${docUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                    className="w-full h-full border-0"
                    title={docDisplayName}
                  />
                  {/* Transparent overlay for internal policies: blocks right-click context menu */}
                  {isInternal && (
                    <div
                      className="absolute inset-0 z-10"
                      onContextMenu={e => e.preventDefault()}
                      style={{ background: 'transparent', userSelect: 'none' }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PDF Fullscreen modal */}
          {pdfFullscreen && docUrl && (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 bg-[#0A2647] flex-shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <FileText size={13} className="text-red-400" />
                  </div>
                  <span className="text-white text-sm font-medium truncate max-w-xs">
                    {docDisplayName}
                  </span>
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
                      <button
                        onClick={() => handlePrint(true)}
                        title="Imprimir"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        <Printer size={13} />
                        Imprimir
                      </button>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                      <button
                        onClick={() => handleDownload(docUrl, docDisplayName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        <Download size={13} />
                        Guardar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setPdfFullscreen(false)}
                    title="Cerrar (Esc)"
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ml-2"
                  >
                    <X size={14} />
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <iframe
                  ref={fullscreenIframeRef}
                  src={isInternal
                    ? `${docUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
                    : `${docUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  title={docDisplayName}
                />
                {isInternal && (
                  <div
                    className="absolute inset-0 z-10"
                    onContextMenu={e => e.preventDefault()}
                    style={{ background: 'transparent', userSelect: 'none' }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default PolicyDetail;
