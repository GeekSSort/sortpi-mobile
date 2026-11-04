import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { applyMoved, changedLines, cleanCount, countAsSystem, countBody, describeCountError, difference, missingCost, needsCost, setCounted, stepCount, tally, type CountSource, type Counts } from './count.ts';

const soda: CountSource = { variant: 'v1', sku: 'S-1', quantity: '613.000', unit_short_name: 'pcs', unit_allow_decimal: false, average_cost: '455.9', cost_price: '400' };
const rice: CountSource = { variant: 'v2', sku: 'R-1', quantity: '2.500', unit_short_name: 'kg', unit_allow_decimal: true, average_cost: '0.0000', cost_price: '90.0000' };
const none: Counts = {};

test('typed amounts keep only digits, and a dot with three places only for weighed items', () => {
  assert.equal(cleanCount('12abc', false), '12');
  assert.equal(cleanCount('1.5', false), '15');
  assert.equal(cleanCount('1.2345', true), '1.234');
  assert.equal(cleanCount('1.2.3', true), '1.23');
  assert.equal(cleanCount('', true), '');
});

test('counting keeps the system figure from the first time, and emptying the entry takes the item out', () => {
  let c = setCounted(none, soda, 'Soda', '610');
  assert.equal(c.v1.expected, '613.000');
  c = setCounted(c, { ...soda, quantity: '999.000' }, 'Soda', '611'); // the row moved on the screen: the first figure stays
  assert.equal(c.v1.expected, '613.000');
  assert.equal(c.v1.counted, '611');
  assert.deepEqual(setCounted(c, soda, 'Soda', ''), {});
  assert.deepEqual(setCounted(c, soda, 'Soda', '.'), {});
});

test('the hand counter steps by one from zero and never goes below zero', () => {
  let c = stepCount(none, soda, 'Soda', 1);
  assert.equal(c.v1.counted, '1');
  c = stepCount(c, soda, 'Soda', 1);
  assert.equal(c.v1.counted, '2');
  c = stepCount(stepCount(c, soda, 'Soda', -1), soda, 'Soda', -1);
  assert.equal(c.v1.counted, '0');
  assert.equal(stepCount(c, soda, 'Soda', -1).v1.counted, '0');
});

test('"same as the system" counts exactly what the system says', () => {
  assert.equal(countAsSystem(none, soda, 'Soda').v1.counted, '613');
  assert.equal(countAsSystem(none, rice, 'Rice').v2.counted, '2.5');
  assert.equal(countAsSystem(none, { ...soda, quantity: '0.000' }, 'Soda').v1.counted, '0');
});

test('only lines that differ are changes, with the tally and the net units', () => {
  let c = countAsSystem(none, soda, 'Soda'); // same
  c = setCounted(c, rice, 'Rice', '4'); // +1.5
  assert.deepEqual(tally(c), { counted: 2, differ: 1, net: '1.5' });
  assert.deepEqual(changedLines(c).map((l) => l.sku), ['R-1']);
  assert.equal(difference(c.v2), '1.5');
});

test('the posted body has only changed lines, three-place strings, and what was seen', () => {
  let c = setCounted(none, soda, 'Soda', '610');
  c = countAsSystem(c, { ...rice, variant: 'v3', sku: 'R-3' }, 'Same');
  assert.deepEqual(countBody('w1', c), { warehouse: 'w1', reason: 'COUNT', note: 'Stock count', apply: true, expect_unchanged: true, items: [{ variant: 'v1', new_quantity: '610.000', expected_quantity: '613.000' }] });
});

test('an item never in stock needs a cost: sent when known, named when not', () => {
  const never = { ...soda, variant: 'v9', sku: 'N-9', quantity: '0.000', average_cost: '0.0000', cost_price: '94.0800' };
  const c = setCounted(none, never, 'New thing', '2');
  assert.equal(needsCost(c.v9), true);
  assert.equal(countBody('w', c).items[0].unit_cost, '94.0800');
  assert.equal(missingCost(c), undefined);
  const noCost = setCounted(none, { ...never, cost_price: undefined }, 'New thing', '2');
  assert.equal(missingCost(noCost)?.name, 'New thing');
  assert.equal(needsCost(setCounted(none, soda, 'Soda', '5').v1), false); // it has stock and a cost
  assert.equal(needsCost(setCounted(none, never, 'New thing', '0').v9), false); // nothing added
});

test('when the shelf moved, the server figures become the system figures and the counts stay', () => {
  const c = setCounted(setCounted(none, soda, 'Soda', '610'), rice, 'Rice', '4');
  const err = new ApiError(409, 'ADJUSTMENT_STOCK_MOVED', 'x', { lines: [{ sku: 'S-1', expected: '613.000', on_hand: '600.000' }] });
  const next = applyMoved(c, err);
  assert.equal(next.v1.expected, '600.000');
  assert.equal(next.v1.counted, '610');
  assert.equal(next.v2.expected, '2.500');
  assert.equal(applyMoved(c, new ApiError(400, 'OTHER', 'x')), c);
  assert.equal(applyMoved(c, new Error('x')), c);
});

test('every refusal has a plain sentence', () => {
  const say = (code: string) => describeCountError(new ApiError(409, code, 'raw'));
  assert.match(say('ADJUSTMENT_STOCK_MOVED'), /sold or moved/);
  assert.match(say('ADJUSTMENT_COST_REQUIRED'), /cost price/);
  assert.match(say('NETWORK_ERROR'), /not be saved twice/);
  assert.equal(say('NEW_CODE'), 'raw');
});
