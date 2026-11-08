import { ApiError } from '@/api/client';
import { api } from '@/api/session';
import { localDateISO } from '@/lib/dates';

export type SalesToday = { count: number; total: string; amount_due: string; average: string };

type Dates = { date_from?: string; date_to?: string };

/**
 * What was sold, the way the web Dashboard states it: net of goods that came back, refunded invoices not counted
 * (`/sales/summary/`, needs `report.sales`). `/sales/totals/` counts a refunded invoice in full, so it read 70.15 where the Dashboard read 69.00.
 * Someone without the report permission gets null and keeps the list's own totals.
 */
export async function netSold(d: Dates): Promise<{ count: number; total: string } | null> {
  try {
    const s = await api.get<{ sale_count: number; revenue: string }>('/sales/summary/', { query: { from_date: d.date_from, to_date: d.date_to } });
    return { count: s.sale_count, total: s.revenue };
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return null;
    throw e;
  }
}

/** Count, total and money still owed for a range: the money still owed is the ledger's (totals), the rest is net of returns (see `netSold`). */
export async function soldInRange(d: Dates): Promise<SalesToday> {
  const [t, net] = await Promise.all([api.get<SalesToday>('/sales/totals/', { query: d }), netSold(d)]);
  return net ? { ...t, ...net } : t;
}

/** What the shop sold today. The server filters by `date_from` and `date_to` (checked on the live API; the contract does not list them). */
export const salesToday = () => {
  const today = localDateISO();
  return soldInRange({ date_from: today, date_to: today });
};

import { listCustomers, type CustomerRow } from '@/customers/api';
import { listStock, type StockRow } from '@/stock/api';
import { lastSevenDays } from './week';

export type DayTotal = { date: string; weekday: number; total: string; count: number };

/**
 * Sales for the six days before today. `/sales/daily/` would be one call, but it ignores dates on the live server
 * (checked), so each day asks `/sales/totals/`, which does honour them. Past days do not change, so Home keeps this for
 * half an hour and today's figure comes from the "sold today" call it already makes: opening Home costs one request, not seven.
 */
export async function previousSixDaySales(): Promise<DayTotal[]> {
  return Promise.all(
    lastSevenDays()
      .slice(0, 6)
      .map(async (d) => {
        const r = (await netSold({ date_from: d.date, date_to: d.date })) ?? (await api.get<SalesToday>('/sales/totals/', { query: { date_from: d.date, date_to: d.date } }));
        return { ...d, total: r.total, count: r.count };
      }),
  );
}

export type RecentSale = { id: string; invoice_number: string; customer_name: string; sale_date: string; grand_total: string; due_amount: string; status: string };
export const recentSales = () => api.get<RecentSale[]>('/sales/', { query: { limit: 5 } });

/** The few items that need buying soon. */
export const lowStockItems = async (): Promise<StockRow[]> => (await listStock({ search: '', filter: 'low', page: 1, withUnstocked: false })).rows.slice(0, 5);

/** The customers who owe the most. The list cannot be sorted by what is owed, so ask for those who owe and sort here. */
export async function biggestDebts(): Promise<CustomerRow[]> {
  const page = await listCustomers({ search: '', owes: true, page: 1 });
  return [...page.rows].sort((a, b) => Number(b.current_balance) - Number(a.current_balance)).slice(0, 3);
}
