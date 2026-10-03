import { useEffect, useRef } from 'react';
import { AnalyticsContext, trackAnalyticsEvent } from '../lib/analytics';

interface PageAnalyticsOptions {
  route: string;
  category?: string | null;
  policyId?: string | null;
  policySlug?: string | null;
  policyTitle?: string | null;
  enabled?: boolean;
}

export function usePageAnalytics({
  route,
  category = null,
  policyId = null,
  policySlug = null,
  policyTitle = null,
  enabled = true,
}: PageAnalyticsOptions): void {
  const startedAt = useRef(Date.now());
  const maxScroll = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    startedAt.current = Date.now();
    maxScroll.current = 0;
    finished.current = false;

    const context = {
      route,
      category,
      policyId,
      policySlug,
      policyTitle,
    } satisfies Omit<AnalyticsContext, 'eventType'>;

    const getScrollPercent = (): number => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (documentHeight <= 0) return 100;
      return Math.min(100, Math.round((window.scrollY / documentHeight) * 100));
    };

    const recordProgress = (eventType: 'engagement' | 'scroll'): void => {
      maxScroll.current = Math.max(maxScroll.current, getScrollPercent());
      trackAnalyticsEvent({
        ...context,
        eventType,
        durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        scrollPercent: maxScroll.current,
      });
    };

    const finish = (): void => {
      if (finished.current) return;
      finished.current = true;
      recordProgress('engagement');
    };

    trackAnalyticsEvent({ ...context, eventType: 'page_view' });
    const interval = window.setInterval(() => recordProgress('engagement'), 15000);
    const handleScroll = (): void => {
      const nextScroll = getScrollPercent();
      if (nextScroll > maxScroll.current) {
        maxScroll.current = nextScroll;
        if (nextScroll >= 25 && nextScroll % 25 === 0) recordProgress('scroll');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', finish);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', finish);
      finish();
    };
  }, [enabled, route, category, policyId, policySlug, policyTitle]);
}
