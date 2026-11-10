import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildSellRequest, type Cart, type CartLine } from './cart.ts';
import { checkSerials, dealSerials, parseSerials, serialsNeeded } from './serials.ts';

const line = (o: Partial<CartLine> & { key: string; variantId: string }): CartLine => ({ unitId: null, name: 'Phone', sku: 'P', unitLabel: null, unitPrice: '100.00', quantity: '1', ...o });

test('typed serial numbers are split on lines and commas, spaces dropped, upper-cased', () => {
  assert.deepEqual(parseSerials('imei 1 2 3\nabc-9, def'), ['IMEI123', 'ABC-9', 'DEF']);
  assert.deepEqual(parseSerials('  \n ,'), []);
});

test('only items sold by serial need numbers, one per unit, summed over their lines', () => {
  const cart: Cart = [line({ key: 'a|', variantId: 'a', trackSerial: true, quantity: '2' }), line({ key: 'b|', variantId: 'b' }), line({ key: 'a|u', variantId: 'a', trackSerial: true, quantity: '1', unitId: 'u' })];
  assert.deepEqual(serialsNeeded(cart), [{ variantId: 'a', name: 'Phone', count: 3 }]);
  assert.deepEqual(serialsNeeded([line({ key: 'b|', variantId: 'b' })]), []);
});

test('the count must match exactly and no number may repeat', () => {
  const needed = [{ variantId: 'a', name: 'Phone', count: 2 }];
  assert.equal(checkSerials(needed, { a: 'X1' }).problem?.params?.have, 1);
  assert.equal(checkSerials(needed, { a: 'X1\nX2\nX3' }).problem?.params?.have, 3);
  assert.equal(checkSerials(needed, { a: 'x1, X1' }).problem?.params?.s, 'X1');
  const ok = checkSerials(needed, { a: 'x1\nx2' });
  assert.equal(ok.problem, null);
  assert.deepEqual(ok.serials, { a: ['X1', 'X2'] });
  // the same number on two different items is also a mistake
  assert.equal(checkSerials([{ variantId: 'a', name: 'A', count: 1 }, { variantId: 'b', name: 'B', count: 1 }], { a: 'Z', b: 'z' }).problem?.params?.s, 'Z');
});

test('numbers are dealt to lines in order and go into the sale request per line', () => {
  const cart: Cart = [line({ key: 'a|', variantId: 'a', trackSerial: true, quantity: '2' }), line({ key: 'a|u', variantId: 'a', trackSerial: true, quantity: '1', unitId: 'u' }), line({ key: 'b|', variantId: 'b' })];
  const dealt = dealSerials(cart, { a: ['S1', 'S2', 'S3'] });
  assert.deepEqual(dealt, { 'a|': ['S1', 'S2'], 'a|u': ['S3'] });
  const body = buildSellRequest({ customerId: 'c', warehouseId: 'w', branchId: 'b' }, cart, [], dealt);
  assert.deepEqual(body.items.map((i) => i.serials), [['S1', 'S2'], ['S3'], undefined]);
  // without numbers the request is exactly what it was
  assert.equal('serials' in buildSellRequest({ customerId: 'c', warehouseId: 'w', branchId: 'b' }, [line({ key: 'b|', variantId: 'b' })], []).items[0], false);
});
