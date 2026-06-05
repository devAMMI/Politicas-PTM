import React, { useEffect, useState, useMemo } from 'react';
import {
  Send, X, Search, Users, UserCheck,
  ChevronDown, ChevronUp, Mail, CheckCircle, AlertCircle,
  FilePlus, FilePen, EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Policy } from '../types';

export type NotificationType = 'nueva' | 'editada' | 'oculta';

interface Recipient {
  id: string;
  full_name: string;
  email: string;
  area: string;
  is_active: boolean;
}

interface Props {
  policy: Policy;
  notificationType: NotificationType;
  onClose: () => void;
}

const TYPE_META: Record<NotificationType, { label: string; description: string; icon: React.ReactNode; accent: string }> = {
  nueva: {
    label: 'Nueva Politica',
    description: 'Se notificara que se publico una nueva politica.',
    icon: <FilePlus size={18} className="text-white" />,
    accent: 'bg-[#0A2647]',
  },
  editada: {
    label: 'Politica Actualizada',
    description: 'Se notificara que esta politica fue modificada.',
    icon: <FilePen size={18} className="text-white" />,
    accent: 'bg-amber-600',
  },
  oculta: {
    label: 'Politica Ocultada',
    description: 'Se notificara que esta politica fue ocultada / archivada.',
    icon: <EyeOff size={18} className="text-white" />,
    accent: 'bg-slate-600',
  },
};

const SendEmailModal: React.FC<Props> = ({ policy, notificationType, onClose }) => {
  const { session } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState('');
  const [filterArea, setFilterArea] = useState('Todas');
  const [areaOpen, setAreaOpen]     = useState(false);

  const meta = TYPE_META[notificationType];

  useEffect(() => {
    supabase
      .from('email_recipients')
      .select('id, full_name, email, area, is_active')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        const list = (data ?? []) as Recipient[];
        setRecipients(list);
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
    const ids = filtered.map(r => r.id);
    const allSel = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSel) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedRecipients = recipients.filter(r => selected.has(r.id));

  const handleSend = async () => {
    if (selected.size === 0) { setError('Selecciona al menos un destinatario.'); return; }
    setSending(true);
    setError('');

    const policyNumber = `POL-${String(policy.policy_number).padStart(5, '0')}`;
    const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-policy-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          policyTitle:       policy.title,
          policyNumber,
          category:          policy.category,
          department:        policy.department || undefined,
          authorName:        policy.author_name,
          summary:           policy.summary || undefined,
          publishedAt:       policy.published_at,
          policyUrl:         `${window.location.origin}/politicas/${policy.slug}`,
          coverImageUrl:     policy.cover_image_url ?? undefined,
          documentUrl:       policy.document_clean_path
            ? `${window.location.origin}/docs/${policy.document_clean_path}`
            : policy.document_url ?? undefined,
          documentName:      policy.document_clean_path
            ? policy.document_clean_path.split('/').pop()
            : (policy.document_name ?? undefined),
          isInternal:        policy.is_internal,
          version:           policy.version || '1.0',
          notificationType,
          recipients:        selectedRecipients.map(r => ({ email: r.email, full_name: r.full_name })),
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
            Notificacion <strong className="text-slate-700">({meta.label})</strong> enviada a{' '}
            <strong className="text-slate-700">{selectedRecipients.length}</strong>{' '}
            destinatario{selectedRecipients.length !== 1 ? 's' : ''}.
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
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.accent}`}>
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Enviar Notificacion por Correo</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${meta.accent}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                {policy.title} &middot; POL-{String(policy.policy_number).padStart(5, '0')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
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

        {/* Select all */}
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
            <span>
              <strong className="text-slate-700">{selected.size}</strong> de{' '}
              <strong className="text-slate-700">{recipients.length}</strong> seleccionados
            </span>
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
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                    style={{ background: selected.has(r.id) ? '#0A2647' : '#94a3b8' }}
                  >
                    {getInitials(r.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail size={10} className="text-slate-300 flex-shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{r.email}</span>
                    </div>
                  </div>
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

export default SendEmailModal;
