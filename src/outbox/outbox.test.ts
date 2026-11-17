import assert from 'node:assert/strict';
import { test } from 'node:test';

import { memoryDb } from '../local/node-db.ts';
import { due, enqueue, isPermanent, list, nextDue, openOutbox, recordFailure, remove, retryDelayMs, retryNow, saveProgress } from './outbox.ts';

const A = 'https://shop.example|u1';
const row = (id: string, account = A) => ({ id, account, kind: 'product' as const, payload: '{}', stock_key: `k-${id}` });

async function fresh() {
  const db = memoryDb();
  await openOutbox(db);
  return db;
}

test('an item written to the outbox is there at once, waiting, and due now', async () => {
  const db = await fresh();
  await enqueue(db, row('a'), 1000);
  const [r] = await list(db, A);
  assert.equal(r.state, 'pending');
  assert.equal(r.step, 0);
  assert.equal(r.attempts, 0);
  assert.deepEqual((await due(db, A, 1000)).map((x) => x.id), ['a']);
});

test('opening the outbox twice changes nothing and keeps what is in it', async () => {
  const db = await fresh();
  await enqueue(db, row('a'), 1);
  await openOutbox(db);
  assert.equal((await list(db, A)).length, 1);
});

test('one person never sees or sends another person\'s items', async () => {
  const db = await fresh();
  await enqueue(db, row('mine'), 1);
  await enqueue(db, row('theirs', 'https://shop.example|u2'), 1);
  assert.deepEqual((await list(db, A)).map((x) => x.id), ['mine']);
  assert.deepEqual((await due(db, A, 99)).map((x) => x.id), ['mine']);
});

test('items go out oldest first', async () => {
  const db = await fresh();
  await enqueue(db, row('second'), 20);
  await enqueue(db, row('first'), 10);
  assert.deepEqual((await due(db, A, 100)).map((x) => x.id), ['first', 'second']);
});

test('a step that worked is written down and survives a restart of the sender', async () => {
  const db = await fresh();
  await enqueue(db, row('a'), 1);
  await saveProgress(db, 'a', { step: 1, product_id: 'p1', made: '[{"id":"v1","name":"Default"}]' });
  const [r] = await list(db, A);
  assert.equal(r.step, 1);
  assert.equal(r.product_id, 'p1');
  assert.equal(r.made, '[{"id":"v1","name":"Default"}]');
  await saveProgress(db, 'a', { step: 2 });
  const [r2] = await list(db, A);
  assert.equal(r2.step, 2);
  assert.equal(r2.product_id, 'p1', 'a later step does not wipe what an earlier one saved');
});

test('a failure that may pass waits and is tried again, calmer each time', async () => {
  const db = await fresh();
  await enqueue(db, row('a'), 0);
  await recordFailure(db, 'a', { message: 'No connection', permanent: false }, 1000);
  let [r] = await list(db, A);
  assert.equal(r.state, 'pending');
  assert.equal(r.attempts, 1);
  assert.equal(r.next_try_at, 1000 + 5_000);
  assert.deepEqual(await due(db, A, 1000 + 4_999), []);
  assert.deepEqual((await due(db, A, 1000 + 5_000)).map((x) => x.id), ['a']);
  await recordFailure(db, 'a', { message: 'No connection', permanent: false }, 7000);
  [r] = await list(db, A);
  assert.equal(r.next_try_at, 7000 + 15_000);
  assert.equal(await nextDue(db, A), 22_000);
});

test('a failure that will not pass parks the item for the person, who can try again or remove it', async () => {
  const db = await fresh();
  await enqueue(db, row('a'), 0);
  await recordFailure(db, 'a', { message: 'Another product already uses this barcode.', permanent: true }, 10);
  let [r] = await list(db, A);
  assert.equal(r.state, 'failed');
  assert.equal(r.error, 'Another product already uses this barcode.');
  assert.deepEqual(await due(db, A, 1e9), [], 'a parked item is not sent by itself');
  assert.equal(await nextDue(db, A), null);
  await retryNow(db, 'a', 500);
  [r] = await list(db, A);
  assert.equal(r.state, 'pending');
  assert.equal(r.error, null);
  assert.equal(r.attempts, 0);
  assert.deepEqual((await due(db, A, 500)).map((x) => x.id), ['a']);
  await remove(db, 'a');
  assert.deepEqual(await list(db, A), []);
});

test('the wait between tries is 5 s, 15 s, 30 s, 1 min, 2 min, then 5 min at most', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 50].map(retryDelayMs), [5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 300_000, 300_000]);
  assert.equal(retryDelayMs(0), 5_000);
});

test('the server saying no is permanent; no answer, a slow one, a busy server and an expired sign-in are not', () => {
  for (const status of [400, 403, 404, 409, 422]) assert.equal(isPermanent({ status }), true, String(status));
  for (const status of [0, 401, 408, 425, 429, 500, 502, 503, 504]) assert.equal(isPermanent({ status }), false, String(status));
  assert.equal(isPermanent({}), false);
});

test('the sender works for the signed-in person through a blip in the session, and stops only on sign-out', async () => {
  const { senderAccount, outboxAccount } = await import('./outbox.ts');
  const mine = outboxAccount('https://shop.example', 'u1');
  for (const status of ['signedIn', 'booting', 'locked', 'unreachable']) assert.equal(senderAccount(status, 'https://shop.example', 'u1'), mine, status);
  assert.equal(senderAccount('signedOut', 'https://shop.example', 'u1'), null);
  assert.equal(senderAccount('signedIn', null, 'u1'), null);
  assert.equal(senderAccount('signedIn', 'https://shop.example', undefined), null);
});
