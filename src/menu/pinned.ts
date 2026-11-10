import type { Href } from 'expo-router';

import type { MenuItem } from './items.ts';

/** What the top of the menu shows before the person has used anything: the daily jobs of a shop. */
export const DEFAULT_PINNED = ['pos', 'stock-levels', 'customers', 'sales', 'new-purchase', 'money'] as const;

/** Short names for the big buttons; anything else shows its menu title. */
export const SHORT_TITLE: Record<string, string> = { pos: 'Sell', 'stock-levels': 'Stock', customers: 'Customers', sales: 'Invoice', 'new-purchase': 'Purchase', money: 'Money' };

export const routePath = (route: Href): string => (typeof route === 'string' ? route : String((route as { pathname: string }).pathname));

/**
 * The tasks for the six big buttons: what this person opens most (more taps first), then the daily jobs to fill the rest.
 * `items` is what they may open. Two rows that lead to the same page count once.
 */
export function topTasks(items: MenuItem[], counts: Record<string, number>, size = 6): MenuItem[] {
  const pool = items.filter((i) => i.id !== 'dashboard');
  const rank = (id: string) => { const n = (DEFAULT_PINNED as readonly string[]).indexOf(id); return n < 0 ? 99 : n; };
  const used = pool.filter((i) => (counts[i.id] ?? 0) > 0).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || rank(a.id) - rank(b.id));
  const defaults = DEFAULT_PINNED.map((id) => pool.find((i) => i.id === id)).filter((i): i is MenuItem => !!i);
  const out: MenuItem[] = [];
  const seen = new Set<string>();
  for (const i of [...used, ...defaults]) {
    const key = routePath(i.route) + (typeof i.route === 'string' ? '' : JSON.stringify((i.route as { params?: unknown }).params ?? {}));
    if (seen.has(key) || out.some((o) => o.id === i.id)) continue;
    seen.add(key);
    out.push(i);
    if (out.length === size) break;
  }
  return out;
}
