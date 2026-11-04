import { api } from '@/api/session';

import type { Movement } from './logic';

const PAGE = 30;
const more = (page: number, total_pages?: number) => (page < (total_pages ?? 1) ? page + 1 : undefined);

/** The stock ledger, newest first (needs `inventory.view_movements`). Insert-only on the server: nothing here can change a row. */
export async function listMovements(o: { type?: string; search?: string; page: number }) {
  const env = await api.envelope<Movement[]>('GET', '/inventory/movements/', { query: { limit: PAGE, page: o.page, type: o.type, search: o.search || undefined } });
  return { rows: env.data ?? [], nextPage: more(o.page, env.meta?.total_pages) };
}

/** Totals over every movement the list would show, not only the loaded page. */
export type MovementTotals = { movements: number; units_in: string; units_out: string; products: number };
export const movementTotals = (o: { type?: string; search?: string }) => api.get<MovementTotals>('/inventory/movements/summary/', { query: { type: o.type, search: o.search || undefined } });
