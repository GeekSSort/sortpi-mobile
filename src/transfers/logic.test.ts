import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { alreadyDone, ASK, describeTransferError, nextMoves, outstanding, sentOf, STATUS, stillOnTheRoad, type TransferItem } from './logic.ts';

const item = (o: Partial<TransferItem> = {}): TransferItem => ({ id: 'i', variant: 'v', sku: 's', product_name: 'Tea', variant_name: '', quantity: '10.000', received_quantity: '0.000', unit_short_name: 'pcs', unit_allow_decimal: false, ...o });
const t = (status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED', items = [item()]) => ({ status, items });
const ALL = ['inventory.transfer', 'inventory.receive_transfer'];

test('a draft can be sent, an on-the-way one received or taken back, a finished one nothing', () => {
  assert.deepEqual(nextMoves(t('DRAFT'), ALL), ['dispatch']);
  assert.deepEqual(nextMoves(t('DISPATCHED'), ALL), ['receive', 'undo']);
  assert.deepEqual(nextMoves(t('RECEIVED', [item({ received_quantity: '10.000' })]), ALL), []);
  assert.deepEqual(nextMoves(t('CANCELLED'), ALL), []);
});

test('each move needs its own permission, and a part-received transfer cannot be taken back', () => {
  assert.deepEqual(nextMoves(t('DRAFT'), ['inventory.receive_transfer']), []);
  assert.deepEqual(nextMoves(t('DISPATCHED'), ['inventory.receive_transfer']), ['receive']);
  assert.deepEqual(nextMoves(t('DISPATCHED'), ['inventory.transfer']), ['undo']);
  assert.deepEqual(nextMoves(t('DISPATCHED'), undefined), []);
  assert.deepEqual(nextMoves(t('DISPATCHED', [item({ received_quantity: '4.000' })]), ALL), ['receive']);
  assert.deepEqual(nextMoves(t('DRAFT', []), ALL), []);
});

test('what is still on the road, in text math', () => {
  assert.equal(outstanding(item({ received_quantity: '3.500', quantity: '10.000' })), '6.5');
  assert.equal(stillOnTheRoad({ items: [item({ received_quantity: '10.000' })] }), false);
  assert.equal(stillOnTheRoad({ items: [item({ received_quantity: '10.000' }), item()] }), true);
  assert.equal(sentOf({ items: [item(), item({ quantity: '2.500' })] }), 12.5);
});

test('after a lost connection the new status says whether the move went through', () => {
  assert.equal(alreadyDone('dispatch', 'DISPATCHED'), true);
  assert.equal(alreadyDone('dispatch', 'DRAFT'), false);
  assert.equal(alreadyDone('receive', 'RECEIVED'), true);
  assert.equal(alreadyDone('undo', 'DRAFT'), true);
});

test('every move has a question, every status a colour, every refusal a plain sentence', () => {
  assert.equal(ASK.undo.danger, true);
  assert.equal(ASK.dispatch.danger, false);
  assert.equal(STATUS.DISPATCHED.tone, 'warn');
  assert.equal(STATUS.RECEIVED.tone, 'good');
  const say = (code: string) => describeTransferError(new ApiError(409, code, 'raw'));
  assert.match(say('TRANSFER_NOT_DRAFT'), /already sent/);
  assert.match(say('TRANSFER_PARTLY_RECEIVED'), /already arrived/);
  assert.match(say('NETWORK_ERROR'), /Pull down/);
  assert.equal(say('SOMETHING_NEW'), 'raw');
  assert.equal(describeTransferError(new Error('x')), 'Something went wrong. Try again.');
});
