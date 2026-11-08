import { addMoney, compareMoney, formatBDT, subMoney } from '../lib/money.ts';
import type { IntentId } from './intents.ts';

export type Tone = 'good' | 'warn' | 'bad';
export type Stat = { label: string; value: string; tone?: Tone; note?: string };
export type AskRow = { primary: string; secondary?: string; value?: string; tone?: Tone };
export type Bar = { date: string; revenue: string };
/** Where the one button goes: a screen, or another question to ask. */
export type AskAction = { label: string; route: string | null; ask?: IntentId };
/** What an answer says in words, as a key the app translates plus its blanks. */
export type Say = { text: string; params?: Record<string, string | number> };

/** Everything an answer card can show. Every number comes from the shop's data; nothing here is written by a model. */
export type Answer = { title: string; when?: string; lead: Say; stats?: Stat[]; bars?: Bar[]; rows?: AskRow[]; alert?: { tone: 'warn' | 'bad'; text: Say }; action: AskAction };

const money = (v: string) => formatBDT(v, { dp: 0 });

/** How much more or less than before, in whole percent; null when there is nothing to compare with. */
export function pctChange(now: string, before: string): number | null {
  if (compareMoney(before, '0') <= 0) return null;
  return Math.round((Number(subMoney(now, before)) / Number(before)) * 100);
}

export function salesAnswer(o: { title: string; count: number; total: string; before?: string; bars?: Bar[] }): Answer {
  const pct = o.before !== undefined ? pctChange(o.total, o.before) : null;
  return {
    title: o.title,
    lead: o.count === 0 ? { text: 'Nothing has been sold in this time.' } : { text: '{amount} sold in {n} sales.', params: { amount: money(o.total), n: o.count } },
    stats: [
      { label: 'Sold', value: money(o.total), tone: o.count > 0 ? 'good' : undefined, note: pct === null ? undefined : pct >= 0 ? `+${pct}%` : `${pct}%` },
      { label: 'Sales', value: String(o.count) },
    ],
    bars: o.bars,
    action: { label: 'View all bills', route: '/sales' },
  };
}

export type StockLine = { name: string; available: string; reorder: string; unit: string | null };
const qty = (v: string) => String(Number(v));
export function stockListAnswer(o: { kind: 'low' | 'out'; lines: StockLine[]; total?: number }): Answer {
  const low = o.kind === 'low';
  return {
    title: low ? 'Running low' : 'Finished',
    lead: o.lines.length === 0 ? { text: low ? 'Nothing is running low.' : 'Nothing is finished.' } : { text: low ? '{n} items are running low.' : '{n} items are finished.', params: { n: o.total ?? o.lines.length } },
    rows: o.lines.map((l) => ({ primary: l.name, value: low ? `${qty(l.available)}${l.unit ? ` ${l.unit}` : ''}` : '0', tone: low ? 'warn' : 'bad' })),
    alert: o.lines.length ? { tone: low ? 'warn' : 'bad', text: low ? { text: 'Buy these soon so you do not run out.' } : { text: 'You cannot sell these until they are back.' } } : undefined,
    action: { label: 'Reorder', route: '/new-purchase' },
  };
}

export function topAnswer(rows: { name: string; sold: string; revenue: string }[]): Answer {
  return {
    title: 'Best sellers',
    lead: rows.length ? { text: '{name} sells the most.', params: { name: rows[0].name } } : { text: 'Nothing was sold in this time.' },
    rows: rows.map((r, i) => ({ primary: `${i + 1}. ${r.name}`, secondary: `× ${qty(r.sold)}`, value: money(r.revenue), tone: i === 0 ? 'good' : undefined })),
    action: { label: 'View reports', route: '/reports' },
  };
}

export function billsAnswer(rows: { invoice: string; time: string; total: string; due: string }[], title = 'Bills today'): Answer {
  return {
    title,
    lead: rows.length ? { text: '{n} bills.', params: { n: rows.length } } : { text: 'There are no bills.' },
    rows: rows.map((r) => ({ primary: r.invoice, secondary: r.time, value: money(r.total), tone: compareMoney(r.due, '0') > 0 ? 'bad' : undefined })),
    action: { label: 'View all bills', route: '/sales' },
  };
}

export function duesAnswer(o: { title: string; rows: { name: string; owed: string }[]; route: string; action: string }): Answer {
  const total = o.rows.reduce((s, r) => addMoney(s, r.owed), '0');
  return {
    title: o.title,
    lead: o.rows.length ? { text: '{amount} in all.', params: { amount: money(total) } } : { text: 'Nothing is owed.' },
    stats: o.rows.length ? [{ label: 'Total', value: money(total), tone: 'bad' }] : undefined,
    rows: o.rows.map((r) => ({ primary: r.name, value: money(r.owed), tone: 'bad' as const })),
    action: { label: o.action, route: o.route },
  };
}

