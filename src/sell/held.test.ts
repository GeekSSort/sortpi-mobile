import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Cart } from './cart.ts';
import { fromRow, holdBody, holdReference, mergeHeld } from './held.ts';

const cart: Cart = [{ key: 'v1|', variantId: 'v1', unitId: null, name: 'Cheese 500g', sku: 'S-1', unitLabel: null, unitPrice: '491.64', quantity: '2', allowDecimal: false }];

test('reference is HOLD- plus the last 8 digits of the time', () => {
  assert.equal(holdReference(1730000012345678), 'HOLD-12345678');
});

test('body uses the web till shape and leaves out a walk-in customer', () => {
  const b = holdBody({ branchId: 'b1', cart, now: 123456789, wholesale: true });
  assert.equal(b.branch, 'b1');
  assert.ok(!('customer' in b));
  assert.equal(b.cart_data.price_mode, 'wholesale');
  assert.deepEqual(b.cart_data.items[0], { productId: 'v1', name: 'Cheese 500g', sku: 'S-1', price: 491.64, quantity: 2, allowDecimal: false });
  assert.equal(holdBody({ branchId: 'b1', customerId: 'c1', cart, now: 1 }).customer, 'c1');
});

test('a row written by the web till is read back, and bad lines are dropped', () => {
  const h = fromRow({ id: 'h1', reference: 'HOLD-1', customer: null, customer_name: '', cashier_name: 'Rina', created_at: '2026-11-04T05:00:00Z', cart_data: { price_mode: 'wholesale', items: [{ productId: 'v9', name: 'Soda', sku: 'X', price: 30, quantity: 3 }, { productId: '', name: 'bad', quantity: 1 }, { productId: 'v8', quantity: 0 }] } });
  assert.equal(h.wholesale, true);
  assert.equal(h.customerId, null);
  assert.equal(h.lines.length, 1);
  assert.deepEqual([h.lines[0].variantId, h.lines[0].unitPrice, h.lines[0].quantity], ['v9', '30', '3']);
});

test('a row with no cart_data gives an empty cart instead of crashing', () => {
  assert.deepEqual(fromRow({ id: 'h2', cart_data: null }).lines, []);
});

test('resuming adds to what is in the cart and merges the same item', () => {
  const held = fromRow({ id: 'h', cart_data: { items: [{ productId: 'v1', name: 'Cheese 500g', sku: 'S-1', price: 491.64, quantity: 1 }, { productId: 'v2', name: 'Bread', sku: 'B', price: 100, quantity: 1 }] } }).lines;
  const out = mergeHeld(cart, held);
  assert.equal(out.length, 2);
  assert.equal(out[0].quantity, '3');
  assert.equal(out[1].variantId, 'v2');
});
