import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isFresh, retryableUnlockError } from './unlock.ts';

test('retries when the system cancelled the prompt', () => {
  for (const e of ['system_cancel', 'app_cancel', 'unable_to_process']) assert.equal(retryableUnlockError(e), true);
});

test('never retries a real no', () => {
  for (const e of ['user_cancel', 'lockout', 'authentication_failed', 'not_enrolled', 'timeout', undefined]) {
    assert.equal(retryableUnlockError(e), false);
  }
});

test('a /auth/me answer is fresh for a minute', () => {
  assert.equal(isFresh(1_000, 1_000 + 59_000), true);
  assert.equal(isFresh(1_000, 1_000 + 61_000), false);
});
