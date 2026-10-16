import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { cleanSignupSource } from './signUp';

/**
 * Anonymous usage counts for the owner's Numbers page. Each event is a name, the time and (when the page has one)
 * the ?from tag. No user id, no cookie read, nothing stored in the browser; the server records the rest
 * (sign-ups, trials, subscriptions) itself. Mirror of Common/UsageEvents.cs on the server.
 */
export const BROWSER_USAGE_EVENTS = ['visit_home', 'visit_tools', 'visit_demo', 'visit_pricing', 'visit_blog', 'calculator_used', 'first_projection'] as const;

export type BrowserUsageEvent = (typeof BROWSER_USAGE_EVENTS)[number];

/** Every event the summary can list, in the order the Numbers page shows them. */
export const USAGE_EVENTS = [
  'visit_home',
  'visit_tools',
  'visit_demo',
  'visit_pricing',
  'visit_blog',
  'calculator_used',
  'signup',
  'trial_started',
  'first_projection',
  'subscribed',
] as const;

export type UsageEvent = (typeof USAGE_EVENTS)[number];

export const USAGE_EVENT_LABELS: Record<UsageEvent, string> = {
  visit_home: 'Home page visits',
  visit_tools: 'Tools page visits',
  visit_demo: 'Demo visits',
  visit_pricing: 'Pricing page visits',
  visit_blog: 'Blog visits',
  calculator_used: 'Calculators used',
  signup: 'Sign-ups',
  trial_started: 'Trials started',
  first_projection: 'First projection reached',
  subscribed: 'Subscriptions',
};

export function isUsageEvent(value: string): value is UsageEvent {
  return (USAGE_EVENTS as readonly string[]).includes(value);
}

/** Fire and forget: a count that fails to send must never get in anyone's way. */
export function recordUsage(name: BrowserUsageEvent, source?: string): void {
  const cleaned = cleanSignupSource(source);
  try {
    void api.post('/usage', cleaned ? { name, source: cleaned } : { name }).catch(() => undefined);
  } catch {
    // Nothing to do: counting is best effort.
  }
}

/**
 * Counts one visit when the page mounts, with the page's ?from tag if it has one (or the source given, such as
 * a blog post's slug). `enabled: false` waits, for a page that doesn't know yet whether it has anything to show.
 */
export function useRecordVisit(name: BrowserUsageEvent, options: { source?: string; enabled?: boolean } = {}): void {
  const [params] = useSearchParams();
  const source = options.source ?? params.get('from') ?? undefined;
  const enabled = options.enabled ?? true;
  const sent = useRef(false);

  useEffect(() => {
    if (!enabled || sent.current) return;
    sent.current = true;
    recordUsage(name, source);
  }, [name, source, enabled]);
}

/**
 * The "change" column of the Numbers page: how this period compares with the one before, as text.
 * Returns null when there's nothing to compare (both zero).
 */
export function describeChange(thisPeriod: number, previousPeriod: number): { text: string; direction: 'up' | 'down' | 'flat' } | null {
  if (thisPeriod === 0 && previousPeriod === 0) return null;
  if (previousPeriod === 0) return { text: 'New', direction: 'up' };
  const diff = thisPeriod - previousPeriod;
  if (diff === 0) return { text: 'Same', direction: 'flat' };
  const percent = Math.round((Math.abs(diff) / previousPeriod) * 100);
  return { text: `${diff > 0 ? '+' : '-'}${percent}%`, direction: diff > 0 ? 'up' : 'down' };
}

/** Returns a function that counts the event the first time it's called, then does nothing. */
export function useRecordOnce(name: BrowserUsageEvent): () => void {
  const sent = useRef(false);
  return () => {
    if (sent.current) return;
    sent.current = true;
    recordUsage(name);
  };
}
