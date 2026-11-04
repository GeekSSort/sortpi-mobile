import { api } from '@/api/session';
import type { SalesToday } from '@/home/api';

import { rangeDates, type SalesRange } from './logic';
import type { previewBody, returnBody, ReturnPreview } from './returns';

export type SaleItem = {
  id: string;
  product_name: string;
  sku: string;
  quantity: string;
  unit_short_name: string;
  unit_allow_decimal: boolean;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;
  line_total: string;
  charged_total: string;
  returned_quantity: string;
};
export type SalePayment = { id: string; payment_method: string; amount: string; reference_no: string; created_at: string };

/** The parts of a sale the phone shows. `profit` and cost come back only for people who may see cost, and are left out on purpose. */
export type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer: string | null;
  customer_name: string;
  customer_phone: string;
  cashier_name: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  grand_total: string;
  paid_amount: string;
  due_amount: string;
  returned_amount: string;
  refund_state: 'NONE' | 'RETURNED' | 'PARTIAL' | 'FULL';
  status: 'COMPLETED' | 'CANCELLED';
  cancel_reason: string;
  note: string;
  items: SaleItem[];
  payments: SalePayment[];
};

const PAGE = 25;

/** One page of sales, newest first. Search matches invoice number, customer name or phone. Needs `sale.view` (or `sale.view_own` for just the caller's). */
export async function listSales(o: { search: string; range: SalesRange; page: number }) {
  const env = await api.envelope<Sale[]>('GET', '/sales/', { query: { limit: PAGE, page: o.page, search: o.search.trim() || undefined, ...rangeDates(o.range) } });
  return { rows: env.data ?? [], total: env.meta?.total ?? 0, nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

export const getSale = (id: string) => api.get<Sale>(`/sales/${id}/`);

/** Count, total and money still owed for a range. The server honours `date_from` and `date_to` here (checked on the live API). */
export const salesTotals = (range: SalesRange) => api.get<SalesToday>('/sales/totals/', { query: rangeDates(range) });

// ---- returns (needs `sale.refund`; checked against openapi.yaml and the live local API: /sales/{id}/returns/preview/ writes nothing) ----
export const previewReturn = (saleId: string, body: ReturnType<typeof previewBody>) => api.post<ReturnPreview>(`/sales/${saleId}/returns/preview/`, body);
export type SavedReturn = { id: string; reference_no: string; grand_total: string; refund_amount: string; applied_to_due: string };
/** One `idempotencyKey` per confirm: tapping again after a dropped connection cannot send the goods back twice. */
export const createReturn = (saleId: string, body: ReturnType<typeof returnBody>, idempotencyKey: string) => api.post<SavedReturn>(`/sales/${saleId}/returns/`, body, { idempotencyKey });
