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
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('order_num', { ascending: true });
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setModal('create');
  };

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
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Eliminar categoria</h3>
            <p className="text-slate-500 text-sm text-center mb-1">
              ¿Eliminar <span className="font-semibold text-slate-700">"{confirmDelete.name}"</span>?
            </p>
            <p className="text-slate-400 text-xs text-center mb-6">Las politicas que usen esta categoria conservaran su valor actual.</p>
            <div className="flex gap-3">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-slate-800">
                {modal === 'create' ? 'Nueva categoria' : 'Editar categoria'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej: Seguridad Industrial"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripcion (opcional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion breve de la categoria"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
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
              </div>

              {/* Active */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Activa</p>
                  <p className="text-xs text-slate-400">Las categorias inactivas no aparecen en el portal</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  style={{ width: 40, height: 22 }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-[18px]' : ''}`}
                    style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#144272] transition-colors disabled:opacity-60"
              >
                {saving ? 'Guardando...' : modal === 'create' ? 'Crear categoria' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl border border-gray-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Categorias</h1>
              <p className="text-slate-500 text-sm mt-0.5">Gestiona las categorias de politicas</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all hover:shadow-lg"
          >
            <Plus size={16} />
            Nueva categoria
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16">
              <Tag size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hay categorias</p>
              <p className="text-slate-400 text-sm mt-1">Crea la primera categoria para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                  <GripVertical size={14} className="text-slate-300 flex-shrink-0" />

                  {/* Color dot */}
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
                      {!cat.is_active && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{cat.slug}</p>
                    {cat.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleActive(cat)}
                      title={cat.is_active ? 'Desactivar' : 'Activar'}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${cat.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      {cat.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                    <button
                      onClick={() => openEdit(cat)}
                      title="Editar"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat)}
                      title="Eliminar"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {categories.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-slate-50/50">
              <span className="text-xs text-slate-400">{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesManager;
