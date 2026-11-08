import { addMoney } from '../lib/money.ts';
import type { PayrollRun, Payslip } from './api.ts';

/** The last `n` months ending with the month of `now`, newest first, as "YYYY-MM", joined with the months that already have a run. */
export function monthChoices(now: Date, withRuns: string[], n = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...new Set([...out, ...withRuns])].sort().reverse();
}

/** First and last day of a "YYYY-MM" month, as the server wants them. */
export function monthBounds(month: string): { period_start: string; period_end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { period_start: `${month}-01`, period_end: `${month}-${String(last).padStart(2, '0')}` };
}

/** Every payslip of the runs, plus how many are still owed and how much (null when the person may not see salaries). */
export function payslipsOf(runs: PayrollRun[]): { rows: Payslip[]; owedCount: number; owedTotal: string | null } {
  const rows = runs.flatMap((r) => r.payslips);
  const owed = rows.filter((p) => !p.is_paid);
  const known = owed.every((p) => p.net_pay !== undefined);
  return { rows, owedCount: owed.length, owedTotal: known ? owed.reduce((sum, p) => addMoney(sum, p.net_pay as string), '0') : null };
}
