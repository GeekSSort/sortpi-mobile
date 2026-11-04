import { api } from '@/api/session';

import type { PurchaseStatus, StatusFilter, purchaseBody } from './logic';
import type { returnBody } from './returns';

/** The parts of an order the phone shows (checked on the OpenAPI file and the live local API). Money is text. */
export type PurchaseItemRow = { id: string; variant: string; sku: string; product_name: string; variant_name: string; unit_short_name: string; unit_allow_decimal: boolean; quantity: string; received_quantity: string; outstanding: string; returned_quantity: string; returnable: string; unit_cost: string; line_total: string };
export type Purchase = {
  id: string;
  reference_no: string;
  supplier: string;
  supplier_name: string;
  supplier_invoice_no: string;
  purchase_date: string;
  status: PurchaseStatus;
  subtotal: string;
  tax_amount: string;
  shipping_cost: string;
  discount_amount: string;
  grand_total: string;
  paid_amount: string;
  due_amount: string;
  note: string;
  adds_stock: boolean;
  items: PurchaseItemRow[];
};
export type PurchaseTotals = { count: number; total: string; paid: string; due: string; with_due: number };

const PAGE = 25;
const common = (status: StatusFilter, search: string) => ({ kind: 'PURCHASE', status: status === 'ALL' ? undefined : status, search: search.trim() || undefined });

/** One page of orders, newest first. Needs `purchase.view`. Old invoices are left out: they are a different thing on the web. */
export async function listPurchases(o: { status: StatusFilter; search: string; page: number }) {
  const env = await api.envelope<Purchase[]>('GET', '/purchases/', { query: { limit: PAGE, page: o.page, ...common(o.status, o.search) } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

/** Count, total, paid and still due over the same filter as the list: drafts and cancelled orders are not money. */
export const purchaseTotals = (status: StatusFilter, search: string) => api.get<PurchaseTotals>('/purchases/totals/', { query: common(status, search) });
export const getPurchase = (id: string) => api.get<Purchase>(`/purchases/${id}/`);

/** Makes a DRAFT: nothing moves, nothing is owed. One `idempotencyKey` per save. */
export const createPurchase = (body: ReturnType<typeof purchaseBody>, idempotencyKey: string) => api.post<Purchase>('/purchases/', body, { idempotencyKey });
/** Places the order: the supplier is now owed. Stock does not move yet. */
export const confirmPurchase = (id: string) => api.post<Purchase>(`/purchases/${id}/confirm/`);
/** Everything still outstanding arrives: stock goes up, at the landed cost. (Omitting `lines` means all.) */
export const receivePurchase = (id: string) => api.post<Purchase>(`/purchases/${id}/receive/`, {});
export const cancelPurchase = (id: string) => api.post<Purchase>(`/purchases/${id}/cancel/`);
/** Pays an order. The amount is positive; the server refuses more than is due. One `idempotencyKey` per payment. */
export const payPurchase = (id: string, body: { amount: string; payment_method: string; payment_date: string; note: string }, idempotencyKey: string) => api.post<unknown>(`/purchases/${id}/payments/`, body, { idempotencyKey });

/** One return of goods to a supplier, as the server numbered and priced it (cost at which the goods came in, plus the order's tax). */
export type PurchaseReturn = { id: string; reference_no: string; return_date: string; subtotal: string; tax_amount: string; grand_total: string; reason: string; items: { id: string; product_name: string; quantity: string; unit_short_name: string; unit_allow_decimal: boolean; unit_cost: string; line_total: string }[] };

/**
 * Sends goods back to the supplier: stock goes down, and the supplier owes less (or owes us). Needs `purchase.return`.
 * Checked live: this endpoint is NOT idempotent (the server's own table does not mark it), so a repeated key makes a second return.
 * No key is sent; the screen reads the order again before any retry instead.
 */
export const sendGoodsBack = (id: string, body: ReturnType<typeof returnBody>) => api.post<PurchaseReturn>(`/purchases/${id}/returns/`, body);
/** The returns already made on one order, newest first. Needs `purchase.view`. */
export const returnsOfPurchase = (id: string) => api.get<PurchaseReturn[]>('/purchase-returns/', { query: { purchase: id, limit: 50 } });
