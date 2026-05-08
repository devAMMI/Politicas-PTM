import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Save, X, FileText, Image, Loader2, CheckCircle, AlertCircle, Zap, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Policy, CATEGORIES, generateSlug, buildStoragePath, buildFolderPath } from '../types';
import { useAuth } from '../context/AuthContext';

interface PolicyFormProps {
  editId?: string;
  navigate: (to: string) => void;
}

interface FormState {
  title: string;
  category: string;
  department: string;
  version: string;
  summary: string;
  content: string;
  is_published: boolean;
  published_at: string;
  author_name: string;
}

function getNowGMT6Local(): string {
  const now = new Date();
  const gmt6 = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return gmt6.toISOString().slice(0, 16);
}

function toLocalDatetime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyForm = (): FormState => ({
  title: '',
  category: 'General',
  department: '',
  version: '1.0',
  summary: '',
  content: '',
  is_published: false,
  published_at: getNowGMT6Local(),
  author_name: 'Administrador',
});

const PolicyForm: React.FC<PolicyFormProps> = ({ editId, navigate }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [policyNumber, setPolicyNumber] = useState<number | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null);
  const [existingDocName, setExistingDocName] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editId) {
      loadPolicy(editId);
    } else {
      fetchNextPolicyNumber();
    }
  }, [editId]);

  const fetchNextPolicyNumber = async () => {
    const { data } = await supabase
      .from('policies')
      .select('policy_number')
      .order('policy_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPolicyNumber((data?.policy_number ?? 0) + 1);
  };

  const loadPolicy = async (id: string) => {
    const { data } = await supabase.from('policies').select('*').eq('id', id).maybeSingle();
    if (data) {
      const p = data as Policy;
      setPolicyNumber(p.policy_number);
      setForm({
        title: p.title,
        category: p.category,
        department: p.department ?? '',
        version: p.version ?? '1.0',
        summary: p.summary ?? '',
        content: p.content ?? '',
        is_published: p.is_published,
        published_at: toLocalDatetime(p.published_at),
        author_name: p.author_name,
      });
      setExistingCoverUrl(p.cover_image_url);
      setExistingDocUrl(p.document_url);
      setExistingDocName(p.document_name);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const uploadFile = async (
    file: File,
    folder: 'documents' | 'covers',
    num: number,
  ): Promise<string | null> => {
    const path = buildStoragePath(
      folder,
      form.category,
      num,
      form.title.trim(),
      file.name,
      form.published_at,
    );
    const { error } = await supabase.storage.from('ptm-media').upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('ptm-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePublishNow = () => {
    setForm(p => ({
      ...p,
      is_published: true,
      published_at: getNowGMT6Local(),
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, published_at: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('error', 'El titulo es requerido.'); return; }

    if (!editId && !form.is_published) {
      const minVal = getNowGMT6Local();
      if (form.published_at < minVal) {
        showToast('error', 'La fecha de publicacion no puede ser en el pasado.');
        return;
      }
    }

    setSaving(true);

    let cover_image_url = existingCoverUrl ?? null;
    let document_url = existingDocUrl ?? null;
    let document_name = existingDocName ?? null;

    // Resolve policy number: existing for edits, next available for new
    let resolvedNumber = policyNumber;
    if (!resolvedNumber) {
      const { data } = await supabase
        .from('policies')
        .select('policy_number')
        .order('policy_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedNumber = (data?.policy_number ?? 0) + 1;
    }

    if (coverFile) {
      const url = await uploadFile(coverFile, 'covers', resolvedNumber);
      if (url) cover_image_url = url;
    }
    if (docFile) {
      const url = await uploadFile(docFile, 'documents', resolvedNumber);
      if (url) {
        document_url = url;
        document_name = docFile.name;
      }
    }

    const publishedAt = new Date(form.published_at).toISOString();

    const newStatus = form.is_published ? 'published' : 'hidden';
    const payload = {
      title: form.title.trim(),
      category: form.category,
      department: form.department.trim(),
      version: form.version.trim() || '1.0',
      summary: form.summary.trim(),
      content: form.content,
      status: newStatus,
      is_published: form.is_published,
      folder_path: buildFolderPath(form.category, form.published_at),
      published_at: publishedAt,
      author_name: form.author_name.trim() || 'Administrador',
      author_id: user?.id ?? null,
      cover_image_url,
      document_url,
      document_name,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      const slugBase = generateSlug(form.title.trim(), editId);
      const { error } = await supabase.from('policies').update({ ...payload, slug: slugBase }).eq('id', editId);
      if (error) { showToast('error', 'Error al actualizar la politica.'); setSaving(false); return; }
      showToast('success', 'Politica actualizada correctamente.');
    } else {
      const tempId = crypto.randomUUID();
      const slug = generateSlug(form.title.trim(), tempId);
      const { error } = await supabase.from('policies').insert({ ...payload, id: tempId, slug });
      if (error) { showToast('error', 'Error al crear la politica.'); setSaving(false); return; }
      showToast('success', 'Politica creada correctamente.');
    }

    setSaving(false);
    setTimeout(() => navigate('/admin'), 1500);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
  };

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const numLabel = policyNumber ? `POL-${String(policyNumber).padStart(4, '0')}` : '—';

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800">{editId ? 'Editar Politica' : 'Nueva Politica'}</h1>
              <span className="px-2.5 py-0.5 bg-[#0A2647]/10 text-[#0A2647] text-xs font-bold rounded-lg font-mono">{numLabel}</span>
            </div>
            <p className="text-sm text-slate-500">{editId ? 'Modifica los datos de la politica' : 'Completa los datos para publicar una nueva politica'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informacion principal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Informacion principal</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titulo de la politica *</label>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                required
                placeholder="Ej: Politica de Calidad e Inocuidad"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria *</label>
                <select
                  value={form.category}
                  onChange={set('category')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Departamento / Area</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={set('department')}
                  placeholder="Ej: Planta de Produccion"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Autor responsable</label>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={set('author_name')}
                  placeholder="Ej: Departamento de Calidad"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Version</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={set('version')}
                  placeholder="Ej: 1.0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Resumen breve</label>
              <textarea
                value={form.summary}
                onChange={set('summary')}
                rows={2}
                placeholder="Descripcion corta visible en las tarjetas..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contenido completo</label>
              <p className="text-xs text-slate-400 mb-2">Puedes usar etiquetas HTML: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc.</p>
              <textarea
                value={form.content}
                onChange={set('content')}
                rows={12}
                placeholder="<h2>1. Objetivo</h2><p>...</p>"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-y"
              />
            </div>
          </div>

          {/* Archivos adjuntos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Archivos adjuntos</h2>
              {policyNumber && form.title && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Ruta de almacenamiento:</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">
                    documents/{form.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}/{new Date(form.published_at).getFullYear()}/POL-{String(policyNumber).padStart(4,'0')}_{form.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)}/
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Imagen de portada</label>
                <div
                  onClick={() => coverRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-[#0A2647]/40 hover:bg-slate-50 transition-all text-center"
                >
                  {coverPreview || existingCoverUrl ? (
                    <div className="relative">
                      <img
                        src={coverPreview ?? existingCoverUrl!}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); setExistingCoverUrl(null); }}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Image size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">Click para subir imagen</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP</p>
                    </>
                  )}
                </div>
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Documento PDF</label>
                <div
                  onClick={() => docRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-[#0A2647]/40 hover:bg-slate-50 transition-all text-center"
                >
                  <FileText size={24} className="mx-auto text-slate-300 mb-2" />
                  {docFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-emerald-600 font-medium">{docFile.name}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setDocFile(null); }} className="text-red-400 hover:text-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  ) : existingDocName ? (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-blue-600 font-medium">{existingDocName}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setExistingDocUrl(null); setExistingDocName(null); }} className="text-red-400 hover:text-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">Click para subir PDF</p>
                      <p className="text-xs text-slate-400 mt-1">Solo archivos PDF</p>
                    </>
                  )}
                </div>
                <input ref={docRef} type="file" accept="application/pdf" className="hidden" onChange={handleDocChange} />
              </div>
            </div>
          </div>

          {/* Publicacion */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Publicacion</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Clock size={13} className="inline mr-1.5 text-slate-400" />
                  Programar publicacion
                </label>
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
                <p className="text-xs text-slate-400 mt-1.5">Zona horaria GMT-6 (Guatemala)</p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="block text-sm font-medium text-slate-700">Estado de publicacion</label>

                <button
                  type="button"
                  onClick={handlePublishNow}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.is_published && form.published_at === getNowGMT6Local()
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Zap size={15} />
                  Publicar ahora
                </button>

                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div
                    onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.is_published ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_published ? 'translate-x-6' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {form.is_published ? 'Publicado' : 'Borrador'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {form.is_published ? 'Visible para colaboradores' : 'Solo visible en el panel'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pb-8">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear politica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PolicyForm;
