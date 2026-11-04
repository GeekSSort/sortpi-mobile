import { api } from '@/api/session';

import type { MoneyRange, MoneyType, voucherBody } from './logic';
import { rangeDates } from './logic';

/** One entry of money in or out. `amount` has no sign; `signed_amount` does (checked on the OpenAPI file and the live local API). */
export type Voucher = { id: string; type: MoneyType; voucher_no: string; date: string; category_id: string | null; category_name: string; description: string; amount: string; signed_amount: string; payment_account_name: string; created_at: string };
export type VoucherTotals = { count: number; income: string; expense: string; net: string };
export type Category = { id: string; name: string };

const PAGE = 25;

/** One page of entries, both sides together, newest first. Needs `income.view` and `expense.view`. */
export async function listVouchers(o: { range: MoneyRange; type: MoneyType | null; page: number }) {
  const env = await api.envelope<Voucher[]>('GET', '/vouchers/', { query: { limit: PAGE, page: o.page, type: o.type ?? undefined, ...rangeDates(o.range) } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

/** Count, money in, money out and what is left, over the same period (and side) as the list. Worked out by the server, not summed from the page. */
export const voucherTotals = (range: MoneyRange, type: MoneyType | null) => api.get<VoucherTotals>('/vouchers/summary/', { query: { type: type ?? undefined, ...rangeDates(range) } });

const categoryPath = (type: MoneyType) => (type === 'INCOME' ? '/income-categories/' : '/expense-categories/');
/** The shop's own category names for one side (needs `income_category.view` / `expense_category.view`). */
export const listCategories = (type: MoneyType) => api.get<Category[]>(categoryPath(type), { query: { limit: 100 } });
export const createCategory = (type: MoneyType, name: string) => api.post<Category>(categoryPath(type), { name: name.trim() });

/** One `idempotencyKey` per save: tapping Save again after a dropped connection cannot write the entry twice. */
export const createVoucher = (body: ReturnType<typeof voucherBody>, idempotencyKey: string) => api.post<Voucher>('/vouchers/', body, { idempotencyKey });
/** Cancels an entry: the books behind it are reversed and it is removed (the number is not used again). */
export const voidVoucher = (id: string) => api.delete<unknown>(`/vouchers/${id}/`);
