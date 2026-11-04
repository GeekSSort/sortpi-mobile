import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { canSeeMoney, dayChoice, dayWord, describeMoneyError, isAmount, permissionFor, rangeDates, voucherBody } from './logic.ts';

const now = new Date(2026, 10, 4, 23, 30); // 4 Nov 2026, late evening

test('today is one day, the month starts on the 1st, all is no limit', () => {
  assert.deepEqual(rangeDates('today', now), { date_from: '2026-11-04', date_to: '2026-11-04' });
  assert.deepEqual(rangeDates('month', now), { date_from: '2026-11-01', date_to: '2026-11-04' });
  assert.deepEqual(rangeDates('all', now), {});
});

test('an amount is digits with at most two decimals and more than nothing', () => {
  for (const ok of ['5', '120', '99.5', '0.50', ' 40 ']) assert.equal(isAmount(ok), true, ok);
  for (const bad of ['', '0', '0.00', '-5', '1,000', '৳5', '1.234', '5.', 'abc']) assert.equal(isAmount(bad), false, bad);
});

test('today and yesterday are local dates, also across a month start', () => {
  assert.equal(dayChoice('today', now), '2026-11-04');
  assert.equal(dayChoice('yesterday', now), '2026-11-03');
  assert.equal(dayChoice('yesterday', new Date(2026, 10, 1, 9)), '2026-10-31');
});

test('the body keeps the amount as text and leaves out an empty note and branch', () => {
  assert.deepEqual(voucherBody({ type: 'EXPENSE', categoryId: 'c1', amount: ' 250.50 ', date: '2026-11-04', note: '  ', branchId: null }), { type: 'EXPENSE', category: 'c1', amount: '250.50', date: '2026-11-04' });
  assert.deepEqual(voucherBody({ type: 'INCOME', categoryId: 'c2', amount: '10', date: '2026-11-04', note: ' tea ', branchId: 'b1' }), { type: 'INCOME', category: 'c2', amount: '10', date: '2026-11-04', description: 'tea', branch: 'b1' });
});

test('a voucher date reads as today, yesterday or day and month', () => {
  assert.equal(dayWord('2026-11-04', now), 'today');
  assert.equal(dayWord('2026-11-03', now), 'yesterday');
  assert.deepEqual(dayWord('2026-10-12', now), { date: 12, month: 9 });
});

test('each side has its own permission, and seeing needs both', () => {
  assert.equal(permissionFor('INCOME', 'create'), 'income.create');
  assert.equal(permissionFor('EXPENSE', 'delete'), 'expense.delete');
  assert.equal(canSeeMoney(['income.view']), false);
  assert.equal(canSeeMoney(['income.view', 'expense.view']), true);
  assert.equal(canSeeMoney(undefined), false);
});

test('server codes become plain words', () => {
  assert.match(describeMoneyError(new ApiError(400, 'INVALID_VOUCHER_AMOUNT', 'x')), /more than zero/);
  assert.equal(describeMoneyError(new Error('x')), 'Something went wrong. Try again.');
});
