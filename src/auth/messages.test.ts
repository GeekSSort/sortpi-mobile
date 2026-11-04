import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeAuthError } from './messages.ts';

test('known codes read as sentences, unknown codes keep the server message', () => {
  assert.equal(describeAuthError(new ApiError(401, 'INVALID_CREDENTIALS', 'x')), 'Email or password is incorrect.');
  assert.match(describeAuthError(new ApiError(423, 'ACCOUNT_LOCKED', 'x')), /locked/);
  assert.match(describeAuthError(new ApiError(0, 'NETWORK_ERROR', 'x')), /No connection/);
  assert.match(describeAuthError(new ApiError(400, 'CODE_EXPIRED', 'x')), /expired/);
  assert.match(describeAuthError(new ApiError(0, 'WORKSPACE_UNREACHABLE', 'x')), /Check the name and your internet/);
  assert.equal(describeAuthError(new ApiError(500, 'WEIRD', 'Server said no')), 'Server said no');
  assert.equal(describeAuthError(new Error('boom')), 'Could not sign in. Please try again.');
});
