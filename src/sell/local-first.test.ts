import assert from 'node:assert/strict';
import { test } from 'node:test';

import { localFirst } from './local-first.ts';

const tick = () => new Promise((r) => setTimeout(r, 0));

test('a local hit answers without waiting for the server, which then confirms', async () => {
  let release: (v: string | null) => void = () => undefined;
  const slowServer = new Promise<string | null>((r) => { release = r; });
  const seen: (string | null)[] = [];
  const answer = await localFirst(async () => 'local', () => slowServer, (a) => seen.push(a));
  assert.equal(answer, 'local');
  assert.deepEqual(seen, []); // the server has not answered yet
  release('server');
  await tick();
  assert.deepEqual(seen, ['server']);
});

test('the server saying the item is gone is passed on as null', async () => {
  const seen: (string | null)[] = [];
  await localFirst(async () => 'local', async () => null, (a) => seen.push(a));
  await tick();
  assert.deepEqual(seen, [null]);
});

test('a local miss waits for the server', async () => {
  let asked = 0;
  const answer = await localFirst(async () => null, async () => { asked += 1; return 'server'; });
  assert.equal(answer, 'server');
  assert.equal(asked, 1);
});

test('no local copy (undefined) goes to the server', async () => {
  assert.equal(await localFirst<string>(async () => undefined, async () => 'server'), 'server');
});

test('a failing local read goes to the server', async () => {
  assert.equal(await localFirst<string>(async () => { throw new Error('db'); }, async () => 'server'), 'server');
});

test('a server error after a local miss is raised, as before', async () => {
  await assert.rejects(localFirst<string>(async () => null, async () => { throw new Error('boom'); }), /boom/);
});

test('a server error after a local hit is ignored', async () => {
  const answer = await localFirst(async () => 'local', async () => { throw new Error('offline'); }, () => assert.fail('no answer to pass on'));
  await tick();
  assert.equal(answer, 'local');
});
