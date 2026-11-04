import { api } from '@/api/session';

export type CustomerRow = {
  id: string;
  code: string;
  name: string;
  phone: string;
  customer_type: 'RETAIL' | 'WHOLESALE';
  credit_limit: string;
  current_balance: string;
  order_count: number;
  total_amount: string;
  total_paid: string;
  is_active: boolean;
};
export type CustomerSummary = { total_customers: number; with_due: number; total_receivable: string; new_this_month: number };

const PAGE = 25;

export async function listCustomers(o: { search: string; owes: boolean; page: number }) {
  const env = await api.envelope<CustomerRow[]>('GET', '/customers/', {
    query: { limit: PAGE, page: o.page, search: o.search.trim() || undefined, has_due: o.owes ? 1 : undefined },
  });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

export const customerSummary = () => api.get<CustomerSummary>('/customers/summary/');
export const getCustomer = (id: string) => api.get<CustomerRow>(`/customers/${id}/`);
export const createCustomer = (body: unknown) => api.post<{ id: string }>('/customers/', body);

/** One `idempotencyKey` per dialog: a retry after a dropped connection must not take the money twice. */
export const recordPayment = (id: string, body: { amount: string; payment_method: string; note: string }, idempotencyKey: string) =>
  api.post<{ balance_after?: string }>(`/customers/${id}/payments/`, { ...body, reference_type: 'PAYMENT' }, { idempotencyKey });
