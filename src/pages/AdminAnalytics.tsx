import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Download, Eye, FileText, RefreshCw, ScrollText, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminAnalyticsProps {
  navigate: (to: string) => void;
}

type Range = 7 | 30 | 0;
type EventType = 'page_view' | 'engagement' | 'scroll' | 'download' | 'pdf_open' | 'print';

interface AnalyticsEvent {
  visitor_id: string;
  session_id: string;
  event_type: EventType;
  route: string;
  category: string | null;
  policy_id: string | null;
  policy_slug: string | null;
  policy_title: string | null;
  duration_seconds: number | null;
  scroll_percent: number | null;
  created_at: string;
}

interface PolicyMetric {
  id: string;
  title: string;
  category: string;
  views: number;
  visitors: number;
  downloads: number;
  pdfOpens: number;
  avgSeconds: number;
  avgScroll: number;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
};

const AdminAnalytics: React.FC<AdminAnalyticsProps> = () => {
  const [range, setRange] = useState<Range>(30);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchEvents = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('analytics_events')
      .select('visitor_id, session_id, event_type, route, category, policy_id, policy_slug, policy_title, duration_seconds, scroll_percent, created_at')
      .order('created_at', { ascending: false });

    if (range > 0) {
      const since = new Date();
      since.setDate(since.getDate() - range);
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error: fetchError } = await query;
    if (fetchError) setError(true);
    setEvents((data ?? []) as AnalyticsEvent[]);
    setLoading(false);
  };

  useEffect(() => { void fetchEvents(); }, [range]);

  const policyMetrics = useMemo<PolicyMetric[]>(() => {
    const byPolicy = new Map<string, { title: string; category: string; views: number; visitors: Set<string>; downloads: number; durationBySession: Map<string, number>; scrollBySession: Map<string, number> }>();

    events.filter(event => event.policy_id || event.policy_slug).forEach(event => {
      const id = event.policy_id ?? event.policy_slug!;
      const metric = byPolicy.get(id) ?? {
        title: event.policy_title ?? 'Política sin título',
        category: event.category ?? 'Sin categoría',
        views: 0,
        visitors: new Set<string>(),
        downloads: 0,
        pdfOpens: 0,
        durationBySession: new Map<string, number>(),
        scrollBySession: new Map<string, number>(),
      };
      if (event.event_type === 'page_view') {
        metric.views += 1;
        metric.visitors.add(event.visitor_id);
      }
      if (event.event_type === 'download') metric.downloads += 1;
      if (event.event_type === 'pdf_open') metric.pdfOpens += 1;
      if (event.event_type === 'engagement' && event.duration_seconds !== null) {
        metric.durationBySession.set(event.session_id, Math.max(metric.durationBySession.get(event.session_id) ?? 0, event.duration_seconds));
      }
      if ((event.event_type === 'engagement' || event.event_type === 'scroll') && event.scroll_percent !== null) {
        metric.scrollBySession.set(event.session_id, Math.max(metric.scrollBySession.get(event.session_id) ?? 0, event.scroll_percent));
      }
      byPolicy.set(id, metric);
    });

    return [...byPolicy.entries()]
      .map(([id, metric]) => {
        const durations = [...metric.durationBySession.values()];
        const scrolls = [...metric.scrollBySession.values()];
        return {
          id,
          title: metric.title,
          category: metric.category,
          views: metric.views,
          visitors: metric.visitors.size,
          downloads: metric.downloads,
          pdfOpens: metric.pdfOpens,
          avgSeconds: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0,
          avgScroll: scrolls.length ? scrolls.reduce((sum, value) => sum + value, 0) / scrolls.length : 0,
        };
      })
      .sort((a, b) => b.views - a.views);
  }, [events]);

  const categoryMetrics = useMemo(() => {
    const categories = new Map<string, { views: number; visitors: Set<string> }>();
    events.filter(event => event.event_type === 'page_view' && event.category).forEach(event => {
      const metric = categories.get(event.category!) ?? { views: 0, visitors: new Set<string>() };
      metric.views += 1;
      metric.visitors.add(event.visitor_id);
      categories.set(event.category!, metric);
    });
    return [...categories.entries()].sort(([, a], [, b]) => b.views - a.views);
  }, [events]);

  const stats = useMemo(() => {
    const views = events.filter(event => event.event_type === 'page_view' && event.policy_id);
    const durations = new Map<string, number>();
    events.filter(event => event.event_type === 'engagement' && event.policy_id && event.duration_seconds !== null).forEach(event => {
      const key = `${event.policy_id}:${event.session_id}`;
      durations.set(key, Math.max(durations.get(key) ?? 0, event.duration_seconds!));
    });
    const totalSeconds = [...durations.values()].reduce((sum, value) => sum + value, 0);
    return {
      visitors: new Set(views.map(event => event.visitor_id)).size,
      views: views.length,
      downloads: events.filter(event => event.event_type === 'download').length,
      avgSeconds: durations.size ? totalSeconds / durations.size : 0,
    };
  }, [events]);

  const statCards = [
    { label: 'Personas que vieron políticas', value: stats.visitors.toLocaleString('es-GT'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Visitas a políticas', value: stats.views.toLocaleString('es-GT'), icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tiempo promedio observado', value: formatDuration(stats.avgSeconds), icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Descargas de PDF', value: stats.downloads.toLocaleString('es-GT'), icon: Download, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Comportamiento del portal</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analítica</h1>
            <p className="text-sm text-slate-500 mt-1">Visitas, lectura y actividad de los documentos publicados.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {([{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 0, label: 'Todo' }] as { value: Range; label: string }[]).map(option => (
                <button key={option.value} onClick={() => setRange(option.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${range === option.value ? 'bg-[#0A2647] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {option.label}
                </button>
              ))}
            </div>
            <button onClick={() => void fetchEvents()} className="p-2.5 rounded-xl border border-gray-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors" title="Actualizar">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">No se pudieron cargar los datos de analítica.</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}><Icon size={18} className={color} /></div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Rendimiento por política</h2>
              <p className="text-xs text-slate-400 mt-0.5">El tiempo y el scroll son valores aproximados observados en pantalla.</p>
            </div>
            <BarChart3 size={18} className="text-slate-300" />
          </div>
          {loading ? (
            <div className="px-5 py-14 text-center text-sm text-slate-400">Cargando actividad...</div>
          ) : policyMetrics.length === 0 ? (
            <div className="px-5 py-14 text-center"><FileText size={24} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">Todavía no hay actividad registrada.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><th className="px-5 py-3 font-semibold">Política</th><th className="px-4 py-3 font-semibold">Personas</th><th className="px-4 py-3 font-semibold">Visitas</th><th className="px-4 py-3 font-semibold">Tiempo medio</th><th className="px-4 py-3 font-semibold">Scroll medio</th><th className="px-4 py-3 font-semibold">PDF vistos</th><th className="px-4 py-3 font-semibold">Descargas</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {policyMetrics.map(metric => (
                    <tr key={metric.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 min-w-[250px]"><p className="text-sm font-semibold text-slate-800">{metric.title}</p><p className="text-xs text-slate-400 mt-0.5">{metric.category}</p></td>
                      <td className="px-4 py-4 text-sm text-slate-600">{metric.visitors}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{metric.views}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDuration(metric.avgSeconds)}</td>
                      <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><ScrollText size={14} className="text-slate-400" />{Math.round(metric.avgScroll)}%</span></td>
                      <td className="px-4 py-4 text-sm text-slate-600">{metric.pdfOpens}</td><td className="px-4 py-4 text-sm text-slate-600">{metric.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {categoryMetrics.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="text-sm font-bold text-slate-800">Actividad por sección</h2><p className="text-xs text-slate-400 mt-0.5">Personas y visitas en cada categoría del portal.</p></div>
              <BarChart3 size={18} className="text-slate-300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
              {categoryMetrics.map(([category, metric]) => (
                <div key={category} className="rounded-xl border border-gray-100 bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-700 truncate">{category}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500"><span><strong className="text-slate-800">{metric.visitors.size}</strong> personas</span><span><strong className="text-slate-800">{metric.views}</strong> visitas</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
