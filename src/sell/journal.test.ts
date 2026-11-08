import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { decodeDraft, decodePending, mayHaveCommitted, PENDING_MAX_AGE_MS } from './journal.ts';

const NOW = 1_800_000_000_000;
const ctx = { customerId: 'c', warehouseId: 'w', branchId: 'b', shiftId: 's' };
const pending = { v: 1, key: 'k-1', at: NOW - 1000, userId: 'u1', ctx, cart: [{ key: 'v|', variantId: 'v', unitId: null, name: 'Tea', sku: 'T', unitLabel: null, unitPrice: '10', quantity: '2' }], payments: [{ payment_method: 'CASH', amount: '20' }], total: '20', customerName: null };

test('a pending sale comes back for the same person, with its key and request', () => {
  const p = decodePending(JSON.stringify(pending), 'u1', NOW);
  assert.equal(p?.key, 'k-1');
  assert.equal(p?.payments[0].amount, '20');
});

test('a pending sale is never handed to another person, or when stale, or when damaged', () => {
  assert.equal(decodePending(JSON.stringify(pending), 'u2', NOW), null);
  assert.equal(decodePending(JSON.stringify(pending), 'u1', NOW + PENDING_MAX_AGE_MS + 5000), null);
  assert.equal(decodePending('{not json', 'u1', NOW), null);
  assert.equal(decodePending(JSON.stringify({ ...pending, key: '' }), 'u1', NOW), null);
  assert.equal(decodePending(null, 'u1', NOW), null);
});

test('a draft cart returns only for the same person and branch, and only if it has something in it', () => {
  const draft = { v: 1, at: NOW - 5000, userId: 'u1', branchId: 'b', cart: pending.cart, customer: null };
  assert.equal(decodeDraft(JSON.stringify(draft), 'u1', 'b', NOW)?.cart.length, 1);
  assert.equal(decodeDraft(JSON.stringify(draft), 'u1', 'other', NOW), null);
  assert.equal(decodeDraft(JSON.stringify(draft), 'u2', 'b', NOW), null);
  assert.equal(decodeDraft(JSON.stringify({ ...draft, cart: [] }), 'u1', 'b', NOW), null);
});

test('after a failed sale request: only an unanswered one may have been recorded', () => {
  assert.equal(mayHaveCommitted(new ApiError(0, 'TIMEOUT', 'x')), true);
  assert.equal(mayHaveCommitted(new ApiError(0, 'NETWORK_ERROR', 'x')), true);
  assert.equal(mayHaveCommitted(new ApiError(503, 'HTTP_503', 'x')), true);
  assert.equal(mayHaveCommitted(new ApiError(409, 'REQUEST_IN_PROGRESS', 'x')), true);
  assert.equal(mayHaveCommitted(new ApiError(409, 'INSUFFICIENT_STOCK', 'x')), false);
  assert.equal(mayHaveCommitted(new ApiError(400, 'PAYMENT_EXCEEDS_TOTAL', 'x')), false);
  assert.equal(mayHaveCommitted(new Error('boom')), true);
});
