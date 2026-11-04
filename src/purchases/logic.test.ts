import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { addLine, describePurchaseError, estimate, isCost, isQty, nextSteps, paymentProblem, problems, purchaseBody, vatFraction, type Line } from './logic.ts';

const item = { variantId: 'v1', name: 'Soda 500g', sku: 'S-1', unitShort: 'pcs', allowDecimal: false };
const line = (o: Partial<Line> = {}): Line => ({ ...item, quantity: '2', unitCost: '100', ...o });

test('what can be done next follows the status and the permissions', () => {
  const all = ['purchase.confirm', 'purchase.receive', 'purchase.payment', 'purchase.delete'];
  assert.deepEqual(nextSteps({ status: 'DRAFT', due_amount: '0' }, all), { confirm: true, receive: false, pay: false, cancel: true });
  assert.deepEqual(nextSteps({ status: 'CONFIRMED', due_amount: '500' }, all), { confirm: false, receive: true, pay: true, cancel: true });
  assert.deepEqual(nextSteps({ status: 'PARTIAL', due_amount: '500' }, all), { confirm: false, receive: true, pay: true, cancel: false });
  assert.deepEqual(nextSteps({ status: 'RECEIVED', due_amount: '0.0000' }, all), { confirm: false, receive: false, pay: false, cancel: false });
  assert.deepEqual(nextSteps({ status: 'CANCELLED', due_amount: '500' }, all), { confirm: false, receive: false, pay: false, cancel: false });
  assert.deepEqual(nextSteps({ status: 'DRAFT', due_amount: '0' }, ['purchase.confirm']), { confirm: true, receive: false, pay: false, cancel: false });
  assert.equal(nextSteps({ status: 'CONFIRMED', due_amount: '5', adds_stock: false }, all).receive, false);
});

test('the same item twice is one line of more', () => {
  const once = addLine([], item);
  assert.equal(once[0].quantity, '1');
  const twice = addLine(once, item);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].quantity, '2');
  assert.equal(addLine(twice, { ...item, variantId: 'v2' }).length, 2);
});

test('amounts and prices are checked as typed', () => {
  assert.equal(isQty('3', false), true);
  assert.equal(isQty('1.5', false), false);
  assert.equal(isQty('1.5', true), true);
  assert.equal(isQty('0', true), false);
  assert.equal(isCost('45.5'), true);
  assert.equal(isCost('45.12345'), false);
  assert.equal(isCost('0'), false);
  assert.equal(isCost('1,200'), false);
});

test('an order needs a supplier, an item, and a price on every item', () => {
  assert.equal(problems({ supplierId: null, lines: [line()] }), 'Choose the supplier.');
  assert.equal(problems({ supplierId: 's', lines: [] }), 'Add at least one item.');
  assert.equal(problems({ supplierId: 's', lines: [line({ unitCost: '' })] }), 'Every item needs an amount and a price per piece.');
  assert.equal(problems({ supplierId: 's', lines: [line()] }), null);
});

test('VAT typed as a percentage becomes a fraction, empty or silly is none', () => {
  assert.equal(vatFraction('15'), '0.1500');
  assert.equal(vatFraction('7.5'), '0.0750');
  assert.equal(vatFraction(''), null);
  assert.equal(vatFraction('0'), null);
  assert.equal(vatFraction('150'), null);
  assert.equal(vatFraction('abc'), null);
});

test('the estimate adds tax on top of the cost', () => {
  assert.deepEqual(estimate([line({ quantity: '2', unitCost: '100' }), line({ variantId: 'v2', quantity: '1', unitCost: '50.50' })], '10'), { subtotal: '250.5', tax: '25.05', total: '275.55' });
  assert.deepEqual(estimate([line({ unitCost: '' })], ''), { subtotal: '0', tax: '0', total: '0' });
});

test('the body keeps amounts as text and puts the VAT fraction on every line', () => {
  const b = purchaseBody({ supplierId: 's1', branchId: 'b1', warehouseId: 'w1', date: '2026-11-04', invoiceNo: ' INV-9 ', note: '', vatPct: '15', lines: [line()] });
  assert.deepEqual(b, { supplier: 's1', branch: 'b1', warehouse: 'w1', purchase_date: '2026-11-04', supplier_invoice_no: 'INV-9', items: [{ variant: 'v1', quantity: '2', unit_cost: '100', tax_rate: '0.1500' }] });
  const plain = purchaseBody({ supplierId: 's1', branchId: 'b1', warehouseId: 'w1', date: 'd', invoiceNo: '', note: ' hi ', vatPct: '', lines: [line()] });
  assert.equal(plain.note, 'hi');
  assert.ok(!('tax_rate' in plain.items[0]));
});

test('a payment is a real amount and not more than is due', () => {
  assert.equal(paymentProblem('', '100'), 'Enter the amount you paid.');
  assert.match(paymentProblem('100.01', '100')!, /more than is still due/);
  assert.equal(paymentProblem('100', '100'), null);
});

test('server codes become plain words', () => {
  assert.match(describePurchaseError(new ApiError(409, 'PURCHASE_ALREADY_RECEIVED', 'x')), /cannot be cancelled/);
  assert.match(describePurchaseError(new ApiError(400, 'PAYMENT_EXCEEDS_DUE', 'x')), /more than is still due/);
  assert.equal(describePurchaseError(new Error('x')), 'Something went wrong. Try again.');
});
