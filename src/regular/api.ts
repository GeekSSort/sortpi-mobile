import { api } from '@/api/session';

export type Frequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type Direction = 'INCOME' | 'EXPENSE';
/** A repeating payment such as rent (checked live). `state` is DUE (today), OVERDUE, UPCOMING or another the server may add. */
export type Regular = {
  id: string;
  name: string;
  kind: Direction;
  category_id: string;
  category_name: string;
  amount: string;
  frequency: Frequency;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  last_paid_on: string | null;
  state: string;
  days_until_due: number;
  is_active: boolean;
  notes: string;
  branch_name: string;
  monthly_equivalent: string;
};
export type RegularSummary = { active: number; due_soon: number; overdue: number; monthly_out: string; monthly_in: string };

/** Reading needs `income.view` or `expense.view`; creating, `income.create` or `expense.create`. */
export async function listRegular(page: number) {
  const env = await api.envelope<Regular[]>('GET', '/regular-payments/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export const getRegular = (id: string) => api.get<Regular>(`/regular-payments/${id}/`);
export const regularSummary = () => api.get<RegularSummary>('/regular-payments/summary/');
export type RegularBody = { name: string; kind: Direction; category: string; amount: string; frequency: Frequency; start_date: string; notes: string };
export const createRegular = (body: RegularBody) => api.post<Regular>('/regular-payments/', { ...body, is_active: true });
/** Amend the schedule. Needs `income.update` / `expense.update`. */
export const updateRegular = (id: string, body: Partial<RegularBody> & { is_active?: boolean }) => api.patch<Regular>(`/regular-payments/${id}/`, body);
/** Removes the schedule. The vouchers it already wrote stay. Needs `income.delete` / `expense.delete`. */
export const deleteRegular = (id: string) => api.delete<void>(`/regular-payments/${id}/`);
/**
 * Pays the instalment due on `due_date` and writes a voucher. The due date is ALWAYS sent: checked live, a repeat without it pays the NEXT
 * instalment as well, while with it the server refuses the second (ALREADY_PAID).
 */
export const payRegular = (id: string, dueDate: string) => api.post<{ voucher_no: string }>(`/regular-payments/${id}/pay/`, { due_date: dueDate });
/** "Not paid this time": the instalment is recorded as skipped and nothing is posted. */
export const skipRegular = (id: string, dueDate: string) => api.post<Regular>(`/regular-payments/${id}/skip/`, { due_date: dueDate });
