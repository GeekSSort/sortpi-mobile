import assert from 'node:assert/strict';
import { test } from 'node:test';

import { productNameIn } from './intents.ts';
import { MODEL } from './model-spec.ts';
import { isComplete, megabytes, percent, spaceNeeded, startGate, stateFromDisk } from './model-state.ts';

test('the item name is what is left of the question', () => {
  assert.equal(productNameIn('coca cola dam koto'), 'coca cola');
  assert.equal(productNameIn('ajker bill koto'), '');
});

test('a download is blocked in the order a person can fix: memory, space, then data', () => {
  const ok = { freeBytes: 5e9, ramBytes: 8e9, onWifi: true, partialBytes: 0 };
  assert.equal(startGate(ok), 'ok');
  assert.equal(startGate({ ...ok, ramBytes: 2e9 }), 'low_memory');
  assert.equal(startGate({ ...ok, freeBytes: 1.2e9 }), 'no_space');
  assert.equal(startGate({ ...ok, onWifi: false }), 'mobile_data');
  assert.equal(startGate({ ...ok, ramBytes: null }), 'ok'); // unknown memory: let it try, loading still checks
  // a half-finished file needs only the rest
  assert.equal(startGate({ ...ok, freeBytes: 0.9e9, partialBytes: 600e6 }), 'ok');
  assert.ok(spaceNeeded(0) > MODEL.bytes);
});

test('only the exact published size counts as complete', () => {
  assert.equal(isComplete(MODEL.bytes), true);
  assert.equal(isComplete(MODEL.bytes - 1), false);
  assert.equal(isComplete(MODEL.bytes + 1), false);
  assert.deepEqual(stateFromDisk(null), { kind: 'absent' });
  assert.deepEqual(stateFromDisk(MODEL.bytes), { kind: 'ready' });
  assert.deepEqual(stateFromDisk(500), { kind: 'paused', received: 500 });
  assert.equal(stateFromDisk(MODEL.bytes + 5).kind, 'failed');
});

test('progress is whole percent and never past the ends', () => {
  assert.equal(percent(0), 0);
  assert.equal(percent(MODEL.bytes / 2), 50);
  assert.equal(percent(MODEL.bytes * 2), 100);
  assert.equal(megabytes(MODEL.bytes), 1107);
});
