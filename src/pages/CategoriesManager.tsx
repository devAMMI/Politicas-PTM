import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle, ArrowLeft, Tag, GripVertical, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  order_num: number;
  is_active: boolean;
  created_at: string;
}

interface CategoriesManagerProps {
  navigate: (to: string) => void;
}

const PRESET_COLORS = [
  '#0A2647', '#059669', '#DC2626', '#2563EB',
  '#D97706', '#16A34A', '#64748B', '#7C3AED',
  '#DB2777', '#0891B2', '#EA580C', '#854D0E',
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const emptyForm = { name: '', slug: '', color: '#0A2647', description: '', is_active: true };

const CategoriesManager: React.FC<CategoriesManagerProps> = ({ navigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('order_num', { ascending: true });
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal('create'); };
  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, slug: cat.slug, color: cat.color, description: cat.description ?? '', is_active: cat.is_active });
    setEditing(cat);
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: generateSlug(name) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug || generateSlug(form.name.trim()),
      color: form.color,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    if (modal === 'create') {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_num)) : 0;
      const { error } = await supabase.from('categories').insert({ ...payload, order_num: maxOrder + 1 });
      if (error) {
        showToast('error', error.message.includes('unique') ? 'Ya existe una categoria con ese nombre.' : 'Error al crear la categoria.');
      } else {
        showToast('success', 'Categoria creada correctamente.');
        closeModal();
        fetchCategories();
      }
    } else if (modal === 'edit' && editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) {
        showToast('error', 'Error al actualizar la categoria.');
      } else {
        showToast('success', 'Categoria actualizada.');
        closeModal();
        fetchCategories();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from('categories').delete().eq('id', confirmDelete.id);
    if (error) {
      showToast('error', 'No se puede eliminar. Asegurate de que no haya politicas usando esta categoria.');
    } else {
      showToast('success', 'Categoria eliminada.');
      fetchCategories();
    }
    setConfirmDelete(null);
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (!error) setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Eliminar categoria</h3>
            <p className="text-slate-500 text-sm text-center mb-1 leading-relaxed">
              ¿Eliminar <span className="font-semibold text-slate-700">"{confirmDelete.name}"</span>?
            </p>
            <p className="text-slate-400 text-xs text-center mb-6">Las politicas que usen esta categoria conservaran su valor actual.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {modal === 'create' ? 'Nueva categoria' : 'Editar categoria'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{modal === 'create' ? 'Agrega una nueva categoria al portal' : 'Modifica los datos de la categoria'}</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej: Seguridad Industrial"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono text-slate-500 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Descripcion (opcional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion breve de la categoria"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${form.color === c ? 'border-slate-700 scale-110 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer"
                    title="Color personalizado"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md" style={{ backgroundColor: form.color }} />
                  <span className="text-xs text-slate-500 font-mono">{form.color}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Categoria activa</p>
                  <p className="text-xs text-slate-400 mt-0.5">Las inactivas no aparecen en el portal</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative rounded-full transition-colors flex-shrink-0`}
                  style={{ width: 40, height: 22, backgroundColor: form.is_active ? '#059669' : '#CBD5E1' }}
                >
                  <span
                    className="absolute top-0.5 bg-white rounded-full shadow transition-transform"
                    style={{ width: 18, height: 18, left: 2, transform: form.is_active ? 'translateX(18px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2.5">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-colors disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Guardando...' : modal === 'create' ? 'Crear categoria' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Configuracion</p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categorias</h1>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={15} />
            Nueva categoria
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando categorias...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">No hay categorias</p>
              <p className="text-slate-400 text-sm mt-1.5">Crea la primera categoria para comenzar.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-slate-50/60">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                    <GripVertical size={14} className="text-slate-200 flex-shrink-0 group-hover:text-slate-400 transition-colors" />

                    {/* Color badge */}
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ring-1 ring-black/5"
                      style={{ backgroundColor: cat.color + '18' }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                          {cat.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{cat.slug}</p>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => toggleActive(cat)}
                        title={cat.is_active ? 'Desactivar' : 'Activar'}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cat.is_active ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        {cat.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => openEdit(cat)}
                        title="Editar"
                        className="p-2 rounded-xl text-slate-400 hover:text-[#0A2647] hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(cat)}
                        title="Eliminar"
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesManager;
