import { api } from '@/api/session';

/** A supplier as the server sends it. A positive `current_balance` is money the shop owes them (checked on the OpenAPI file and the live local API). */
export type SupplierRow = { id: string; code: string; name: string; phone: string; contact_person: string; current_balance: string; credit_limit: string; total_purchases: string; total_paid: string; total_due: string; last_purchase_date: string | null; is_active: boolean };
export type SupplierSummary = { total_suppliers: number; total_purchases: string; total_paid: string; total_due: string };
export type LedgerRow = { id: string; created_at: string; transaction_type: string; amount: string; balance_after: string; note: string };

const PAGE = 25;

/** One page of suppliers by name. Search matches the name (contains), the code (start) or an exact phone. Needs `supplier.view`. */
export async function listSuppliers(o: { search: string; page: number }) {
  const env = await api.envelope<SupplierRow[]>('GET', '/suppliers/', { query: { limit: PAGE, page: o.page, search: o.search.trim() || undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

/** Count, bought, paid and still owed over every supplier the search matches, worked out from the purchases by the server. */
export const supplierSummary = (search: string) => api.get<SupplierSummary>('/suppliers/summary/', { query: { search: search.trim() || undefined } });
export const getSupplier = (id: string) => api.get<SupplierRow>(`/suppliers/${id}/`);
/** Newest first; needs `supplier.view_ledger`. */
export const supplierLedger = (id: string) => api.get<LedgerRow[]>(`/suppliers/${id}/ledger/`, { query: { limit: 15 } });
/** Every code in use, to make the next one (the API needs a code and does not make one up). */
export const supplierCodes = async (): Promise<string[]> => (await api.get<{ code: string }[]>('/suppliers/', { query: { limit: 200 } })).map((r) => r.code);
export const createSupplier = (body: unknown) => api.post<{ id: string }>('/suppliers/', body);

/** One `idempotencyKey` per payment: tapping Save again after a dropped connection cannot pay twice. The amount is positive; the server posts it as a negative. */
export const paySupplier = (id: string, body: { amount: string; payment_method: string; note: string }, idempotencyKey: string) =>
  api.post<{ balance_after: string }>(`/suppliers/${id}/payments/`, { ...body, reference_type: 'PAYMENT' }, { idempotencyKey });
