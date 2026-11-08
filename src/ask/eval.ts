import { itemSearchTerms } from './banglish.ts';
import { matchIntent, type IntentId } from './intents.ts';
import type { Period, ToolId } from './plan.ts';
import type { Case, Layer } from './testset.ts';
import { fold } from './text.ts';

/** What an assistant answered for one question: a lookup, or nothing. */
export type Got = { tool: ToolId | 'none'; period?: Period; item?: string; name?: string };

const INTENT_TOOL: Record<IntentId, { tool: ToolId; period?: Period }> = {
  sales_today: { tool: 'sales_total', period: 'today' }, sales_yesterday: { tool: 'sales_total', period: 'yesterday' }, sales_week: { tool: 'sales_total', period: 'week' },
  low_stock: { tool: 'stock_low' }, out_of_stock: { tool: 'stock_out' }, top_products: { tool: 'top_products' }, bills_today: { tool: 'bills', period: 'today' },
  due_amount: { tool: 'customer_dues' }, supplier_due: { tool: 'supplier_dues' }, profit_today: { tool: 'profit', period: 'today' }, payments_today: { tool: 'sales_by_payment', period: 'today' },
  product_price: { tool: 'price_of' }, product_stock: { tool: 'stock_of' }, start_selling: { tool: 'start_selling' }, stock_summary: { tool: 'stock_summary' }, customer_balance: { tool: 'customer_balance' }, metal_rates: { tool: 'metal_rates' },
  expiring_soon: { tool: 'expiring_soon' }, expired_stock: { tool: 'expired_stock' }, orders_due: { tool: 'orders_due' },
};

/** The word matcher on its own (no model): what it answers, or 'none' when it is unsure or does not understand. */
export function matcherAnswer(q: string): Got {
  const m = matchIntent(q);
  if (m.kind === 'plan') return { tool: m.plan.tool, period: m.plan.period, item: m.plan.item, name: m.plan.name };
  if (m.kind !== 'intent') return { tool: 'none' };
  const t = INTENT_TOOL[m.intent];
  return m.intent === 'customer_balance' ? { tool: t.tool, name: m.product } : { tool: t.tool, period: t.period, item: m.product };
}

const sameItem = (got: string | undefined, want: string): boolean => !!got && (itemSearchTerms(got).some((t) => t.toLowerCase() === want.toLowerCase()) || fold(got) === fold(want));
const sameName = (got: string | undefined, want: string): boolean => !!got && (fold(got) === fold(want) || fold(got).startsWith(fold(want)) || fold(want).startsWith(fold(got)));

export type Verdict = 'correct' | 'wrong' | 'missed';

/**
 * Right means the right lookup (and the right period, item or name when the case states one). Answering a question that should get no lookup
 * is "wrong"; staying silent when a lookup was expected is "missed" (the model, or a nearest-questions list, may still catch it).
 */
export function judge(got: Got, want: Case): Verdict {
  if (want.tool === 'none') return got.tool === 'none' ? 'correct' : 'wrong';
  if (got.tool === 'none') return 'missed';
  if (got.tool !== want.tool) return 'wrong';
  if (want.period && got.period && got.period !== want.period) return 'wrong';
  if (want.item && !sameItem(got.item, want.item)) return 'wrong';
  if (want.name && !sameName(got.name, want.name)) return 'wrong';
  return 'correct';
}

export type Tally = { total: number; correct: number; wrong: number; missed: number };
export type Report = { overall: Tally; byLayer: Partial<Record<Layer, Tally>>; failures: { case: Case; got: Got; verdict: Verdict }[] };

export function evaluate(cases: Case[], answer: (q: string) => Got): Report {
  const empty = (): Tally => ({ total: 0, correct: 0, wrong: 0, missed: 0 });
  const report: Report = { overall: empty(), byLayer: {}, failures: [] };
  for (const w of cases) {
    const got = answer(w.q);
    const v = judge(got, w);
    for (const t of [report.overall, (report.byLayer[w.layer] ??= empty())]) {
      t.total += 1;
      t[v] += 1;
    }
    if (v !== 'correct') report.failures.push({ case: w, got, verdict: v });
  }
  return report;
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');
/** Accuracy over everything; precision = right when it answered a lookup at all (so silence is not counted against it). */
export const accuracy = (t: Tally): number => (t.total ? t.correct / t.total : 0);
export const precision = (t: Tally): number => (t.correct + t.wrong ? t.correct / (t.correct + t.wrong) : 1);

export function formatReport(r: Report, title: string): string {
  const rows = [['all', r.overall] as const, ...Object.entries(r.byLayer).map(([l, t]) => [l, t!] as const)];
  const lines = [`${title}`, 'layer      n   right  wrong  missed  accuracy  precision'];
  for (const [name, t] of rows) lines.push(`${name.padEnd(9)} ${String(t.total).padStart(3)}  ${String(t.correct).padStart(5)}  ${String(t.wrong).padStart(5)}  ${String(t.missed).padStart(6)}  ${pct(t.correct, t.total).padStart(8)}  ${pct(t.correct, t.correct + t.wrong).padStart(9)}`);
  return lines.join('\n');
}
