import { ApiError } from '../api/client.ts';
import { localDateISO } from '../lib/dates.ts';
import { compareMoney, parseMoney, subMoney } from '../lib/money.ts';

export type PeriodId = 'today' | 'yesterday' | 'week' | 'month';
export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
];

const day = (now: Date, back: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);

/** The server's window for a period, in the phone's own time zone. The week is the last seven days ending today; the month runs from the 1st to today. */
export function periodDates(id: PeriodId, now: Date = new Date()): { from_date: string; to_date: string } {
  if (id === 'today') return { from_date: localDateISO(now), to_date: localDateISO(now) };
  if (id === 'yesterday') return { from_date: localDateISO(day(now, 1)), to_date: localDateISO(day(now, 1)) };
  if (id === 'week') return { from_date: localDateISO(day(now, 6)), to_date: localDateISO(now) };
  return { from_date: localDateISO(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: localDateISO(now) };
}
export const isOneDay = (id: PeriodId): boolean => id === 'today' || id === 'yesterday';

/** A day-by-day list that has every day of the window, with 0 for days the server left out, and heights as 0..1 of the best day. */
export function dailyBars(rows: { date: string; revenue: string }[], from: string, to: string): { date: string; revenue: string; fraction: number; best: boolean }[] {
  const byDate = new Map(rows.map((r) => [r.date, r.revenue]));
  const out: { date: string; revenue: string }[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  for (let i = 0; i < 366; i += 1) {
    const iso = localDateISO(new Date(fy, fm - 1, fd + i));
    out.push({ date: iso, revenue: byDate.get(iso) ?? '0' });
    if (iso >= to) break;
  }
  const max = out.reduce((m, r) => (compareMoney(r.revenue, m) > 0 ? r.revenue : m), '0');
  return out.map((r) => ({ ...r, fraction: compareMoney(max, '0') > 0 ? parseMoney(r.revenue).div(parseMoney(max)).toNumber() : 0, best: compareMoney(max, '0') > 0 && compareMoney(r.revenue, max) === 0 }));
}

/** What share of the takings a part is, one decimal ("25.9"). Zero total gives "0.0". */
export const percentOf = (part: string, total: string): string => (compareMoney(total, '0') > 0 ? parseMoney(part).div(parseMoney(total)).times(100).round(1).toFixed(1) : '0.0');

/** Profit as a share of sales. Null when nothing was sold. */
export const margin = (profit: string, revenue: string): string | null => (compareMoney(revenue, '0') > 0 ? percentOf(profit, revenue) : null);

export type Tone = 'good' | 'bad';
export const profitTone = (value: string): Tone => (compareMoney(value, '0') < 0 ? 'bad' : 'good');

/** The first n rows of a list the server already ordered by money. */
export const topN = <T>(rows: T[], n: number): T[] => rows.slice(0, n);

export type PnL = { revenue: string; cost_of_goods: string; gross_profit: string; operating_expenses: string; stock_written_off: string; net_profit: string };
export type PnLLine = { key: string; label: string; value: string; kind: 'plain' | 'cost' | 'subtotal' | 'gain' | 'loss' | 'total' };
/**
 * The profit statement in the order a shopkeeper reads it. The server counts a stock write-off as a cost, so a NEGATIVE one means stock was
 * found (a count that added stock): that is shown as a gain, in words, not as a confusing minus. The net figure is always the server's.
 */
export function pnlLines(p: PnL): PnLLine[] {
  const found = compareMoney(p.stock_written_off, '0') < 0;
  return [
    { key: 'revenue', label: 'Sales', value: p.revenue, kind: 'plain' },
    { key: 'cost', label: 'What the goods cost you', value: p.cost_of_goods, kind: 'cost' },
    { key: 'gross', label: 'Profit on goods', value: p.gross_profit, kind: 'subtotal' },
    { key: 'expenses', label: 'Shop expenses', value: p.operating_expenses, kind: 'cost' },
    ...(compareMoney(p.stock_written_off, '0') === 0 ? [] : [found ? { key: 'wo', label: 'Stock found when counting', value: subMoney('0', p.stock_written_off), kind: 'gain' as const } : { key: 'wo', label: 'Stock lost or thrown away', value: p.stock_written_off, kind: 'loss' as const }]),
    { key: 'net', label: 'Profit after everything', value: p.net_profit, kind: 'total' },
  ];
}

export type DayClose = {
  date: string;
  summary: { sale_count: number; gross_revenue: string; return_count: number; returns_total: string; revenue: string; total_paid: string; total_due: string };
  tenders: { method: string; amount: string; payment_count: number }[];
  cashiers: { cashier_name: string; sale_count: number; revenue: string }[];
  shifts: { cashier_name: string; status: string; opening_cash: string; expected_cash: string | null; counted_cash: string | null; variance: string | null }[];
  open_shifts: number;
  cash_expected: string | null;
  cash_counted: string | null;
  cash_variance: string | null;
};

/** The day report as plain text for WhatsApp or SMS. Money comes pre-formatted so this stays free of display code. */
export function dayReportText(o: { shop: string; dateLabel: string; d: DayClose; money: (v: string) => string; methodLabel: (m: string) => string; words: { sold: string; sales: string; returns: string; received: string; owed: string; cash: string; expected: string; counted: string; difference: string; open: string } }): string {
  const { d, money, words } = o;
  const lines = [`${o.shop} · ${o.dateLabel}`, '', `${words.sold}: ${money(d.summary.revenue)} (${d.summary.sale_count} ${words.sales})`];
  if (d.summary.return_count > 0) lines.push(`${words.returns}: ${money(d.summary.returns_total)}`);
  lines.push(`${words.received}: ${money(d.summary.total_paid)}`);
  if (compareMoney(d.summary.total_due, '0') > 0) lines.push(`${words.owed}: ${money(d.summary.total_due)}`);
  if (d.tenders.length) lines.push('', ...d.tenders.map((t) => `${o.methodLabel(t.method)}: ${money(t.amount)}`));
  if (d.cash_expected !== null && d.cash_counted !== null) lines.push('', `${words.cash}: ${words.expected} ${money(d.cash_expected)}, ${words.counted} ${money(d.cash_counted)}${d.cash_variance !== null && compareMoney(d.cash_variance, '0') !== 0 ? `, ${words.difference} ${money(d.cash_variance)}` : ''}`);
  if (d.open_shifts > 0) lines.push('', `${words.open}: ${d.open_shifts}`);
  return lines.join('\n');
}

export function describeReportError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'PERMISSION_DENIED':
      return 'You do not have permission to see this.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Check it and try again.';
    default:
      return e.message || 'Could not load this report.';
  }
}
