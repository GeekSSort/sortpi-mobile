import { periodDates } from '@/reports/logic';
import { formatBDT } from '@/lib/money';
import { api } from '@/api/session';
import { listCustomers } from '@/customers/api';
import { listBatches } from '@/expiry/api';
import { listMetalRates } from '@/extras/api';
import { listOrders } from '@/orders/api';
import { bestSellers, customerDue, howPaid, salesByBranch, salesByCashier, salesByKind, salesDaily, salesSummary, supplierDue } from '@/reports/api';
import type { Sale } from '@/sales/api';
import { soldInRange } from '@/home/api';
import { listSales } from '@/sales/api';
import { searchCatalog } from '@/sell/catalog';
import { listStock, stockSummary } from '@/stock/api';
import { itemName } from '@/sell/catalog-map';

import { itemSearchTerms } from './banglish';
import { allowed } from './allowed';
import { resolveCustomerNames, resolveItemNames } from './shop-vocab';
import { missingInput, PERIOD_LABEL, toolAllowed, toolOffered, type Plan } from './plan';
import type { IntentId, Match } from './intents';
import { askWhich, billsAnswer, duesAnswer, expiryAnswer, itemSalesAnswer, metalRatesAnswer, ordersDueAnswer, notAllowed, notUnderstood, paymentsAnswer, priceAnswer, profitAnswer, rankedAnswer, salesAnswer, stockSummaryAnswer, startSellingAnswer, stockListAnswer, stockOfAnswer, topAnswer, type Answer } from './model';

const money = (v: string) => formatBDT(v, { dp: 0 });
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
/** The matcher's trade and person questions are the same lookups the model can plan, so they run through the same code (and the same trade check). */
const AS_PLAN: Partial<Record<IntentId, Plan['tool']>> = { customer_balance: 'customer_balance', metal_rates: 'metal_rates', expiring_soon: 'expiring_soon', expired_stock: 'expired_stock', orders_due: 'orders_due' };

export async function answerIntent(intent: IntentId, product: string | undefined, perms: readonly string[] | undefined, features?: readonly string[]): Promise<Answer> {
  if (!allowed(intent, perms)) return notAllowed();
  const tool = AS_PLAN[intent];
  if (tool) return runPlan({ tool, period: 'week', item: '', name: intent === 'customer_balance' ? (product ?? '') : '' }, perms, features);
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
      let items: Awaited<ReturnType<typeof searchCatalog>>['items'] = [];
      for (const q of await searchTerms(product ?? '')) {
        const more = (await searchCatalog({ q, page: 1, wholesale: false })).items;
        items = [...items, ...more.filter((m) => !items.some((i) => i.variantId === m.variantId))];
        if (items.length >= 5) break;
      }
      items = items.slice(0, 5);
      return priceAnswer(product ?? '', items.map((i) => ({ name: i.name, price: i.price, unit: i.unitShort })));
    }
    case 'product_stock': {
      let rows: Awaited<ReturnType<typeof listStock>>['rows'] = [];
      for (const q of await searchTerms(product ?? '')) {
        const more = (await listStock({ search: q, filter: 'all', page: 1 })).rows;
        rows = [...rows, ...more.filter((m) => !rows.some((r) => r.id === m.id))];
        if (rows.length >= 5) break;
      }
      return stockOfAnswer(product ?? '', rows.slice(0, 5).map((r) => ({ name: itemName(r.product_name, r.variant_name), stock: r.available, unit: r.unit_short_name, reorder: r.reorder_level })));
    }
    case 'stock_summary': {
      const k = await stockSummary(false);
      return stockSummaryAnswer({ lines: k.lines, units: k.units, value: k.stock_value, low: k.low_stock, out: k.out_of_stock });
    }
    case 'start_selling': return startSellingAnswer();
    default: return notUnderstood();
  }
}

/** What to show for a typed question; "unsure" and "unsupported" have no data to fetch, the screen offers the nearest questions. */
export async function answerFor(m: Match, perms: readonly string[] | undefined, features?: readonly string[]): Promise<Answer | null> {
  if (m.kind === 'plan') return runPlan(m.plan, perms, features);
  if (m.kind === 'intent') return answerIntent(m.intent, m.product, perms, features);
  if (m.kind === 'unsupported') return notUnderstood();
  return null;
}


/** What to search for, best first: the shop's own names that sound like it, then the English form, then what was typed. */
async function searchTerms(typed: string): Promise<string[]> {
  return [...new Set([...(await resolveItemNames(typed)), ...itemSearchTerms(typed)])];
}

const lower = (x: string) => x.toLowerCase();
const matchesAny = (name: string, terms: string[]) => terms.some((t) => lower(name).includes(lower(t)));

/**
 * Runs a plan the model wrote. Every figure comes from the shop's own reports, the same calls the screens make, and a lookup the person's
 * role may not open is refused here as well as on the server. The model only chose the lookup, the dates and the name.
 */
