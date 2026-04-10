import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Eye, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Evaluation, EvaluationObjective, EvaluationCompetency, RatingValue } from '../types';

interface EvaluationFormProps {
  navigate: (to: string) => void;
  editId?: string;
}

const DEFAULT_COMPETENCIES = [
  'Confidencialidad',
  'Orientacion a resultados',
  'Comunicacion efectiva',
  'Trabajo en equipo',
  'Proactividad',
];

const DEFAULT_OBJECTIVES: Omit<EvaluationObjective, 'evaluation_id'>[] = Array.from({ length: 5 }, (_, i) => ({
  order_num: i + 1,
  objective: '',
  results: '',
  rating: null,
}));

const RATING_COLS: { value: RatingValue; label: string }[] = [
  { value: 'debajo', label: 'Debajo de Expectativas' },
  { value: 'mejorar', label: 'Desempeno a Mejorar' },
  { value: 'cumple', label: 'Cumple Expectativas' },
  { value: 'supera', label: 'Supera Expectativas' },
];

const EvaluationForm: React.FC<EvaluationFormProps> = ({ navigate, editId }) => {
  const { user } = useAuth();
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [info, setInfo] = useState({
    employee_name: '',
    employee_position: '',
    employee_department: '',
    supervisor_name: '',
    period: '2da Evaluacion Junio 2025',
    evaluation_date: new Date().toISOString().split('T')[0],
    supervisor_comments: '',
    employee_comments: '',
    status: 'draft' as 'draft' | 'completed',
  });

  const [objectives, setObjectives] = useState<EvaluationObjective[]>(
    DEFAULT_OBJECTIVES.map(o => ({ ...o }))
  );
  const [competencies, setCompetencies] = useState<EvaluationCompetency[]>(
    DEFAULT_COMPETENCIES.map((c, i) => ({ order_num: i + 1, competency: c, rating: null }))
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      setLoading(true);
      const { data: ev } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', editId)
        .maybeSingle();
      if (ev) {
        setInfo({
          employee_name: ev.employee_name,
          employee_position: ev.employee_position,
          employee_department: ev.employee_department,
          supervisor_name: ev.supervisor_name,
          period: ev.period,
          evaluation_date: ev.evaluation_date,
          supervisor_comments: ev.supervisor_comments,
          employee_comments: ev.employee_comments,
          status: ev.status,
        });
      }
      const { data: objs } = await supabase
        .from('evaluation_objectives')
        .select('*')
        .eq('evaluation_id', editId)
        .order('order_num');
      if (objs && objs.length > 0) setObjectives(objs as EvaluationObjective[]);

      const { data: comps } = await supabase
        .from('evaluation_competencies')
        .select('*')
        .eq('evaluation_id', editId)
        .order('order_num');
      if (comps && comps.length > 0) setCompetencies(comps as EvaluationCompetency[]);

      setLoading(false);
    };
    load();
  }, [editId]);

  const handleSave = async (status?: 'draft' | 'completed') => {
    setSaving(true);
    const finalStatus = status || info.status;

    let evalId = editId;

    if (isEdit) {
      const { error } = await supabase
        .from('evaluations')
        .update({ ...info, status: finalStatus })
        .eq('id', editId!);
      if (error) { showToast('error', 'Error al guardar.'); setSaving(false); return; }
    } else {
      const { data, error } = await supabase
        .from('evaluations')
        .insert({ ...info, status: finalStatus, created_by: user?.id })
        .select('id')
        .single();
      if (error || !data) { showToast('error', 'Error al crear evaluacion.'); setSaving(false); return; }
      evalId = data.id;
    }

    await supabase.from('evaluation_objectives').delete().eq('evaluation_id', evalId!);
    const objRows = objectives
      .filter(o => o.objective.trim())
      .map(o => ({ evaluation_id: evalId!, order_num: o.order_num, objective: o.objective, results: o.results, rating: o.rating }));
    if (objRows.length > 0) await supabase.from('evaluation_objectives').insert(objRows);

    await supabase.from('evaluation_competencies').delete().eq('evaluation_id', evalId!);
    const compRows = competencies
      .filter(c => c.competency.trim())
      .map(c => ({ evaluation_id: evalId!, order_num: c.order_num, competency: c.competency, rating: c.rating }));
    if (compRows.length > 0) await supabase.from('evaluation_competencies').insert(compRows);

    setSaving(false);
    showToast('success', finalStatus === 'completed' ? 'Evaluacion completada.' : 'Evaluacion guardada como borrador.');
    if (!isEdit) setTimeout(() => navigate(`/panel/evaluaciones/editar/${evalId}`), 1000);
    else setInfo(prev => ({ ...prev, status: finalStatus }));
  };

  const updateObjective = (idx: number, field: keyof EvaluationObjective, value: string | RatingValue) => {
    setObjectives(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const addObjective = () => {
    setObjectives(prev => [...prev, { order_num: prev.length + 1, objective: '', results: '', rating: null }]);
  };

  const removeObjective = (idx: number) => {
    setObjectives(prev => prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, order_num: i + 1 })));
  };

  const updateCompetency = (idx: number, field: keyof EvaluationCompetency, value: string | RatingValue) => {
    setCompetencies(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/panel/evaluaciones')} className="p-2 rounded-xl hover:bg-slate-200 transition-colors text-slate-600">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Editar Evaluacion' : 'Nueva Evaluacion'}</h1>
              <p className="text-slate-500 text-sm">Evaluacion de desempeno 2da parte - Junio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                onClick={() => navigate(`/panel/evaluaciones/ver/${editId}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Eye size={14} />
                Vista previa
              </button>
            )}
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <Save size={14} />
              Guardar borrador
            </button>
            <button
              onClick={() => handleSave('completed')}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all disabled:opacity-60"
            >
              <CheckCircle size={14} />
              {saving ? 'Guardando...' : 'Completar evaluacion'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Datos del Colaborador</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Nombre del Colaborador', key: 'employee_name', placeholder: 'Nombre completo' },
                { label: 'Puesto', key: 'employee_position', placeholder: 'Cargo o puesto' },
                { label: 'Departamento / Area', key: 'employee_department', placeholder: 'Area o departamento' },
                { label: 'Jefe Inmediato', key: 'supervisor_name', placeholder: 'Nombre del supervisor' },
                { label: 'Periodo de Evaluacion', key: 'period', placeholder: '2da Evaluacion Junio 2025' },
                { label: 'Fecha de Evaluacion', key: 'evaluation_date', placeholder: '', type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    value={(info as Record<string, string>)[field.key]}
                    onChange={e => setInfo(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#0A2647] text-white px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider">Objetivos de Desempeno</h2>
              <p className="text-blue-200 text-xs mt-0.5">Marque con X la calificacion correspondiente para cada objetivo</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-8">N.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-72">Objetivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Resultados a la Fecha</th>
                    {RATING_COLS.map(r => (
                      <th key={r.value} className="text-center px-3 py-3 text-xs font-semibold text-slate-600 w-28">{r.label}</th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {objectives.map((obj, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={2}
                          value={obj.objective}
                          onChange={e => updateObjective(idx, 'objective', e.target.value)}
                          placeholder="Descripcion del objetivo..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={2}
                          value={obj.results}
                          onChange={e => updateObjective(idx, 'results', e.target.value)}
                          placeholder="Resultados a la fecha de revision..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-none"
                        />
                      </td>
                      {RATING_COLS.map(r => (
                        <td key={r.value} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => updateObjective(idx, 'rating', obj.rating === r.value ? null : r.value)}
                            className={`w-8 h-8 rounded-lg border-2 font-bold text-sm transition-all mx-auto flex items-center justify-center ${
                              obj.rating === r.value
                                ? 'border-[#0A2647] bg-[#0A2647] text-white'
                                : 'border-gray-300 hover:border-[#0A2647]/40 text-transparent'
                            }`}
                          >
                            X
                          </button>
                        </td>
                      ))}
                      <td className="px-2 py-3">
                        {objectives.length > 1 && (
                          <button onClick={() => removeObjective(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={addObjective}
                className="inline-flex items-center gap-2 text-sm text-[#0A2647] hover:text-[#144272] font-medium transition-colors"
              >
                <Plus size={14} />
                Agregar objetivo
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#0A2647] text-white px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider">Revision de Factores Conductuales y Habilidades Tecnicas</h2>
              <p className="text-blue-200 text-xs mt-0.5">Evaluar las 5 conductas definidas</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-8">N.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Conducta y Habilidad Tecnica</th>
                    {RATING_COLS.map(r => (
                      <th key={r.value} className="text-center px-3 py-3 text-xs font-semibold text-slate-600 w-28">{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {competencies.map((comp, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={comp.competency}
                          onChange={e => updateCompetency(idx, 'competency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                        />
                      </td>
                      {RATING_COLS.map(r => (
                        <td key={r.value} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => updateCompetency(idx, 'rating', comp.rating === r.value ? null : r.value)}
                            className={`w-8 h-8 rounded-lg border-2 font-bold text-sm transition-all mx-auto flex items-center justify-center ${
                              comp.rating === r.value
                                ? 'border-[#0A2647] bg-[#0A2647] text-white'
                                : 'border-gray-300 hover:border-[#0A2647]/40 text-transparent'
                            }`}
                          >
                            X
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Comentarios</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios Jefe Inmediato</label>
                <textarea
                  rows={4}
                  value={info.supervisor_comments}
                  onChange={e => setInfo(prev => ({ ...prev, supervisor_comments: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios del Colaborador</label>
                <textarea
                  rows={4}
                  value={info.employee_comments}
                  onChange={e => setInfo(prev => ({ ...prev, employee_comments: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-4">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <Save size={14} />
              Guardar borrador
            </button>
            <button
              onClick={() => handleSave('completed')}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all disabled:opacity-60"
            >
              <CheckCircle size={14} />
              {saving ? 'Guardando...' : 'Completar evaluacion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationForm;
