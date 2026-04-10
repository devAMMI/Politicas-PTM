import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Evaluation, RatingValue } from '../types';

interface EvaluationPrintProps {
  id: string;
  navigate: (to: string) => void;
}

const RATING_COLS: { value: RatingValue; label: string }[] = [
  { value: 'debajo', label: 'Debajo de Expectativas' },
  { value: 'mejorar', label: 'Desempeno a Mejorar' },
  { value: 'cumple', label: 'Cumple Expectativas' },
  { value: 'supera', label: 'Supera Expectativas' },
];

const EvaluationPrint: React.FC<EvaluationPrintProps> = ({ id, navigate }) => {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: ev } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!ev) { setLoading(false); return; }

      const { data: objs } = await supabase
        .from('evaluation_objectives')
        .select('*')
        .eq('evaluation_id', id)
        .order('order_num');

      const { data: comps } = await supabase
        .from('evaluation_competencies')
        .select('*')
        .eq('evaluation_id', id)
        .order('order_num');

      setEvaluation({ ...ev, objectives: objs || [], competencies: comps || [] });
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
    </div>
  );

  if (!evaluation) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Evaluacion no encontrada.</p>
    </div>
  );

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/panel/evaluaciones')} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600">
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700">Vista previa: {evaluation.employee_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/panel/evaluaciones/editar/${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Pencil size={13} />
            Editar
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all"
          >
            <Printer size={13} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="p-6 flex justify-center">
        <div
          className="bg-white shadow-lg print-page"
          style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', fontSize: '9pt' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
            <tbody>
              <tr>
                <td style={{ width: '120px', verticalAlign: 'middle', paddingRight: '10px' }}>
                  <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" style={{ height: '45px', objectFit: 'contain' }} />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt', color: '#0A2647' }}>EVALUACION DE DESEMPENO</div>
                  <div style={{ fontSize: '9pt', color: '#444', marginTop: '2px' }}>{evaluation.period}</div>
                </td>
                <td style={{ width: '120px', textAlign: 'right', verticalAlign: 'middle', fontSize: '8pt', color: '#666' }}>
                  <div>Fecha:</div>
                  <div style={{ fontWeight: 'bold' }}>{formatDate(evaluation.evaluation_date)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '10px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '25%', fontSize: '8pt' }}>Colaborador</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', width: '25%', fontSize: '8pt' }}>{evaluation.employee_name}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '25%', fontSize: '8pt' }}>Puesto</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', width: '25%', fontSize: '8pt' }}>{evaluation.employee_position}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt' }}>Departamento</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '8pt' }}>{evaluation.employee_department}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt' }}>Jefe Inmediato</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '8pt' }}>{evaluation.supervisor_name}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0A2647', color: 'white' }}>
                <td colSpan={7} style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'center' }}>
                  EVALUACION DE OBJETIVOS DE DESEMPENO
                </td>
              </tr>
              <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                <td style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', width: '30px', textAlign: 'center', fontSize: '8pt' }}>N.</td>
                <td style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', fontSize: '8pt', width: '30%' }}>Objetivo</td>
                <td style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', fontSize: '8pt' }}>Resultados a la Fecha de Revision</td>
                {RATING_COLS.map(r => (
                  <td key={r.value} style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center', width: '60px' }}>
                    {r.label}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {(evaluation.objectives || []).map((obj, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', verticalAlign: 'top' }}>{obj.order_num}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 6px', fontSize: '8pt', verticalAlign: 'top' }}>{obj.objective}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 6px', fontSize: '8pt', verticalAlign: 'top' }}>{obj.results || ''}</td>
                    {RATING_COLS.map(r => (
                      <td key={r.value} style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                        {obj.rating === r.value ? 'x' : ''}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={7} style={{ border: '1px solid #ccc', padding: '3px 6px', backgroundColor: '#f9f9f9', fontSize: '7.5pt', color: '#666', fontStyle: 'italic' }}>
                      Resultados a la fecha de revision
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0A2647', color: 'white' }}>
                <td colSpan={6} style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'center' }}>
                  REVISION DE FACTORES CONDUCTUALES Y HABILIDADES TECNICAS
                </td>
              </tr>
              <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                <td style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', width: '30px', textAlign: 'center', fontSize: '8pt' }}>N.</td>
                <td style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', fontSize: '8pt' }}>
                  Conductas y Habilidades Tecnicas<br />
                  <span style={{ fontWeight: 'normal', fontSize: '7pt' }}>(Evaluar las 5 Definidas)</span>
                </td>
                {RATING_COLS.map(r => (
                  <td key={r.value} style={{ border: '1px solid #2d5986', padding: '4px 6px', fontWeight: 'bold', fontSize: '7pt', textAlign: 'center', width: '60px' }}>
                    {r.label}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {(evaluation.competencies || []).map((comp, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', verticalAlign: 'middle' }}>{comp.order_num}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 6px', fontSize: '8pt', verticalAlign: 'middle' }}>{comp.competency}</td>
                  {RATING_COLS.map(r => (
                    <td key={r.value} style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {comp.rating === r.value ? 'x' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#0A2647', color: 'white', fontWeight: 'bold', fontSize: '8pt', width: '30%' }}>
                  Comentarios Jefe Inmediato
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontSize: '8pt', minHeight: '40px', verticalAlign: 'top' }}>
                  {evaluation.supervisor_comments}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', backgroundColor: '#0A2647', color: 'white', fontWeight: 'bold', fontSize: '8pt' }}>
                  Comentarios del Colaborador
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontSize: '8pt', minHeight: '40px', verticalAlign: 'top' }}>
                  {evaluation.employee_comments}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <tbody>
              <tr>
                {['Firma Colaborador', 'Firma Jefe Inmediato', 'Firma RRHH'].map(label => (
                  <td key={label} style={{ textAlign: 'center', padding: '0 20px', verticalAlign: 'bottom' }}>
                    <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '8pt', color: '#444', marginTop: '30px' }}>
                      {label}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .print-page { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 10mm !important; }
        }
      `}</style>
    </div>
  );
};

export default EvaluationPrint;