export function paymentsAnswer(rows: { label: string; amount: string }[]): Answer {
  const total = rows.reduce((s, r) => addMoney(s, r.amount), '0');
  return {
    title: 'How customers paid',
    lead: rows.length ? { text: '{amount} received today.', params: { amount: money(total) } } : { text: 'No money came in today.' },
    rows: rows.map((r) => ({ primary: r.label, value: money(r.amount), tone: 'good' as const })),
    action: { label: 'View reports', route: '/reports' },
  };
}

export function profitAnswer(o: { profit: string; revenue: string; title?: string }): Answer {
  const loss = compareMoney(o.profit, '0') < 0;
  return {
    title: o.title ?? 'Profit today',
    lead: { text: loss ? 'You lost {amount}.' : 'You kept {amount}.', params: { amount: money(o.profit.replace('-', '')) } },
    stats: [{ label: 'Sold', value: money(o.revenue) }, { label: loss ? 'Lost' : 'You keep', value: money(o.profit.replace('-', '')), tone: loss ? 'bad' : 'good' }],
    action: { label: 'View reports', route: '/reports' },
  };
}

export function priceAnswer(name: string, items: { name: string; price: string; unit: string | null }[]): Answer {
  return {
    title: name,
    lead: items.length ? { text: '{name} costs {amount}.', params: { name: items[0].name, amount: money(items[0].price) } } : { text: 'No item matches "{name}".', params: { name } },
    rows: items.map((i) => ({ primary: i.name, value: money(i.price), secondary: i.unit ?? undefined })),
    action: { label: 'Check a price', route: '/price-check' },
  };
}

export function stockOfAnswer(name: string, items: { name: string; stock: string; unit: string | null; reorder: string }[]): Answer {
  const first = items[0];
  const none = first && Number(first.stock) <= 0;
  return {
    title: name,
    lead: first ? (none ? { text: '{name} is finished.', params: { name: first.name } } : { text: '{name}: {n} in stock.', params: { name: first.name, n: qty(first.stock) } }) : { text: 'No item matches "{name}".', params: { name } },
    rows: items.map((i) => ({ primary: i.name, value: `${qty(i.stock)}${i.unit ? ` ${i.unit}` : ''}`, tone: Number(i.stock) <= 0 ? ('bad' as const) : Number(i.reorder) > 0 && Number(i.stock) <= Number(i.reorder) ? ('warn' as const) : undefined })),
    alert: none ? { tone: 'bad', text: { text: 'You cannot sell this until it is back.' } } : undefined,
    action: { label: none ? 'Reorder' : 'View stock', route: none ? '/new-purchase' : '/stock' },
  };
}

export const startSellingAnswer = (): Answer => ({ title: 'Start selling', lead: { text: 'Open the till and scan or search the first item.' }, action: { label: 'Start selling', route: '/sell' } });

/** For a question that was not understood: the nearest questions to tap, never a guess. */
export const SUGGESTION_WORDS: Record<IntentId, string> = {
  sales_today: 'Ajker bill koto?', sales_yesterday: 'Gotokal koto bikri?', sales_week: 'Ei soptaher bikri koto?', stock_summary: 'Stock dekhao', low_stock: 'Stock kom ki ase?', out_of_stock: 'Kon mal sesh?', top_products: 'Kon mal beshi bikri?',
  bills_today: 'Ajker bill gulo dekhao', due_amount: 'Customer der baki koto?', supplier_due: 'Supplier ke koto dite hobe?', profit_today: 'Ajker labh koto?', payments_today: 'Ajker cash koto?', product_price: 'Coca cola dam koto?', product_stock: 'Coca cola ase ki?', start_selling: 'Bikri korbo',
};

export const notUnderstood = (): Answer => ({ title: 'I can only answer about your shop', lead: { text: 'Ask about sales, bills, stock, prices or who owes you.' }, action: { label: 'Ajker bill koto?', route: null, ask: 'sales_today' } });
export const notAllowed = (): Answer => ({ title: 'Not allowed', lead: { text: 'You may not see that. Ask the owner.' }, action: { label: 'Ajker bill koto?', route: null, ask: 'sales_today' } });

/** A short ranked list with a sentence on top: sales per category, per cashier, per branch, or one customer's balance. */
export function rankedAnswer(o: { title: string; lead: Say; rows: AskRow[]; stats?: Stat[]; route: string; action: string }): Answer {
  return { title: o.title, lead: o.lead, stats: o.stats, rows: o.rows, action: { label: o.action, route: o.route } };
}

