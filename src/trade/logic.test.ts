import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardLook, collectProblem, deliverySteps, isOverdue, owedTotal, totalCommission, validateCard, validateTradeIn } from './logic.ts';

test('a gift card is voided, used up, expired or live', () => {
  assert.equal(cardLook({ is_active: false, balance: '50', expires_on: null }, '2026-11-08'), 'voided');
  assert.equal(cardLook({ is_active: true, balance: '0', expires_on: null }, '2026-11-08'), 'used');
  assert.equal(cardLook({ is_active: true, balance: '50', expires_on: '2026-11-01' }, '2026-11-08'), 'expired');
  assert.equal(cardLook({ is_active: true, balance: '50', expires_on: '2026-12-01' }, '2026-11-08'), 'live');
  assert.equal(cardLook({ is_active: true, balance: '50', expires_on: null }, '2026-11-08'), 'live');
});

test('a card needs an amount and, if given, a real last day', () => {
  assert.deepEqual(validateCard({ value: '500', expires: '' }), {});
  assert.ok(validateCard({ value: '0', expires: '' }).value);
  assert.ok(validateCard({ value: '500', expires: '31/12/2026' }).expires);
});

test('an instalment is more than nothing and not more than is owed', () => {
  assert.equal(collectProblem('', '100'), 'Enter the amount received.');
  assert.equal(collectProblem('150', '100'), 'That is more than is still owed.');
  assert.equal(collectProblem('100', '100'), null);
  assert.equal(isOverdue({ overdue: '25.00' }), true);
  assert.equal(Number(owedTotal([{ outstanding: '10.5' }, { outstanding: '4.5' }])), 15);
});

test('a delivery moves pending -> out -> delivered, and installed after', () => {
  assert.deepEqual(deliverySteps({ status: 'PENDING', installation_required: false, installed_at: null }, true), { out: true, delivered: true, failed: true, installed: false });
  assert.deepEqual(deliverySteps({ status: 'OUT', installation_required: false, installed_at: null }, true), { out: false, delivered: true, failed: true, installed: false });
  assert.equal(deliverySteps({ status: 'DELIVERED', installation_required: true, installed_at: null }, true).installed, true);
  assert.equal(deliverySteps({ status: 'DELIVERED', installation_required: true, installed_at: '2026-11-08' }, true).installed, false);
  assert.deepEqual(deliverySteps({ status: 'PENDING', installation_required: false, installed_at: null }, false), { out: false, delivered: false, failed: false, installed: false });
});

test('commission adds up, and a trade-in needs a customer and a device', () => {
  assert.equal(Number(totalCommission([{ commission: '10.25' }, { commission: '4.75' }])), 15);
  assert.deepEqual(Object.keys(validateTradeIn({ customerId: '', device: ' ', value: 'x' })).sort(), ['customerId', 'device', 'value']);
  assert.deepEqual(validateTradeIn({ customerId: 'c', device: 'Phone', value: '' }), {});
});
