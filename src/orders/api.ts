import { api } from '@/api/session';

import type { collectBody, depositBody, orderBody, OrderStatus, quoteBody } from './logic';

/** Checked live on the local API. Money is text. `sale_id` is set once the order has been handed over. */
export type OrderItem = { id: string; variant_id: string; product_name: string; sku: string; quantity: string; unit_price: string; line_total: string };
export type CustomerOrder = {
  id: string;
  reference_no: string;
  kind: 'ORDER' | 'REPAIR' | 'TAILORING';
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  order_date: string;
  due_date: string;
  status: OrderStatus;
  subtotal: string;
  tax_amount: string;
  grand_total: string;
  deposit_paid: string;
  balance: string;
  note: string;
  sale_id: string | null;
  sale_invoice: string | null;
  cancel_reason: string;
  items: OrderItem[];
};
export type QuoteItem = { id: string; product_name: string; sku: string; quantity: string; unit_price: string; line_total: string };
export type Quotation = { id: string; reference_no: string; customer_id: string | null; customer_name: string; customer_phone: string; quote_date: string; valid_until: string; status: 'OPEN' | 'SENT' | 'CANCELLED'; expired: boolean; subtotal: string; tax_amount: string; grand_total: string; note: string; items: QuoteItem[] };

const PAGE = 25;
export type OrderFilter = { status: OrderStatus | 'ALL'; due?: 'overdue' | 'today' | 'week'; search: string; page: number };

/** One page of customer orders, newest first. Needs `sale.view`. */
export async function listOrders(o: OrderFilter) {
  const env = await api.envelope<CustomerOrder[]>('GET', '/customer-orders/', { query: { limit: PAGE, page: o.page, status: o.status === 'ALL' ? undefined : o.status, due: o.due, search: o.search.trim() || undefined } });
  return { rows: env.data ?? [], total: env.meta?.total ?? 0, nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
/** How many orders match (one row is asked for, the total is read). */
export const countOrders = async (q: { status?: OrderStatus; due?: 'overdue' | 'today' | 'week' }) => (await api.envelope<CustomerOrder[]>('GET', '/customer-orders/', { query: { limit: 1, ...q } })).meta?.total ?? 0;
export const getOrder = (id: string) => api.get<CustomerOrder>(`/customer-orders/${id}/`);
/** Takes an order. Needs `sale.create`. Not idempotent on the server: the screen guards a retry. */
export const createOrder = (body: ReturnType<typeof orderBody>) => api.post<CustomerOrder>('/customer-orders/', body);
/**
 * Money now, held as the customer's credit. Needs `sale.create`. Checked live: a repeated call takes a SECOND deposit even with the
 * same Idempotency-Key, so none is sent and the screen reads the order again before any retry.
 */
export const takeDeposit = (id: string, body: ReturnType<typeof depositBody>) => api.post<CustomerOrder>(`/customer-orders/${id}/deposit/`, body);
export const markReady = (id: string) => api.post<CustomerOrder>(`/customer-orders/${id}/ready/`);
/** Hands the order over as a sale on the caller's open shift; the whole balance is paid. Needs `sale.create`. */
export const handOver = (id: string, body: ReturnType<typeof collectBody>) => api.post<CustomerOrder>(`/customer-orders/${id}/collect/`, body);
/** Needs `sale.cancel`. */
export const cancelOrder = (id: string, reason: string) => api.post<CustomerOrder>(`/customer-orders/${id}/cancel/`, { reason });

export async function listQuotes(o: { status: 'ALL' | 'OPEN' | 'SENT' | 'CANCELLED'; search: string; page: number }) {
  const env = await api.envelope<Quotation[]>('GET', '/quotations/', { query: { limit: PAGE, page: o.page, status: o.status === 'ALL' ? undefined : o.status, search: o.search.trim() || undefined } });
  return { rows: env.data ?? [], total: env.meta?.total ?? 0, nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
export const getQuote = (id: string) => api.get<Quotation>(`/quotations/${id}/`);
export const createQuote = (body: ReturnType<typeof quoteBody>) => api.post<Quotation>('/quotations/', body);
/** What the server would charge, before anything is saved. Needs `sale.create`. */
export const previewQuote = (body: Pick<ReturnType<typeof quoteBody>, 'items'> & { customer_name?: string }) => api.post<{ subtotal: string; tax_amount: string; grand_total: string }>('/quotations/preview/', body);
export const cancelQuote = (id: string) => api.post<Quotation>(`/quotations/${id}/cancel/`);
/** Puts it on the till as a held cart; the shop resumes it from the Sell tab. One time only (QUOTATION_NOT_OPEN after). */
export const sendQuoteToTill = (id: string) => api.post<Quotation>(`/quotations/${id}/send-to-till/`);
