import { supabase } from './supabase';

export type AnalyticsEventType = 'page_view' | 'engagement' | 'scroll' | 'download' | 'pdf_open' | 'print';

export interface AnalyticsContext {
  eventType: AnalyticsEventType;
  route: string;
  category?: string | null;
  policyId?: string | null;
  policySlug?: string | null;
  policyTitle?: string | null;
  durationSeconds?: number;
  scrollPercent?: number;
}

function createIdentifier(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getIdentifier(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const identifier = createIdentifier();
  storage.setItem(key, identifier);
  return identifier;
}

function getVisitorId(): string {
  return getIdentifier(window.localStorage, 'ptm-analytics-visitor');
}

function getSessionId(): string {
  return getIdentifier(window.sessionStorage, 'ptm-analytics-session');
}

export function trackAnalyticsEvent(context: AnalyticsContext): void {
  if (typeof window === 'undefined') return;

  void supabase.from('analytics_events').insert({
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    event_type: context.eventType,
    route: context.route,
    category: context.category ?? null,
    policy_id: context.policyId ?? null,
    policy_slug: context.policySlug ?? null,
    policy_title: context.policyTitle ?? null,
    duration_seconds: context.durationSeconds ?? null,
    scroll_percent: context.scrollPercent ?? null,
  });
}
