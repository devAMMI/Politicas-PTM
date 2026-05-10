import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, CheckCircle, AlertCircle,
  Mail, Users, UserCheck, UserX, X, Save, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Recipient {
  id: string;
  full_name: string;
  email: string;
  area: string;
  position: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = { full_name: '', email: '', area: '', position: '', notes: '' };
const PAGE_SIZE = 12;

interface Props { navigate: (to: string) => void }

const EmailRecipients: React.FC<Props> = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage]             = useState(1);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Delete confirm
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setPage(1); }, [search, filterActive]);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('email_recipients')
      .select('*')
      .order('full_name', { ascending: true });
    if (data) setRecipients(data as Recipient[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (r: Recipient) => {
    setEditId(r.id);
    setForm({ full_name: r.full_name, email: r.email, area: r.area, position: r.position ?? '', notes: r.notes ?? '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setFormError('El nombre es requerido.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Ingresa un correo electronico valido.'); return;
    }
    if (!form.area.trim()) { setFormError('El area es requerida.'); return; }

    setSaving(true);
    setFormError('');

    if (editId) {
      const { error } = await supabase.from('email_recipients').update({
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        area:      form.area.trim(),
        position:  form.position.trim() || null,
        notes:     form.notes.trim() || null,
      }).eq('id', editId);
      if (error) { setFormError(error.message); setSaving(false); return; }
      setRecipients(prev => prev.map(r => r.id === editId
        ? { ...r, full_name: form.full_name.trim(), email: form.email.trim().toLowerCase(), area: form.area.trim(), position: form.position.trim() || null, notes: form.notes.trim() || null }
        : r
      ));
      showToast('success', 'Destinatario actualizado.');
    } else {
      const { data, error } = await supabase.from('email_recipients').insert({
        full_name:  form.full_name.trim(),
        email:      form.email.trim().toLowerCase(),
        area:       form.area.trim(),
        position:   form.position.trim() || null,
        notes:      form.notes.trim() || null,
        created_by: user?.id ?? null,
        is_active:  true,
      }).select().maybeSingle();
      if (error) { setFormError(error.message); setSaving(false); return; }
      if (data) setRecipients(prev => [...prev, data as Recipient]);
      showToast('success', 'Destinatario agregado a la lista.');
    }

    setSaving(false);
    setModalOpen(false);
  };

  const toggleActive = async (r: Recipient) => {
    const { error } = await supabase.from('email_recipients').update({ is_active: !r.is_active }).eq('id', r.id);
    if (!error) {
      setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    const { error } = await supabase.from('email_recipients').delete().eq('id', confirmId);
    setDeleting(false);
    setConfirmId(null);
    if (error) { showToast('error', 'Error al eliminar.'); return; }
    setRecipients(prev => prev.filter(r => r.id !== confirmId));
    showToast('success', 'Destinatario eliminado.');
  };

  const filtered = useMemo(() => recipients.filter(r => {
    if (filterActive === 'active' && !r.is_active) return false;
    if (filterActive === 'inactive' && r.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.area.toLowerCase().includes(q);
    }
    return true;
  }), [recipients, filterActive, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(() => ({
    total:    recipients.length,
    active:   recipients.filter(r => r.is_active).length,
    inactive: recipients.filter(r => !r.is_active).length,
  }), [recipients]);

  const getInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const AREA_COLORS: Record<string, string> = {
    'RRHH':             'bg-blue-50 text-blue-700',
    'Recursos Humanos': 'bg-blue-50 text-blue-700',
    'IT':               'bg-sky-50 text-sky-700',
    'Operaciones':      'bg-cyan-50 text-cyan-700',
    'Legal':            'bg-amber-50 text-amber-700',
    'Marketing':        'bg-pink-50 text-pink-700',
    'Calidad':          'bg-emerald-50 text-emerald-700',
    'Seguridad':        'bg-orange-50 text-orange-700',
    'Finanzas':         'bg-violet-50 text-violet-700',
    'General':          'bg-slate-50 text-slate-700',
  };

  const areaColor = (area: string) => {
    for (const [key, cls] of Object.entries(AREA_COLORS)) {
      if (area.toLowerCase().includes(key.toLowerCase())) return cls;
    }
    return 'bg-slate-50 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Eliminar destinatario</h3>
            <p className="text-slate-500 text-sm text-center mb-6 leading-relaxed">Esta accion no se puede deshacer. El destinatario sera removido permanentemente de la lista de envio.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{editId ? 'Editar destinatario' : 'Agregar destinatario'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editId ? 'Actualiza los datos del destinatario.' : 'Nuevo integrante de la lista de envio PTM.'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre completo <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Ej: Maria Garcia"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo electronico <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@ptm.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Area / Departamento <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder="Ej: Recursos Humanos"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    placeholder="Ej: Jefa de RRHH"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Nota opcional sobre este destinatario..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all resize-none"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm disabled:opacity-60"
              >
                <Save size={14} />
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Gobierno Corporativo</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lista de Envio</h1>
            <p className="text-sm text-slate-500 mt-1">Gestiona los destinatarios de las notificaciones de politicas PTM.</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm hover:shadow-md flex-shrink-0"
          >
            <Plus size={15} />
            Agregar destinatario
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setFilterActive('all')}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3.5 text-left transition-all hover:shadow-md ${filterActive === 'all' ? 'border-[#0A2647]/20 shadow-sm ring-1 ring-[#0A2647]/10' : 'border-gray-100'}`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
              <Users size={17} className="text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{counts.total}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Total</p>
            </div>
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3.5 text-left transition-all hover:shadow-md ${filterActive === 'active' ? 'border-emerald-200 shadow-sm ring-1 ring-emerald-100' : 'border-gray-100'}`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <UserCheck size={17} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{counts.active}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Activos</p>
            </div>
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3.5 text-left transition-all hover:shadow-md ${filterActive === 'inactive' ? 'border-slate-200 shadow-sm ring-1 ring-slate-100' : 'border-gray-100'}`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
              <UserX size={17} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{counts.inactive}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Inactivos</p>
            </div>
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o area..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Mail size={13} className="text-slate-400" />
              {counts.active} destinatarios activos recibian notificaciones
            </div>
          </div>

          {/* Column headers */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-b border-gray-50 grid grid-cols-[2fr_2fr_1.5fr_1fr_auto] gap-3 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Area</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando lista...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">Sin resultados</p>
              <p className="text-slate-400 text-sm mt-1.5">
                {search ? 'Ajusta tu busqueda.' : 'Agrega el primer destinatario.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paginated.map(r => (
                <div key={r.id} className="grid grid-cols-[2fr_2fr_1.5fr_1fr_auto] gap-3 items-center px-5 py-3.5 hover:bg-slate-50/70 transition-colors group">

                  {/* Name + avatar */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                      style={{ background: r.is_active ? '#0A2647' : '#94a3b8' }}
                    >
                      {getInitials(r.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.full_name}</p>
                      {r.position && <p className="text-xs text-slate-400 truncate">{r.position}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={11} className="text-slate-300 flex-shrink-0" />
                    <span className="text-sm text-slate-600 truncate">{r.email}</span>
                  </div>

                  {/* Area badge */}
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${areaColor(r.area)}`}>
                      {r.area}
                    </span>
                  </div>

                  {/* Active toggle */}
                  <div>
                    <button
                      onClick={() => toggleActive(r)}
                      title={r.is_active ? 'Desactivar' : 'Activar'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        r.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {r.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(r)}
                      title="Editar"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmId(r.id)}
                      title="Eliminar"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer + pagination */}
          {filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Mostrando <strong className="text-slate-600">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de <strong className="text-slate-600">{filtered.length}</strong> destinatarios
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={13} /> Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${safePage === n ? 'bg-[#0A2647] text-white shadow-sm' : 'bg-white text-slate-600 border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647]'}`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-gray-200 hover:border-[#0A2647]/30 hover:text-[#0A2647] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailRecipients;
