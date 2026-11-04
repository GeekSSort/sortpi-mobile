import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TransferItem } from './logic.ts';
import { receiveBody, receiveProblem, setAmount, startAmounts, stepAmount, stillMissing, takesAll, waiting } from './receive.ts';

const it = (o: Partial<TransferItem> = {}): TransferItem => ({ id: 'a', variant: 'v', sku: 's', product_name: 'Tea', variant_name: '', quantity: '10.000', received_quantity: '0.000', unit_short_name: 'pcs', unit_allow_decimal: false, ...o });
const items = [it(), it({ id: 'b', quantity: '5.000', received_quantity: '2.000' }), it({ id: 'c', received_quantity: '10.000' })];

test('only items still on the way can be received, and each starts as everything left', () => {
  assert.deepEqual(waiting(items).map((i) => i.id), ['a', 'b']);
  assert.deepEqual(startAmounts(items), { a: '10', b: '3' });
});

test('an amount is typed or stepped, whole where parts are not allowed, and never above what is left', () => {
  let a = startAmounts(items);
  a = setAmount(a, items[0], '4');
  assert.equal(a.a, '4');
  assert.equal(setAmount(a, items[0], '99').a, '10');
  assert.equal(setAmount(a, items[0], '').a, '');
  assert.equal(stepAmount(a, items[0], 1).a, '5');
  assert.equal(stepAmount(setAmount(a, items[0], '10'), items[0], 1).a, '10');
  assert.equal(stepAmount(setAmount(a, items[0], '0'), items[0], -1).a, '0');
  const kg = it({ id: 'k', unit_allow_decimal: true, quantity: '3.000' });
  assert.equal(setAmount({ k: '3' }, kg, '1.5').k, '1.5');
});

test('nothing can be received until at least one item has an amount', () => {
  assert.equal(receiveProblem({ a: '0', b: '' }), 'Enter how many arrived for at least one item.');
  assert.equal(receiveProblem({ a: '1', b: '' }), null);
});

test('the body names only the items that arrived, with three-place quantities', () => {
  assert.deepEqual(receiveBody({ a: '4', b: '', c: '0' }), { lines: [{ item: 'a', quantity: '4.000' }] });
  assert.deepEqual(receiveBody({ a: '4', b: '1.5' }).lines.length, 2);
});

test('what is still missing after this receipt, and whether it takes everything', () => {
  assert.equal(stillMissing(items, { a: '4', b: '3' }), '6');
  assert.equal(stillMissing(items, startAmounts(items)), '0');
  assert.equal(takesAll(items, startAmounts(items)), true);
  assert.equal(takesAll(items, { a: '4', b: '3' }), false);
  assert.equal(takesAll(items, { a: '10', b: '' }), false);
});
