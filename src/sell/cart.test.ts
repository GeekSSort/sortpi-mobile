import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addItem, buildPreviewRequest, buildSellRequest, changeDue, changeQuantity, estimateSubtotal, itemCount, qtyText, setQuantity, type Cart, type ScannedItem } from './cart.ts';

const tea: ScannedItem = { variantId: 'v-tea', unitId: null, name: 'Igloo Family Pack Tea 2L', sku: 'SKU-0000000', unitLabel: null, unitPrice: '306.8100' };
const carton: ScannedItem = { ...tea, unitId: 'u-carton', unitLabel: 'Carton', unitPrice: '3681.7200' };

test('a coupon and points go in the sale body only when used', () => {
  const base = { customerId: 'c', warehouseId: 'w', branchId: 'b' };
  const plain = buildSellRequest(base, [], []);
  assert.equal('coupon_code' in plain, false);
  assert.equal('redeem_points' in plain, false);
  const used = buildSellRequest({ ...base, couponCode: 'EID10', redeemPoints: 200 }, [], []);
  assert.equal(used.coupon_code, 'EID10');
  assert.equal(used.redeem_points, 200);
});

test('scanning the same item twice makes one line of two', () => {
  let cart: Cart = [];
  cart = addItem(cart, tea);
  cart = addItem(cart, tea);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, '2');
});

test('a carton barcode is a different line from the single item', () => {
  const cart = addItem(addItem([], tea), carton);
  assert.equal(cart.length, 2);
});

test('quantity of zero removes the line', () => {
  let cart = addItem([], tea);
  cart = changeQuantity(cart, cart[0].key, -1);
  assert.equal(cart.length, 0);
  assert.equal(setQuantity(addItem([], tea), 'nope', '5').length, 1);
});

test('estimate uses decimal strings, not floats', () => {
  let cart = addItem([], tea);
  cart = changeQuantity(cart, cart[0].key, 1); // 2 teas
  assert.equal(estimateSubtotal(cart), '613.62'); // matches the server's preview for 2 teas
  assert.equal(itemCount(cart), 2);
  assert.equal(estimateSubtotal([]), '0');
});

test('the sale request carries no price, total, tax or discount', () => {
  const cart = changeQuantity(addItem([], tea), addItem([], tea)[0].key, 1);
  const body = buildSellRequest({ customerId: 'c1', warehouseId: 'w1', branchId: 'b1', shiftId: 's1' }, cart, [{ payment_method: 'CASH', amount: '613.62' }]);
  assert.deepEqual(body.items, [{ variant_id: 'v-tea', quantity: '2.000' }]);
  const text = JSON.stringify(body);
  for (const forbidden of ['unit_price', 'grand_total', 'tax', 'discount', 'subtotal']) assert.equal(text.includes(forbidden), false, forbidden);
  assert.equal(body.shift_id, 's1');
  assert.equal(buildSellRequest({ customerId: 'c', warehouseId: 'w', branchId: 'b' }, cart, []).hasOwnProperty('shift_id'), false);
});

test('a unit line sends its unit id; preview mirrors the sale lines', () => {
  const cart = addItem([], carton);
  assert.deepEqual(buildPreviewRequest({ customerId: 'c', branchId: 'b' }, cart).items, [{ variant_id: 'v-tea', quantity: '1.000', unit_id: 'u-carton' }]);
  assert.equal(qtyText('2'), '2.000');
});

test('change is what the customer handed over beyond the total, never negative', () => {
  assert.equal(changeDue('613.62', '1000'), '386.38');
  assert.equal(changeDue('613.62', '500'), '0');
});
