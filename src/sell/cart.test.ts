import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addItem, buildPreviewRequest, buildSellRequest, changeDue, discountFields, discountProblem, shippingFields, shippingProblem, lineDiscountProblem, lineEstimate, linePriceProblem, setLineDiscount, setLinePrice, changeQuantity, estimateSubtotal, itemCount, lastQuantity, qtyText, setQuantity, type Cart, type ScannedItem } from './cart.ts';

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

test('lastQuantity says whether an item is already in the cart, per unit', () => {
  const cart = addItem(addItem([], tea), tea);
  assert.equal(lastQuantity(cart, tea), '2');
  assert.equal(lastQuantity(cart, carton), null);
  assert.equal(lastQuantity([], tea), null);
});

test('an order discount goes to the server as a fraction of the bill or as an amount, and only when it is real', () => {
  assert.deepEqual(discountFields({ kind: 'PCT', value: '10' }), { discount_percent: '0.1000' });
  assert.deepEqual(discountFields({ kind: 'PCT', value: '12.5' }), { discount_percent: '0.1250' });
  assert.deepEqual(discountFields({ kind: 'AMT', value: '20' }), { discount_amount: '20.00' });
  assert.deepEqual(discountFields(null), {});
  assert.deepEqual(discountFields({ kind: 'AMT', value: '0' }), {});
});

test('a discount typed wrongly is refused with a reason', () => {
  assert.equal(discountProblem('PCT', '10'), null);
  assert.match(discountProblem('PCT', '101') ?? '', /more than 100/);
  assert.match(discountProblem('AMT', '') ?? '', /above 0/);
  assert.match(discountProblem('AMT', 'abc') ?? '', /above 0/);
  assert.equal(discountProblem('AMT', '250'), null);
});

test('the discount rides on both the preview and the sale', () => {
  const ctx = { customerId: 'c', warehouseId: 'w', branchId: 'b', orderDiscount: { kind: 'PCT' as const, value: '10' } };
  assert.equal(buildPreviewRequest(ctx, []).discount_percent, '0.1000');
  assert.equal(buildSellRequest(ctx, [], []).discount_percent, '0.1000');
  assert.equal('discount_percent' in buildSellRequest({ ...ctx, orderDiscount: null }, [], []), false);
});

test('an agreed price and a line discount change the estimate and ride on both requests', () => {
  let cart: Cart = addItem([], tea);
  cart = setQuantity(cart, cart[0]!.key, '2');
  assert.equal(lineEstimate(cart[0]!), '613.62');
  cart = setLinePrice(cart, cart[0]!.key, '300');
  assert.equal(lineEstimate(cart[0]!), '600');
  cart = setLineDiscount(cart, cart[0]!.key, '50');
  assert.equal(lineEstimate(cart[0]!), '550');
  const ctx = { customerId: 'c', warehouseId: 'w', branchId: 'b' };
  assert.deepEqual(buildSellRequest(ctx, cart, []).items[0], { variant_id: 'v-tea', quantity: '2.000', unit_price: '300.0000', discount_amount: '50.00' });
  assert.deepEqual(buildPreviewRequest(ctx, cart).items[0], { variant_id: 'v-tea', quantity: '2.000', unit_price: '300.0000', discount_amount: '50.00' });
  cart = setLinePrice(setLineDiscount(cart, cart[0]!.key, null), cart[0]!.key, null);
  assert.equal('unit_price' in buildSellRequest(ctx, cart, []).items[0]!, false);
  assert.equal(lineEstimate(cart[0]!), '613.62');
});

test('a line discount larger than the line, or a badly typed price, is refused', () => {
  assert.equal(linePriceProblem('450'), null);
  assert.match(linePriceProblem('four') ?? '', /Type a price/);
  assert.equal(lineDiscountProblem('50', '600'), null);
  assert.match(lineDiscountProblem('700', '600') ?? '', /more than the line/);
  assert.match(lineDiscountProblem('0', '600') ?? '', /above 0/);
});

test('shipping goes to the server as an extra charge, and only when it is a real amount', () => {
  assert.deepEqual(shippingFields('60'), { extra_charge_amount: '60.00', extra_charge_reason: 'Shipping' });
  assert.deepEqual(shippingFields(undefined), {});
  assert.deepEqual(shippingFields('0'), {});
  assert.equal(shippingProblem(''), null);
  assert.equal(shippingProblem('60.50'), null);
  assert.match(shippingProblem('sixty') ?? '', /Type the shipping/);
  const ctx = { customerId: 'c', warehouseId: 'w', branchId: 'b', shipping: '60' };
  assert.equal(buildSellRequest(ctx, [], []).extra_charge_amount, '60.00');
  assert.equal('extra_charge_amount' in buildPreviewRequest(ctx, []), false);
});