/** What one item sold: the total first, then the lines that matched the name. */
export function itemSalesAnswer(o: { name: string; matches: { name: string; sold: string; revenue: string }[] }): Answer {
  const sold = o.matches.reduce((n, m) => addMoney(n, m.sold), '0');
  const revenue = o.matches.reduce((n, m) => addMoney(n, m.revenue), '0');
  return {
    title: 'Sales of one item',
    lead: o.matches.length ? { text: '{n} sold for {amount}.', params: { n: qty(sold), amount: money(revenue) } } : { text: 'No sales of "{name}" in this time.', params: { name: o.name } },
    stats: o.matches.length ? [{ label: 'Sold', value: qty(sold) }, { label: 'Total', value: money(revenue), tone: 'good' }] : undefined,
    rows: o.matches.slice(0, 5).map((m) => ({ primary: m.name, secondary: `× ${qty(m.sold)}`, value: money(m.revenue) })),
    action: { label: 'View reports', route: '/reports' },
  };
}

export const askWhich = (what: 'item' | 'name'): Answer => ({
  title: what === 'item' ? 'Which item?' : 'Which customer?',
  lead: { text: what === 'item' ? 'Tell me the item name, for example: Coca cola dam koto?' : 'Tell me the customer name, for example: Karim er baki koto?' },
  action: { label: 'Ajker bill koto?', route: null, ask: 'sales_today' },
});

/** Batches that expire soon or already have, soonest first; the days left decide the colour. */
export function expiryAnswer(o: { kind: 'soon' | 'expired'; rows: { name: string; batch: string; date: string | null; days: number | null; qty: string }[]; total: number }): Answer {
  const soon = o.kind === 'soon';
  return {
    title: soon ? 'Expiring soon' : 'Expired stock',
    lead: o.total === 0 ? { text: soon ? 'Nothing expires in the next 30 days.' : 'Nothing has expired.' } : { text: soon ? '{n} batches expire within 30 days.' : '{n} batches have expired.', params: { n: o.total } },
    rows: o.rows.map((r) => ({ primary: r.name, secondary: [r.batch, r.date].filter(Boolean).join(' · '), value: `${qty(r.qty)}`, tone: soon && (r.days ?? 99) > 14 ? ('warn' as const) : ('bad' as const) })),
    alert: o.total ? { tone: soon ? 'warn' : 'bad', text: { text: soon ? 'Sell or return these first.' : 'Take these off the shelf.' } } : undefined,
    action: { label: 'View expiry', route: '/expiry' },
  };
}

export function metalRatesAnswer(rows: { metal: string; purity: string; rate: string }[]): Answer {
  return {
    title: 'Metal rates',
    lead: rows.length ? { text: '{name}: {amount} per gram.', params: { name: `${rows[0].metal} ${rows[0].purity}`, amount: money(rows[0].rate) } } : { text: 'No rates are set.' },
    rows: rows.map((r) => ({ primary: `${r.metal} ${r.purity}`, value: money(r.rate) })),
    action: { label: 'Open metal rates', route: '/metal-rates' },
  };
}

export function ordersDueAnswer(rows: { who: string; ref: string; due: string; balance: string }[], total: number): Answer {
  return {
    title: 'Orders due',
    lead: total === 0 ? { text: 'No orders are due.' } : { text: '{n} orders are due or overdue.', params: { n: total } },
    rows: rows.map((r) => ({ primary: r.who, secondary: `${r.ref} · ${r.due}`, value: money(r.balance), tone: Number(r.balance) > 0 ? ('warn' as const) : undefined })),
    action: { label: 'View orders', route: '/orders' },
  };
}

/** The whole stock at a glance: how many items, how many units, what it is worth (only for people who may see cost), and what needs attention. */
export function stockSummaryAnswer(o: { lines: number; units: string; value?: string; low: number; out: number }): Answer {
  return {
    title: 'Stock',
    lead: o.lines === 0 ? { text: 'There is no stock yet.' } : { text: '{n} items, {units} units in stock.', params: { n: o.lines, units: qty(o.units) } },
    stats: [
      { label: 'Items', value: String(o.lines) },
      { label: 'Units', value: qty(o.units) },
      ...(o.value !== undefined ? [{ label: 'Stock value', value: money(o.value), tone: 'good' as const }] : []),
      { label: 'Running low', value: String(o.low), tone: o.low > 0 ? ('warn' as const) : ('good' as const) },
      { label: 'Finished', value: String(o.out), tone: o.out > 0 ? ('bad' as const) : ('good' as const) },
    ],
    alert: o.out > 0 ? { tone: 'bad', text: { text: '{n} items are finished.', params: { n: o.out } } } : o.low > 0 ? { tone: 'warn', text: { text: '{n} items are running low.', params: { n: o.low } } } : undefined,
    action: { label: 'View stock', route: '/stock' },
  };
}
