import { api } from '@/api/session';

/** A till shift (checked live). Money is text; the cash figures are null until the shift is closed. Needs `pos.access`; a cashier sees only their own. */
export type ShiftRow = {
  id: string;
  branch_name: string;
  cashier_name: string;
  counter_name: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_cash: string;
  expected_cash: string | null;
  counted_cash: string | null;
  variance: string | null;
  status: string;
  note: string;
};

export type ShiftSummary = { cash_sales: string; cash_refunds: string; cash_in: string; cash_out: string; sale_count: number; total_sales: string; expected_cash: string; other_methods: { method: string; amount: string }[] };

const PAGE = 20;

/** One page of shifts, newest first. */
export async function listShifts(page: number) {
  const env = await api.envelope<ShiftRow[]>('GET', '/pos/shifts/', { query: { limit: PAGE, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}

export const shiftSummary = (id: string) => api.get<ShiftSummary>(`/pos/shifts/${id}/summary/`);
