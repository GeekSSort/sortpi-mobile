import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { canReturn, chosenLines, describeReturnError, mustPayFirst, previewFacts, returnable, returnBody, stepQuantity } from './returns.ts';

const item = (id: string, q: string, back = '0') => ({ id, quantity: q, returned_quantity: back });

test('what can still come back is sold minus already returned', () => {
  assert.equal(returnable(item('a', '5', '2')), '3');
  assert.equal(returnable(item('a', '2.5', '0.5')), '2');
});

test('a return needs a completed sale with something left', () => {
  assert.equal(canReturn({ status: 'COMPLETED', items: [item('a', '1', '1'), item('b', '2', '1')] }), true);
  assert.equal(canReturn({ status: 'COMPLETED', items: [item('a', '1', '1')] }), false);
  assert.equal(canReturn({ status: 'CANCELLED', items: [item('a', '1')] }), false);
});

test('the buttons step by one (half for weight) and stay between 0 and what is left', () => {
  assert.equal(stepQuantity('0', 1, '3', false), '1');
  assert.equal(stepQuantity('3', 1, '3', false), '3');
  assert.equal(stepQuantity('1', -1, '3', false), '0');
  assert.equal(stepQuantity('0', -1, '3', false), '0');
  assert.equal(stepQuantity('1.5', 1, '2', true), '2');
  assert.equal(stepQuantity('0.5', -1, '2', true), '0');
});

test('only chosen lines are sent, with quantities as strings', () => {
  assert.deepEqual(chosenLines({ a: '2', b: '0', c: '0.5' }), [{ sale_item_id: 'a', quantity: '2' }, { sale_item_id: 'c', quantity: '0.5' }]);
});

test('the return body carries no prices, a trimmed reason, and a payment only when something is left to pay', () => {
  const b = returnBody({ chosen: { a: '1' }, method: 'CASH', reason: '  broken  ', today: '2026-11-04' });
  assert.deepEqual(b, { return_date: '2026-11-04', refund_method: 'CASH', items: [{ sale_item_id: 'a', quantity: '1' }], reason: 'broken' });
  const p = returnBody({ chosen: { a: '1' }, method: 'CREDIT', reason: '', today: '2026-11-04', payRest: { amount: '120.00', method: 'MOBILE' } });
  assert.deepEqual(p.payment, { amount: '120.00', payment_method: 'MOBILE' });
  assert.ok(!('reason' in p));
  assert.ok(!('payment' in returnBody({ chosen: { a: '1' }, method: 'CASH', reason: '', today: 'x', payRest: { amount: '0.00', method: 'CASH' } })));
});

test('the preview is read as plain facts, leaving out zeros', () => {
  const f = previewFacts({ returned_value: '300.00', previous_due: '100.00', applied_to_due: '100.00', refund_amount: '200.00', store_credit: '0.00', remaining_due: '0.00', refund_requires_paid: false });
  assert.deepEqual(f, { worth: '300.00', offDue: '100.00', giveBack: '200.00', onAccount: null, payRest: null });
  assert.equal(previewFacts({ returned_value: '50', previous_due: '200', applied_to_due: '50', refund_amount: '0', store_credit: '0', remaining_due: '150', refund_requires_paid: false }).payRest, '150');
});

test('a shop that refunds only paid invoices blocks a sale that still owes', () => {
  const p = { returned_value: '1', previous_due: '5', applied_to_due: '0', refund_amount: '0', store_credit: '0', remaining_due: '0', refund_requires_paid: true };
  assert.equal(mustPayFirst(p, '5.00'), true);
  assert.equal(mustPayFirst(p, '0.00'), false);
  assert.equal(mustPayFirst({ ...p, refund_requires_paid: false }, '5.00'), false);
  assert.equal(mustPayFirst(undefined, '5.00'), false);
});

test('server codes become plain words', () => {
  assert.match(describeReturnError(new ApiError(400, 'RETURN_EXCEEDS_ORIGINAL', 'x')), /more than was sold/);
  assert.match(describeReturnError(new ApiError(409, 'SALE_NOT_COMPLETED', 'x')), /cancelled/);
  assert.equal(describeReturnError(new Error('x')), 'Something went wrong. Try again.');
});
