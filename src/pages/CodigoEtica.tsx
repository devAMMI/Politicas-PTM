import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Download, Maximize2, Minimize2, Printer, ExternalLink,
  FileText, Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScrollToTop from '../components/ScrollToTop';

interface CodigoEticaProps {
  navigate: (to: string) => void;
}

const CodigoEtica: React.FC<CodigoEticaProps> = ({ navigate }) => {
  const [pdfUrl, setPdfUrl]           = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [fullscreen, setFullscreen]   = useState(false);
  const inlineRef                     = useRef<HTMLIFrameElement>(null);
  const fullscreenRef                 = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'codigo_etica_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPdfUrl(data.value);
        setLoading(false);
      });
  }, []);

  const viewerSrc = pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH` : null;

  const handlePrint = () => {
    const ref = fullscreen ? fullscreenRef.current : inlineRef.current;
    ref?.contentWindow?.print();
  };

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-[#F8F9FC]">

        {/* Page header */}
        <div className="bg-gradient-to-r from-[#0A2647] to-[#144272] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Inicio
            </button>
            <span className="text-white/30">/</span>
            <span className="text-white/90 text-sm font-medium">Código de Ética</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0A2647]/10 flex items-center justify-center">
                <FileText size={20} className="text-[#0A2647]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0A2647]">Código de Ética</h1>
                <p className="text-slate-500 text-sm">PTM · Advanced Plastic Solutions</p>
              </div>
            </div>

            {pdfUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
                >
                  <Printer size={15} />
                  Imprimir
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
                >
                  <ExternalLink size={15} />
                  Abrir
                </a>
                <a
                  href={pdfUrl}
                  download
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A2647] text-white hover:bg-[#144272] transition text-sm font-medium"
                >
                  <Download size={15} />
                  Descargar
                </a>
              </div>
            )}
          </div>

          {/* PDF viewer */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Visor de documento</span>
              {pdfUrl && (
                <button
                  onClick={() => setFullscreen(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0A2647] transition-colors"
                >
                  <Maximize2 size={14} />
                  Pantalla completa
                </button>
              )}
            </div>

            {/* Content */}
            <div className="relative" style={{ height: '75vh', minHeight: '480px' }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <Loader2 size={28} className="text-[#0A2647]/40 animate-spin" />
                </div>
              )}
              {!loading && !pdfUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <AlertCircle size={36} />
                  <p className="text-sm">Documento no disponible</p>
                </div>
              )}
              {!loading && viewerSrc && (
                <iframe
                  ref={inlineRef}
                  src={viewerSrc}
                  className="w-full h-full border-0"
                  title="Código de Ética PTM"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && viewerSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0A2647]">
            <span className="text-white font-semibold text-sm">Código de Ética — PTM</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition text-xs"
              >
                <Printer size={14} />
                Imprimir
              </button>
              <a
                href={pdfUrl!}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition text-xs"
              >
                <Download size={14} />
                Descargar
              </a>
              <button
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs"
              >
                <Minimize2 size={14} />
                Cerrar
              </button>
            </div>
          </div>
          <iframe
            ref={fullscreenRef}
            src={viewerSrc}
            className="flex-1 w-full border-0"
            title="Código de Ética PTM — pantalla completa"
          />
        </div>
      )}
    </>
  );
};

export default CodigoEtica;
