import { api } from '@/api/session';

import type { countBody } from './count';

export type StockRow = {
  id: string;
  variant: string;
  sku: string;
  product: string;
  product_name: string;
  variant_name: string;
  warehouse_code: string;
  price: string;
  available: string;
  quantity: string;
  reorder_level: string;
  /** Only for roles that may see cost. */
  average_cost?: string;
  cost_price?: string;
  /** Null when the list includes items that never had stock (checked on the live server), so never print it blindly. */
  unit_short_name: string | null;
  unit_allow_decimal: boolean | null;
};

export type StockSummary = { lines: number; units: string; stock_value?: string; low_stock: number; out_of_stock: number };
export type StockFilter = 'all' | 'in' | 'low' | 'out';

const PAGE = 25;

/** One page of stock lines for the active branch, the whole catalogue including zero-stock items. Search matches name, SKU and barcode. */
export async function listStock(o: { search: string; filter: StockFilter; page: number; withUnstocked?: boolean; category?: string | null }) {
  const env = await api.envelope<StockRow[]>('GET', '/inventory/stock/', {
    query: { limit: PAGE, page: o.page, search: o.search.trim() || undefined, category: o.category || undefined, stock_status: o.filter === 'all' ? undefined : o.filter, include_unstocked: o.withUnstocked ?? true },
  });
  const total = env.meta?.total_pages ?? 1;
  return { rows: env.data ?? [], nextPage: o.page < total ? o.page + 1 : undefined };
}

/** `withUnstocked` also counts catalogue items that never had stock (the Stock list shows those so a new item can be found). Home leaves them out, so "finished" means items that were on the shelf and ran out. */
export const stockSummary = (withUnstocked = true) => api.get<StockSummary>('/inventory/stock/summary/', { query: { include_unstocked: withUnstocked } });

/** One page of a warehouse's lines for counting: every item, including those that never had stock. Needs `inventory.view`. */
export async function listCountRows(o: { warehouse: string; search: string; page: number }) {
  const env = await api.envelope<StockRow[]>('GET', '/inventory/stock/', { query: { warehouse: o.warehouse, include_unstocked: true, limit: PAGE, page: o.page, search: o.search.trim() || undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

/** The line for one item in one warehouse (a scan finds the item; this gives what the system says is there). */
export const stockOfVariant = (warehouse: string, variant: string) => api.get<StockRow[]>('/inventory/stock/', { query: { warehouse, variant, include_unstocked: true, limit: 1 } }).then((r) => r[0] ?? null);

/**
 * Posts the whole count as one adjustment, applied in the same call. Needs `inventory.adjust`.
 * Checked live: the same Idempotency-Key returns the same adjustment, so a retry after a lost connection is safe.
 */
export const postCount = (body: ReturnType<typeof countBody>, idempotencyKey: string) => api.post<{ id: string; reference_no: string }>('/inventory/adjustments/', body, { idempotencyKey });
