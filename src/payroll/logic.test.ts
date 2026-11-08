import assert from 'node:assert/strict';
import { test } from 'node:test';

import { monthBounds, monthChoices, payslipsOf } from './logic.ts';

test('month choices are this month and the two before, plus months with a run, newest first', () => {
  assert.deepEqual(monthChoices(new Date(2026, 0, 15), ['2025-06']), ['2026-01', '2025-12', '2025-11', '2025-06']);
  assert.deepEqual(monthChoices(new Date(2026, 10, 8), ['2026-11']), ['2026-11', '2026-10', '2026-09']);
});

test('month bounds follow the calendar', () => {
  assert.deepEqual(monthBounds('2026-02'), { period_start: '2026-02-01', period_end: '2026-02-28' });
  assert.deepEqual(monthBounds('2028-02').period_end, '2028-02-29');
  assert.deepEqual(monthBounds('2026-11').period_end, '2026-11-30');
});

test('what is still owed is counted and summed, or unknown without salary rights', () => {
  const p = (net: string | undefined, paid: boolean) => ({ id: net ?? 'x', employee_name: 'A', period_start: '', period_end: '', net_pay: net, is_paid: paid, paid_at: null });
  const run = (slips: ReturnType<typeof p>[]) => ({ id: 'r', period_start: '', period_end: '', status: 'DRAFT', posted_to_finance: false, payslips: slips });
  const a = payslipsOf([run([p('100.00', false), p('50.50', false), p('70.00', true)])]);
  assert.equal(a.owedCount, 2);
  assert.equal(Number(a.owedTotal), 150.5);
  assert.equal(payslipsOf([run([p(undefined, false)])]).owedTotal, null);
  assert.equal(payslipsOf([]).owedCount, 0);
});
