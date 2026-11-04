import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { dailyBars, dayReportText, describeReportError, isOneDay, margin, percentOf, periodDates, pnlLines, profitTone, topN, type DayClose } from './logic.ts';

const now = new Date(2026, 10, 4, 14, 0); // 4 Nov 2026

test('each period is a window in local dates', () => {
  assert.deepEqual(periodDates('today', now), { from_date: '2026-11-04', to_date: '2026-11-04' });
  assert.deepEqual(periodDates('yesterday', now), { from_date: '2026-11-03', to_date: '2026-11-03' });
  assert.deepEqual(periodDates('week', now), { from_date: '2026-10-29', to_date: '2026-11-04' });
  assert.deepEqual(periodDates('month', now), { from_date: '2026-11-01', to_date: '2026-11-04' });
  assert.deepEqual(periodDates('week', new Date(2027, 0, 3)), { from_date: '2026-12-28', to_date: '2027-01-03' });
  assert.equal(isOneDay('today'), true);
  assert.equal(isOneDay('week'), false);
});

test('the daily bars have every day, zero for missing ones, and mark the best', () => {
  const bars = dailyBars([{ date: '2026-10-30', revenue: '25000' }, { date: '2026-11-01', revenue: '50000' }], '2026-10-29', '2026-11-02');
  assert.deepEqual(bars.map((b) => b.date), ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(bars.map((b) => b.fraction), [0, 0.5, 0, 1, 0]);
  assert.deepEqual(bars.map((b) => b.best), [false, false, false, true, false]);
  assert.deepEqual(dailyBars([], '2026-11-01', '2026-11-02').map((b) => [b.fraction, b.best]), [[0, false], [0, false]]);
});

test('shares, margin and tone', () => {
  assert.equal(percentOf('25.9', '100'), '25.9');
  assert.equal(percentOf('1', '0'), '0.0');
  assert.equal(margin('51261.18', '197212.68'), '26.0');
  assert.equal(margin('5', '0'), null);
  assert.equal(profitTone('-1'), 'bad');
  assert.equal(profitTone('0'), 'good');
  assert.deepEqual(topN([1, 2, 3], 2), [1, 2]);
});

test('the profit statement shows stock found as a gain and lost as a loss, with the server net', () => {
  const base = { revenue: '197212.68', cost_of_goods: '145951.50', gross_profit: '51261.18', operating_expenses: '0.0000', net_profit: '53721.96' };
  const found = pnlLines({ ...base, stock_written_off: '-2460.78' });
  assert.deepEqual(found.map((l) => l.key), ['revenue', 'cost', 'gross', 'expenses', 'wo', 'net']);
  assert.deepEqual(found.find((l) => l.key === 'wo'), { key: 'wo', label: 'Stock found when counting', value: '2460.78', kind: 'gain' });
  const lost = pnlLines({ ...base, stock_written_off: '100', net_profit: '51161.18' });
  assert.equal(lost.find((l) => l.key === 'wo')?.kind, 'loss');
  assert.equal(lost.find((l) => l.key === 'net')?.value, '51161.18');
  assert.equal(pnlLines({ ...base, stock_written_off: '0.0000' }).some((l) => l.key === 'wo'), false);
});

test('the day report as plain text', () => {
  const d: DayClose = { date: '2026-11-04', summary: { sale_count: 3, gross_revenue: '1500', return_count: 1, returns_total: '100', revenue: '1400', total_paid: '1300', total_due: '100' }, tenders: [{ method: 'CASH', amount: '1000', payment_count: 2 }], cashiers: [], shifts: [], open_shifts: 1, cash_expected: '1010', cash_counted: '1000', cash_variance: '-10' };
  const text = dayReportText({ shop: 'Demo', dateLabel: '4 Nov', d, money: (v) => `৳${v}`, methodLabel: (m) => m.toLowerCase(), words: { sold: 'Sold', sales: 'sales', returns: 'Returned', received: 'Received', owed: 'Still owed', cash: 'Cash', expected: 'expected', counted: 'counted', difference: 'difference', open: 'Open shifts' } });
  assert.equal(text, 'Demo · 4 Nov\n\nSold: ৳1400 (3 sales)\nReturned: ৳100\nReceived: ৳1300\nStill owed: ৳100\n\ncash: ৳1000\n\nCash: expected ৳1010, counted ৳1000, difference ৳-10\n\nOpen shifts: 1');
});

test('a refusal has a plain sentence', () => {
  assert.match(describeReportError(new ApiError(403, 'PERMISSION_DENIED', 'x')), /permission/);
  assert.match(describeReportError(new ApiError(0, 'NETWORK_ERROR', 'x')), /No connection/);
  assert.equal(describeReportError(new ApiError(500, 'WEIRD', 'raw')), 'raw');
});
