import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApiClient, type TokenStore } from '../api/client.ts';
import { isOffline, setReachable } from './connection.ts';

const tokens: TokenStore = { get: async () => ({ access: 'A', refresh: 'R' }), set: async () => {}, clear: async () => {} };

test('the first failed request marks the app offline, the next answer marks it back', async () => {
  let failing = true;
  const client = createApiClient({
    baseUrl: () => 'https://acme.example.com/api/v1',
    tokens,
    onReach: setReachable,
    fetchImpl: async () => {
      if (failing) throw new TypeError('Network request failed');
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  await assert.rejects(client.get('/products/'), { code: 'NETWORK_ERROR' });
  assert.equal(isOffline(), true);
  failing = false;
  await client.get('/products/');
  assert.equal(isOffline(), false);
});

test('an error answer from the server still counts as being connected', async () => {
  setReachable(false);
  const client = createApiClient({
    baseUrl: () => 'https://acme.example.com/api/v1',
    tokens,
    onReach: setReachable,
    fetchImpl: async () => new Response(JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'No' }), { status: 404, headers: { 'Content-Type': 'application/json' } }),
  });
  await assert.rejects(client.get('/products/x/'), { code: 'NOT_FOUND' });
  assert.equal(isOffline(), false);
});
