import assert from 'node:assert/strict';
import { test } from 'node:test';

import { barFractions, lastSevenDays } from './week.ts';

test('seven days end today and cross month and year ends', () => {
  const days = lastSevenDays(new Date(2026, 0, 3)); // 3 Jan 2026 is a Saturday
  assert.deepEqual(days.map((d) => d.date), ['2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03']);
  assert.equal(days[6]!.weekday, 6);
  assert.equal(days[0]!.weekday, 0);
});

test('bars are a share of the best day, flat when nothing sold', () => {
  assert.deepEqual(barFractions([0, 50, 100]), [0, 0.5, 1]);
  assert.deepEqual(barFractions([0, 0, 0]), [0, 0, 0]);
});

import { saleWhen } from './week.ts';

test('a sale is today, yesterday or a date, with a 12-hour clock', () => {
  const now = new Date(2026, 10, 4, 12, 0);
  assert.deepEqual(saleWhen(new Date(2026, 10, 4, 9, 5).toISOString(), now), { day: 'today', time: '9:05 am' });
  assert.deepEqual(saleWhen(new Date(2026, 10, 3, 23, 40).toISOString(), now), { day: 'yesterday', time: '11:40 pm' });
  assert.deepEqual(saleWhen(new Date(2026, 9, 28, 0, 15).toISOString(), now), { day: { date: 28, month: 9 }, time: '12:15 am' });
});
