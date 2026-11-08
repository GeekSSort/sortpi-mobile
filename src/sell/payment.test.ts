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

import { amountDueNow } from './payment.ts';
import { changeDue } from './cart.ts';

test('cash is judged against what is taken now: a part payment is not short, and change follows it', () => {
  assert.equal(amountDueNow('1000', '', true), '1000');
  assert.equal(amountDueNow('1000', '500', true), '500');
  assert.equal(amountDueNow('1000', '500', false), '1000'); // a walk-in pays in full
  assert.equal(amountDueNow('1000', '1500', true), '1000'); // more than the total is not a part payment
  assert.equal(amountDueNow('1000', 'abc', true), '1000');
  assert.equal(changeDue(amountDueNow('1000', '500', true), '1000'), '500'); // 1,000 handed over for 500 now: 500 back
});

import { walletReference } from './payment.ts';

test('the wallet goes in front of the transaction id, and either may be missing', () => {
  assert.equal(walletReference('bKash', ' 8N7A6D5 '), 'bKash 8N7A6D5');
  assert.equal(walletReference('Nagad', ''), 'Nagad');
  assert.equal(walletReference(null, 'ABC1'), 'ABC1');
  assert.equal(walletReference(null, ''), '');
});

test('a reference never goes past what the shop keeps (50 characters), wallet name included', () => {
  const long = 'X'.repeat(80);
  assert.equal(walletReference('bKash', long).length, 50);
  assert.ok(walletReference('bKash', long).startsWith('bKash '));
  const plan = buildPayments({ choice: 'CARD', total: '100', payNow: '', reference: long, hasCustomer: false });
  assert.equal(plan.payments[0].reference_no?.length, 50);
});
