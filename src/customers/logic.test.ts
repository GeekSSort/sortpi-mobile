import assert from 'node:assert/strict';
import { test } from 'node:test';

import { amountDue, buildCustomerRequest, creditLeft, paymentProblem, validateNewCustomer } from './logic.ts';

test('a payment must be a real amount and no more than is owed', () => {
  assert.match(paymentProblem('', '100.00') ?? '', /amount received/);
  assert.match(paymentProblem('0', '100.00') ?? '', /amount received/);
  assert.match(paymentProblem('12.345', '100.00') ?? '', /amount received/);
  assert.match(paymentProblem('100.01', '100.00') ?? '', /more than what is owed/);
  assert.equal(paymentProblem('100.00', '100.00'), null);
  assert.equal(paymentProblem('40.5', '100.00'), null);
});

test('only a positive balance counts as owed', () => {
  assert.equal(amountDue('9970.7000'), '9970.70');
  assert.equal(amountDue('-50.0000'), '0.00');
  assert.equal(amountDue('0'), '0.00');
});

test('credit left never goes below zero, and no limit means no line', () => {
  assert.equal(creditLeft('10000.0000', '9970.7000'), '29.30');
  assert.equal(creditLeft('10000', '12000'), '0.00');
  assert.equal(creditLeft('0.0000', '500'), null);
});

test('a new customer needs a name and a phone; the limit is optional but must be an amount', () => {
  assert.deepEqual(Object.keys(validateNewCustomer({ name: ' ', phone: '', wholesale: false, creditLimit: '' })).sort(), ['name', 'phone']);
  assert.ok(validateNewCustomer({ name: 'A', phone: '017', wholesale: false, creditLimit: '5,000' }).creditLimit);
  assert.deepEqual(buildCustomerRequest({ name: ' Rafi ', phone: ' 01711111111 ', wholesale: true, creditLimit: '' }), {
    name: 'Rafi', phone: '01711111111', email: '', customer_type: 'WHOLESALE', is_active: true,
  });
});