export async function runPlan(plan: Plan, perms: readonly string[] | undefined, features?: readonly string[]): Promise<Answer> {
  if (!toolAllowed(plan.tool, perms)) return notAllowed();
  if (!toolOffered(plan.tool, features)) return notUnderstood(); // this shop's trade does not have that lookup
  const missing = missingInput(plan);
  if (missing) return askWhich(missing);
  const w = periodDates(plan.period);
  const when = PERIOD_LABEL[plan.period];
  const dates = { date_from: w.from_date, date_to: w.to_date };
  const at = (a: Answer): Answer => ({ ...a, when });
  switch (plan.tool) {
    case 'sales_total': {
      const n = await soldInRange(dates);
      return at(salesAnswer({ title: 'Sales', count: n.count, total: n.total }));
    }
    case 'sales_by_day': {
      const [n, days] = await Promise.all([soldInRange(dates), salesDaily(w)]);
      return at(salesAnswer({ title: 'Sales by day', count: n.count, total: n.total, bars: days.map((d) => ({ date: d.date, revenue: d.revenue })) }));
    }
    case 'top_products': return at(topAnswer((await bestSellers(w)).map((r) => ({ name: itemName(r.product_name, r.variant_name), sold: r.quantity_sold, revenue: r.revenue }))));
    case 'item_sales': {
      const terms = await searchTerms(plan.item);
      const rows = await bestSellers(w, 500);
      const matches = rows.filter((r) => matchesAny(itemName(r.product_name, r.variant_name), terms)).map((r) => ({ name: itemName(r.product_name, r.variant_name), sold: r.quantity_sold, revenue: r.revenue }));
      return at(itemSalesAnswer({ name: plan.item, matches }));
    }
    case 'sales_by_category': {
      const rows = await salesByKind(w);
      return at(rankedAnswer({ title: 'Sales by category', lead: rows.length ? { text: '{name} sold the most.', params: { name: rows[0].category_name } } : { text: 'Nothing was sold in this time.' }, rows: rows.slice(0, 8).map((r, i) => ({ primary: r.category_name, secondary: `× ${Number(r.quantity_sold)}`, value: money(r.revenue), tone: i === 0 ? ('good' as const) : undefined })), route: '/reports', action: 'View reports' }));
    }
    case 'sales_by_payment': return at(paymentsAnswer((await howPaid(w)).map((r) => ({ label: r.label, amount: r.amount }))));
    case 'sales_by_cashier': {
      const rows = await salesByCashier(w);
      return at(rankedAnswer({ title: 'Sales by cashier', lead: rows.length ? { text: '{name} sold the most.', params: { name: rows[0].cashier_name } } : { text: 'Nothing was sold in this time.' }, rows: rows.slice(0, 8).map((r, i) => ({ primary: r.cashier_name, secondary: `× ${r.sale_count}`, value: money(r.revenue), tone: i === 0 ? ('good' as const) : undefined })), route: '/reports', action: 'View reports' }));
    }
    case 'sales_by_branch': {
      const rows = await salesByBranch(w);
      return at(rankedAnswer({ title: 'Sales by branch', lead: rows.length ? { text: '{name} sold the most.', params: { name: rows[0].branch_name } } : { text: 'Nothing was sold in this time.' }, rows: rows.slice(0, 8).map((r, i) => ({ primary: r.branch_name, secondary: `× ${r.sale_count}`, value: money(r.revenue), tone: i === 0 ? ('good' as const) : undefined })), route: '/reports', action: 'View reports' }));
    }
    case 'profit': {
      const s = await salesSummary(w);
      return s.gross_profit === undefined ? notAllowed() : at(profitAnswer({ profit: s.gross_profit, revenue: s.revenue, title: 'Profit' }));
    }
    case 'bills': {
      const env = await api.envelope<Sale[]>('GET', '/sales/', { query: { limit: 8, ...dates, search: plan.name || undefined } });
      return at(billsAnswer((env.data ?? []).map((s) => ({ invoice: s.invoice_number, time: clock(s.sale_date), total: s.grand_total, due: s.due_amount })), plan.name ? 'Bills' : 'Bills'));
    }
    case 'customer_dues': return answerIntent('due_amount', undefined, perms);
    case 'supplier_dues': return answerIntent('supplier_due', undefined, perms);
    case 'customer_balance': {
      let rows: Awaited<ReturnType<typeof listCustomers>>['rows'] = [];
      for (const q of [...(await resolveCustomerNames(plan.name)), plan.name]) {
        rows = (await listCustomers({ search: q, owes: false, page: 1 })).rows.slice(0, 5);
        if (rows.length) break;
      }
      return rankedAnswer({ title: 'One customer', lead: rows.length ? { text: '{name} owes {amount}.', params: { name: rows[0].name, amount: money(rows[0].current_balance) } } : { text: 'No customer matches "{name}".', params: { name: plan.name } }, rows: rows.map((c) => ({ primary: c.name, secondary: c.phone || undefined, value: money(c.current_balance), tone: Number(c.current_balance) > 0 ? ('bad' as const) : ('good' as const) })), route: '/customers', action: 'View customers' });
    }
    case 'stock_summary': return answerIntent('stock_summary', undefined, perms);
    case 'stock_low': return answerIntent('low_stock', undefined, perms);
    case 'stock_out': return answerIntent('out_of_stock', undefined, perms);
    case 'stock_of': return answerIntent('product_stock', plan.item, perms);
    case 'price_of': return answerIntent('product_price', plan.item, perms);
    case 'start_selling': return answerIntent('start_selling', undefined, perms);
    case 'expiring_soon':
    case 'expired_stock': {
      const soon = plan.tool === 'expiring_soon';
      const p = await listBatches({ state: soon ? 'expiring' : 'expired', withinDays: 30, page: 1 });
      return expiryAnswer({ kind: soon ? 'soon' : 'expired', total: p.total, rows: p.rows.slice(0, 8).map((b) => ({ name: itemName(b.product_name, b.variant_name), batch: b.batch_no, date: b.expiry_date, days: b.days_left, qty: b.quantity })) });
    }
    case 'metal_rates': return metalRatesAnswer((await listMetalRates()).map((r) => ({ metal: r.metal, purity: r.purity, rate: r.rate_per_gram })));
    case 'orders_due': {
      const p = await listOrders({ status: 'OPEN', due: 'week', search: '', page: 1 });
      return ordersDueAnswer(p.rows.slice(0, 8).map((o) => ({ who: o.customer_name, ref: o.reference_no, due: o.due_date, balance: o.balance })), p.total);
    }
  }
}
