import { periodDates } from '@/reports/logic';
import { bestSellers, customerDue, howPaid, salesDaily, salesSummary, supplierDue } from '@/reports/api';
import { soldInRange } from '@/home/api';
import { listSales } from '@/sales/api';
import { searchCatalog } from '@/sell/catalog';
import { listStock } from '@/stock/api';
import { itemName } from '@/sell/catalog-map';

import { allowed } from './allowed';
import type { IntentId, Match } from './intents';
import { billsAnswer, duesAnswer, notAllowed, notUnderstood, paymentsAnswer, priceAnswer, profitAnswer, salesAnswer, startSellingAnswer, stockListAnswer, stockOfAnswer, topAnswer, type Answer } from './model';

const toLine = (r: { product_name: string; variant_name: string; available: string; reorder_level: string; unit_short_name: string | null }) => ({ name: itemName(r.product_name, r.variant_name), available: r.available, reorder: r.reorder_level, unit: r.unit_short_name });
const range = (id: 'today' | 'yesterday' | 'week') => periodDates(id);
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

async function sales(title: string, id: 'today' | 'yesterday' | 'week'): Promise<Answer> {
  const w = range(id);
  const now = await soldInRange({ date_from: w.from_date, date_to: w.to_date });
  const bars = id === 'week' ? (await salesDaily(w)).map((d) => ({ date: d.date, revenue: d.revenue })) : undefined;
  return salesAnswer({ title, count: now.count, total: now.total, bars });
}

/** Runs one understood question against the shop's own data. Every number in the answer comes from the server's reports. */
export async function answerIntent(intent: IntentId, product: string | undefined, perms: readonly string[] | undefined): Promise<Answer> {
  if (!allowed(intent, perms)) return notAllowed();
  switch (intent) {
    case 'sales_today': return sales('Sales today', 'today');
    case 'sales_yesterday': return sales('Sales yesterday', 'yesterday');
    case 'sales_week': return sales('Last 7 days', 'week');
    case 'low_stock': {
      const p = await listStock({ search: '', filter: 'low', page: 1, withUnstocked: false });
      return stockListAnswer({ kind: 'low', lines: p.rows.slice(0, 8).map(toLine), total: p.rows.length });
    }
    case 'out_of_stock': {
      const p = await listStock({ search: '', filter: 'out', page: 1, withUnstocked: false });
      return stockListAnswer({ kind: 'out', lines: p.rows.slice(0, 8).map(toLine), total: p.rows.length });
    }
    case 'top_products': return topAnswer((await bestSellers(range('week'))).map((r) => ({ name: itemName(r.product_name, r.variant_name), sold: r.quantity_sold, revenue: r.revenue })));
    case 'bills_today': {
      const p = await listSales({ search: '', range: 'today', page: 1 });
      return billsAnswer(p.rows.slice(0, 8).map((s) => ({ invoice: s.invoice_number, time: clock(s.sale_date), total: s.grand_total, due: s.due_amount })));
    }
    case 'due_amount': return duesAnswer({ title: 'Customers owe you', rows: (await customerDue()).slice(0, 8).map((r) => ({ name: r.customer_name, owed: r.outstanding })), route: '/customers', action: 'View customers' });
    case 'supplier_due': return duesAnswer({ title: 'You owe suppliers', rows: (await supplierDue()).slice(0, 8).map((r) => ({ name: r.supplier_name, owed: r.outstanding })), route: '/suppliers', action: 'View suppliers' });
    case 'profit_today': {
      const s = await salesSummary(range('today'));
      return s.gross_profit === undefined ? notAllowed() : profitAnswer({ profit: s.gross_profit, revenue: s.revenue });
    }
    case 'payments_today': return paymentsAnswer((await howPaid(range('today'))).map((r) => ({ label: r.label, amount: r.amount })));
    case 'product_price': {
      const items = (await searchCatalog({ q: product ?? '', page: 1, wholesale: false })).items.slice(0, 5);
      return priceAnswer(product ?? '', items.map((i) => ({ name: i.name, price: i.price, unit: i.unitShort })));
    }
    case 'product_stock': {
      const p = await listStock({ search: product ?? '', filter: 'all', page: 1 });
      return stockOfAnswer(product ?? '', p.rows.slice(0, 5).map((r) => ({ name: itemName(r.product_name, r.variant_name), stock: r.available, unit: r.unit_short_name, reorder: r.reorder_level })));
    }
    case 'start_selling': return startSellingAnswer();
  }
}

/** What to show for a typed question; "unsure" and "unsupported" have no data to fetch, the screen offers the nearest questions. */
export async function answerFor(m: Match, perms: readonly string[] | undefined): Promise<Answer | null> {
  if (m.kind === 'intent') return answerIntent(m.intent, m.product, perms);
  if (m.kind === 'unsupported') return notUnderstood();
  return null;
}
