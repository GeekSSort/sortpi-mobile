import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysWords, dateWords, DEFAULT_WINDOW, itemName, LOOK, notTracked, STATE_CHIPS, WINDOWS } from './logic.ts';

test('days left are said the way a shopkeeper says them', () => {
  assert.deepEqual(daysWords(null), { key: 'No expiry date' });
  assert.deepEqual(daysWords(12), { key: '{n} days left', n: 12 });
  assert.deepEqual(daysWords(1), { key: 'Expires tomorrow' });
  assert.deepEqual(daysWords(0), { key: 'Expires today' });
  assert.deepEqual(daysWords(-1), { key: 'Expired yesterday' });
  assert.deepEqual(daysWords(-9), { key: 'Expired {n} days ago', n: 9 });
});

test('each state has a colour: red expired, orange expiring, green fine, grey no date', () => {
  assert.equal(LOOK.expired.tone, 'bad');
  assert.equal(LOOK.expiring.tone, 'warn');
  assert.equal(LOOK.ok.tone, 'good');
  assert.equal(LOOK.undated.tone, 'plain');
  assert.deepEqual(STATE_CHIPS.map((c) => c.state), ['expiring', 'expired', 'ok', 'undated']);
  assert.ok(WINDOWS.includes(DEFAULT_WINDOW as (typeof WINDOWS)[number]));
});

test('dates, names and a shop that does not track expiry', () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  assert.equal(dateWords('2026-11-16', months), '16 Nov 2026');
  assert.equal(dateWords('2026-01-05', months), '5 Jan 2026');
  assert.equal(dateWords('soon', months), 'soon');
  assert.equal(itemName({ product_name: 'Soda 2kg', variant_name: '' }), 'Soda 2kg');
  assert.equal(itemName({ product_name: 'Cream', variant_name: 'Default' }), 'Cream');
  assert.equal(notTracked(404), true);
  assert.equal(notTracked(500), false);
});
