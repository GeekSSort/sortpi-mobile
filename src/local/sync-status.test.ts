import assert from 'node:assert/strict';
import { test } from 'node:test';

import { minutesOld, SYNC_MAX_AGE_MS, syncLevel, SYNC_TEXT, type SyncInput } from './sync-status.ts';

const now = Date.parse('2026-11-17T06:00:00Z');
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const base: SyncInput = { allowed: true, syncing: false, error: null, offline: false, syncedAt: minutesAgo(1), now };

test('a recent copy is up to date; one at the limit is old', () => {
  assert.equal(syncLevel(base), 'fresh');
  assert.equal(syncLevel({ ...base, syncedAt: minutesAgo(9) }), 'fresh');
  assert.equal(syncLevel({ ...base, syncedAt: minutesAgo(10) }), 'stale');
  assert.equal(syncLevel({ ...base, syncedAt: minutesAgo(90) }), 'stale');
  assert.equal(SYNC_MAX_AGE_MS, 600_000);
});

test('no copy yet, or a time that cannot be read, is "none"', () => {
  assert.equal(syncLevel({ ...base, syncedAt: null }), 'none');
  assert.equal(syncLevel({ ...base, syncedAt: 'not a date' }), 'none');
});

test('nothing is shown when the server gives this person no copy, whatever else is true', () => {
  assert.equal(syncLevel({ ...base, allowed: false, syncing: true, error: 'x', offline: true }), 'off');
});

test('the worst news wins: syncing, then failed, then no connection, then age', () => {
  assert.equal(syncLevel({ ...base, syncing: true, error: 'x', offline: true }), 'syncing');
  assert.equal(syncLevel({ ...base, error: 'x', offline: true }), 'failed');
  assert.equal(syncLevel({ ...base, offline: true, syncedAt: minutesAgo(60) }), 'offline');
  assert.equal(syncLevel({ ...base, offline: true, syncedAt: null }), 'offline');
});

test('a time in the future (a clock set back) counts as fresh, not as a problem', () => {
  assert.equal(syncLevel({ ...base, syncedAt: minutesAgo(-5) }), 'fresh');
  assert.equal(minutesOld(minutesAgo(-5), now), 0);
});

test('minutes old is whole minutes, and null with no usable time', () => {
  assert.equal(minutesOld(minutesAgo(12), now), 12);
  assert.equal(minutesOld(new Date(now - 90_000).toISOString(), now), 1);
  assert.equal(minutesOld(null, now), null);
  assert.equal(minutesOld('nope', now), null);
});

test('every level that is shown has words, and only "stale" has a slot', () => {
  for (const [level, text] of Object.entries(SYNC_TEXT)) assert.equal(text.includes('{n}'), level === 'stale');
});
