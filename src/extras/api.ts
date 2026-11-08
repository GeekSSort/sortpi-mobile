import { api } from '@/api/session';

/** One line of goods given free (checked live). Reading and giving need `inventory.adjust`. */
export type FreeLine = { id: string; created_at: string; reference_no: string; recipient: string; document_note: string; note: string; product_name: string; variant_name: string; sku: string; quantity: string; unit_short_name: string; value?: string };
export type FreeSummary = { quantity: string; value: string; lines: number; documents: number };
export async function listFreeIssues(page: number) {
  const env = await api.envelope<FreeLine[]>('GET', '/inventory/free-issues/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export const freeSummary = () => api.get<FreeSummary>('/inventory/free-issues/summary/');
/** Takes goods off the shelf for nothing (checked live: it moves stock). */
export const giveFree = (body: { warehouse: string; recipient: string; note: string; items: { variant: string; quantity: string }[] }, idempotencyKey: string) => api.post<{ reference_no: string }>('/inventory/free-issues/', body, { idempotencyKey });

export type RunLine = { variant_id: string; product_name: string; sku: string; made: boolean; quantity: string; unit_cost: string; expiry_date: string | null };
/** A production run, or a combo pack made up (same endpoint). Reading needs `inventory.view`; recording `inventory.adjust`. */
export type ProductionRun = { id: string; reference_no: string; production_date: string; inputs_cost: string; outputs_cost: string; note: string; lines: RunLine[] };
export async function listProduction(page: number) {
  const env = await api.envelope<ProductionRun[]>('GET', '/inventory/production/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export type ProductionBody = { warehouse_id: string; production_date: string; note: string; made: { variant_id: string; quantity: string; unit_cost?: string; expiry_date?: string }[]; used: { variant_id: string; quantity: string }[] };
export const recordProduction = (body: ProductionBody, idempotencyKey: string) => api.post<ProductionRun>('/inventory/production/', body, { idempotencyKey });

export type Season = { season: string; products: number; on_hand: number };
/** Only for trades with seasons (else 400 SEASON_NOT_AVAILABLE). Needs `product.view`; marking down needs `product.update`. */
export const listSeasons = () => api.get<Season[]>('/products/seasons/');
export const markDownSeason = (season: string, percent: string, endsOn?: string) => api.post<unknown>('/products/seasons/markdown/', { season, percent, ...(endsOn ? { ends_on: endsOn } : {}) });

export type Metal = 'Gold' | 'Silver' | 'Platinum';
export type MetalRate = { metal: Metal; purity: string; rate_per_gram: string; effective_at: string };
/** Only for jewellery trades (else 400 FEATURE_NOT_IN_TRADE). Reading needs `product.view`; setting `product.update`, and it re-prices the jewellery. */
export const listMetalRates = () => api.get<MetalRate[]>('/products/metal-rates/', { query: { limit: 100 } });
export const setMetalRate = (b: { metal: Metal; purity: string; rate_per_gram: string }) => api.post<MetalRate & { repriced: number }>('/products/metal-rates/set/', b);

export type Serial = { id: string; serial: string; status: 'IN_STOCK' | 'SOLD'; product_name: string; variant_name: string; sku: string; warehouse_name: string; customer_name: string; invoice_number: string; sold_at: string | null; warranty_until: string | null; in_warranty: boolean };
export async function listSerials(o: { search: string; status: 'IN_STOCK' | 'SOLD' | null; page: number }) {
  const env = await api.envelope<Serial[]>('GET', '/inventory/serials/', { query: { limit: 25, page: o.page, search: o.search.trim() || undefined, status: o.status ?? undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
/** Registers serial numbers that have arrived. Needs `inventory.adjust`. */
export const registerSerials = (b: { variant: string; warehouse: string; serials: string[] }) => api.post<unknown>('/inventory/serials/', b);
/** Moves units to another warehouse. Needs `inventory.transfer`. */
export const moveSerials = (b: { serials: string[]; warehouse: string }) => api.post<unknown>('/inventory/serials/move/', b);
