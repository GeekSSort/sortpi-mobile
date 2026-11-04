import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTION_CHIPS, amountOf, describeAction, detailLine, lastSeen, titleCase } from './logic.ts';

test('when someone last signed in, in words', () => {
  const now = new Date(2026, 10, 4, 15, 0);
  assert.deepEqual(lastSeen(null, now), { key: 'Never signed in' });
  assert.deepEqual(lastSeen(new Date(2026, 10, 4, 1, 0).toISOString(), now), { key: 'Signed in today' });
  assert.deepEqual(lastSeen(new Date(2026, 10, 3, 23, 0).toISOString(), now), { key: 'Signed in yesterday' });
  assert.deepEqual(lastSeen(new Date(2026, 9, 25, 12, 0).toISOString(), now), { key: 'Signed in {n} days ago', n: 10 });
});

test('known actions have words and a look; unknown ones are spelled out, not hidden', () => {
  assert.deepEqual(describeAction('SALE_CREATED'), { words: 'Sale made', icon: 'Cash', tone: 'good', known: true });
  assert.equal(describeAction('SALE_RETURNED').tone, 'warn');
  assert.equal(describeAction('ACCOUNT_LOCKED').tone, 'bad');
  const unknown = describeAction('SALE_VOIDED');
  assert.deepEqual([unknown.words, unknown.known, unknown.tone], ['Sale voided', false, 'plain']);
  assert.equal(titleCase('LOGIN_FAILED'), 'Login failed');
});

test('each chip is one server action', () => {
  assert.equal(ACTION_CHIPS[0].action, undefined);
  assert.ok(ACTION_CHIPS.slice(1).every((c) => describeAction(c.action!).known));
});

test('the detail line says what the entry was about', () => {
  assert.deepEqual(detailLine({ action: 'SALE_CREATED', old_values: null, new_values: { invoice_number: 'DHK26-1519', grand_total: '617.57' }, note: '' }), { key: 'Invoice {n}', params: { n: 'DHK26-1519' } });
  assert.deepEqual(detailLine({ action: 'STOCK_ADJUSTED', old_values: null, new_values: { sku: 'S-1', change: '-3.000' }, note: '' }), { key: '{sku}: {change}', params: { sku: 'S-1', change: '-3' } });
  assert.deepEqual(detailLine({ action: 'STOCK_ADJUSTED', old_values: null, new_values: { sku: 'S-1', change: '1.000' }, note: '' })?.params.change, '+1');
  assert.deepEqual(detailLine({ action: 'PRODUCT_UPDATED', old_values: { reorder_level: '1' }, new_values: { reorder_level: '2', name: 'x' }, note: '' }), { key: 'Changed: {fields}', params: { fields: 'reorder level, name' } });
  assert.deepEqual(detailLine({ action: 'LOGIN', old_values: null, new_values: null, note: '' }), null);
  assert.deepEqual(detailLine({ action: 'LOGIN', old_values: null, new_values: null, note: ' from till ' }), { key: '{note}', params: { note: 'from till' } });
});

test('an amount is shown only for sales and returns', () => {
  assert.equal(amountOf({ action: 'SALE_CREATED', new_values: { grand_total: '617.57' } }), '617.57');
  assert.equal(amountOf({ action: 'PRICE_CHANGED', new_values: { grand_total: '5' } }), null);
  assert.equal(amountOf({ action: 'SALE_CREATED', new_values: null }), null);
});
