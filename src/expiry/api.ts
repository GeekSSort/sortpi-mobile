import { api } from '@/api/session';

import type { Batch, ExpiryState } from './logic';

const PAGE = 30;
const more = (page: number, total_pages?: number) => (page < (total_pages ?? 1) ? page + 1 : undefined);

/** Dated stock by batch, soonest first (needs `inventory.view`). Only shops with the expiry feature: others get 404. `withinDays` narrows "expiring". */
export async function listBatches(o: { state: ExpiryState; withinDays: number; search?: string; page: number }) {
  const env = await api.envelope<Batch[]>('GET', '/inventory/expiry/', { query: { limit: PAGE, page: o.page, state: o.state, within_days: o.state === 'expiring' ? o.withinDays : undefined, search: o.search || undefined } });
  return { rows: env.data ?? [], total: env.meta?.total ?? 0, nextPage: more(o.page, env.meta?.total_pages) };
}

export type ExpirySummary = { within_days: number; expired_batches: number; expired_quantity: string; expired_value?: string; expiring_batches: number; expiring_quantity: string; expiring_value?: string; undated_lines: number };
export const expirySummary = (withinDays: number) => api.get<ExpirySummary>('/inventory/expiry/summary/', { query: { within_days: withinDays } });
