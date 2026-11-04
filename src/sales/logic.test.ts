import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isWalkIn, rangeDates, saleState } from './logic.ts';

const now = new Date(2026, 10, 4, 22, 30); // 4 Nov 2026, evening

test('today is one day, the week is seven counting today, all is no limit', () => {
  assert.deepEqual(rangeDates('today', now), { date_from: '2026-11-04', date_to: '2026-11-04' });
  assert.deepEqual(rangeDates('week', now), { date_from: '2026-10-29', date_to: '2026-11-04' });
  assert.deepEqual(rangeDates('all', now), {});
});

test('the week reaches back across a month end', () => {
  assert.equal(rangeDates('week', new Date(2026, 10, 3)).date_from, '2026-10-28');
});

test('a cancelled sale is cancelled however it was paid', () => {
  assert.equal(saleState({ status: 'CANCELLED', due_amount: '50.0000', refund_state: 'NONE' }), 'cancelled');
});

test('money still owed outranks a return', () => {
  assert.equal(saleState({ status: 'COMPLETED', due_amount: '12.5000', refund_state: 'PARTIAL' }), 'due');
});

test('a fully paid sale with goods sent back reads as returned, else paid', () => {
  assert.equal(saleState({ status: 'COMPLETED', due_amount: '0.0000', refund_state: 'FULL' }), 'returned');
  assert.equal(saleState({ status: 'COMPLETED', due_amount: '0.0000', refund_state: 'NONE' }), 'paid');
});

test('the server walk-in name is recognised', () => {
  assert.equal(isWalkIn('Walk-in Customer'), true);
  assert.equal(isWalkIn('Arif Hossain'), false);
});
