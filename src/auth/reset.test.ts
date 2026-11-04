import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApiClient } from '../api/client.ts';
import { passwordChecks, requestResetCode, setNewPassword, validateNewPassword, verifyResetCode } from './reset.ts';

function recorder() {
  const calls: { path: string; method: string; body: unknown; headers: Record<string, string> }[] = [];
  const client = createApiClient({
    baseUrl: () => 'https://acme.example.com/api/v1',
    tokens: { get: async () => ({ access: 'SHOULD-NOT-BE-SENT', refresh: null }), set: async () => {}, clear: async () => {} },
    fetchImpl: async (url, init) => {
      const path = String(url).replace('https://acme.example.com/api/v1', '');
      calls.push({ path, method: String(init?.method), body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
      if (path === '/auth/forgot-password') return new Response(null, { status: 204 });
      if (path === '/auth/verify-code') return new Response(JSON.stringify({ success: true, data: { ticket: 'T-123' } }), { status: 200 });
      return new Response(JSON.stringify({ success: true, data: { redirectTo: null } }), { status: 200 });
    },
  });
  return { calls, client };
}

test('the three steps hit the right paths with the right bodies, anonymously', async () => {
  const { calls, client } = recorder();
  await requestResetCode(client, '  owner@acme.com ');
  const ticket = await verifyResetCode(client, 'owner@acme.com', ' 123456 ');
  await setNewPassword(client, ticket, 'a-new-password');

  assert.deepEqual(calls.map((c) => c.path), ['/auth/forgot-password', '/auth/verify-code', '/auth/set-password']);
  assert.deepEqual(calls[0].body, { email: 'owner@acme.com' });
  assert.deepEqual(calls[1].body, { email: 'owner@acme.com', code: '123456', purpose: 'reset' });
  assert.deepEqual(calls[2].body, { ticket: 'T-123', password: 'a-new-password', purpose: 'reset' });
  for (const c of calls) assert.equal(c.headers.Authorization, undefined); // no bearer token on reset calls
});

test('password check: length first, then match', () => {
  assert.match(validateNewPassword('short', 'short') ?? '', /at least 8/);
  assert.match(validateNewPassword('long-enough', 'different-one') ?? '', /do not match/);
  assert.equal(validateNewPassword('long-enough', 'long-enough'), null);
});

test('the password rules tick off as they are typed', () => {
  assert.deepEqual(passwordChecks('', ''), { long: false, match: false });
  assert.deepEqual(passwordChecks('short', 'short'), { long: false, match: true });
  assert.deepEqual(passwordChecks('long-enough', ''), { long: true, match: false });
  assert.deepEqual(passwordChecks('long-enough', 'long-enogh'), { long: true, match: false });
  assert.deepEqual(passwordChecks('long-enough', 'long-enough'), { long: true, match: true });
});
