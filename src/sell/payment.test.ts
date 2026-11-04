import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPayments } from './payment.ts';

const base = { total: '1000.00', payNow: '', reference: '', hasCustomer: false };

test('a normal sale pays the whole total with the chosen method', () => {
  const r = buildPayments({ ...base, choice: 'CASH' });
  assert.deepEqual(r.payments, [{ payment_method: 'CASH', amount: '1000.00' }]);
  assert.equal(r.problem, null);
  assert.equal(r.due, '0');
});

test('a card or mobile payment carries its reference; cash never does', () => {
  assert.deepEqual(buildPayments({ ...base, choice: 'MOBILE', reference: ' TRX123 ' }).payments, [{ payment_method: 'MOBILE', amount: '1000.00', reference_no: 'TRX123' }]);
  assert.equal('reference_no' in buildPayments({ ...base, choice: 'CASH', reference: 'x' }).payments[0]!, false);
});

test('credit needs a customer and sends no payment', () => {
  assert.match(buildPayments({ ...base, choice: 'CREDIT' }).problem ?? '', /Choose a customer/);
  const r = buildPayments({ ...base, choice: 'CREDIT', hasCustomer: true });
  assert.deepEqual(r.payments, []);
  assert.equal(r.due, '1000.00');
});

test('part payment leaves the rest on the customer account, never on a walk-in', () => {
  const part = buildPayments({ ...base, choice: 'CASH', payNow: '400', hasCustomer: true });
  assert.deepEqual(part.payments, [{ payment_method: 'CASH', amount: '400' }]);
  assert.equal(part.due, '600');
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '400' }).problem ?? '', /Choose a customer/);
});

test('the amount paid now must be real and not above the total', () => {
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '12,5', hasCustomer: true }).problem ?? '', /Enter the amount/);
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '1000.01', hasCustomer: true }).problem ?? '', /more than the total/);
});
