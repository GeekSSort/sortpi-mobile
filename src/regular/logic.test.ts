import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canSettle, regularBody, regularLook, validateRegular } from './logic.ts';

const r = (state: string, days: number, on = true) => ({ is_active: on, state, days_until_due: days });

test('a schedule is overdue, due, soon, later or off', () => {
  assert.equal(regularLook(r('OVERDUE', -3)), 'overdue');
  assert.equal(regularLook(r('DUE', 0)), 'due');
  assert.equal(regularLook(r('UPCOMING', 5)), 'soon');
  assert.equal(regularLook(r('UPCOMING', 20)), 'later');
  assert.equal(regularLook(r('DUE', 0, false)), 'off');
});

test('only a due or overdue schedule can be paid or skipped', () => {
  assert.equal(canSettle(r('DUE', 0)), true);
  assert.equal(canSettle(r('OVERDUE', -1)), true);
  assert.equal(canSettle(r('UPCOMING', 2)), false);
  assert.equal(canSettle(r('DUE', 0, false)), false);
});

test('the form says what is wrong and builds the body', () => {
  assert.deepEqual(Object.keys(validateRegular({ name: '', kind: 'EXPENSE', categoryId: '', amount: '0', frequency: 'MONTHLY', start: 'x' })).sort(), ['amount', 'categoryId', 'name', 'start']);
  const f = { name: ' Rent ', kind: 'EXPENSE' as const, categoryId: 'c1', amount: '5000', frequency: 'MONTHLY' as const, start: '2026-12-01' };
  assert.deepEqual(validateRegular(f), {});
  assert.deepEqual(regularBody(f, ' note '), { name: 'Rent', kind: 'EXPENSE', category: 'c1', amount: '5000', frequency: 'MONTHLY', start_date: '2026-12-01', notes: 'note' });
});
