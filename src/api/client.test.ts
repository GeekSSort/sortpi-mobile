import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError, createApiClient, type TokenStore } from './client.ts';

function memoryTokens(access: string | null, refresh: string | null): TokenStore & { state: { access: string | null; refresh: string | null } } {
  const state = { access, refresh };
  return {
    state,
    get: async () => ({ ...state }),
    set: async (a, r) => {
      state.access = a;
      if (r) state.refresh = r;
    },
    clear: async () => {
      state.access = null;
      state.refresh = null;
    },
  };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const BASE = 'https://acme.example.com/api/v1';

test('unwraps the envelope, sends headers and the path exactly as written', async () => {
  const seen: { url: string; headers: Record<string, string>; method: string }[] = [];
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens: memoryTokens('A1', 'R1'),
    fetchImpl: async (url, init) => {
      seen.push({ url: String(url), headers: init?.headers as Record<string, string>, method: String(init?.method) });
      return json(201, { success: true, data: { id: 's1', total: '5000.00' } });
    },
  });
  const sale = await client.post<{ id: string; total: string }>('/sales/sell/', { items: [] }, { idempotencyKey: 'key-1', branchId: 'b1' });
  assert.deepEqual(sale, { id: 's1', total: '5000.00' }); // money stays a string
  assert.equal(seen[0].url, `${BASE}/sales/sell/`);
  assert.equal(seen[0].headers.Authorization, 'Bearer A1');
  assert.equal(seen[0].headers['Idempotency-Key'], 'key-1');
  assert.equal(seen[0].headers['X-Branch'], 'b1');
});

test('error envelope becomes ApiError with code and request id', async () => {
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens: memoryTokens('A1', 'R1'),
    fetchImpl: async () => json(400, { success: false, message: 'Duplicate barcode', code: 'DUPLICATE_BARCODE', request_id: 'REQ-1', errors: {} }),
  });
  await assert.rejects(client.get('/products/'), (e: unknown) => e instanceof ApiError && e.code === 'DUPLICATE_BARCODE' && e.requestId === 'REQ-1' && e.status === 400);
});

test('a network failure is a NETWORK_ERROR, not a crash', async () => {
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens: memoryTokens('A1', 'R1'),
    fetchImpl: async () => {
      throw new TypeError('Network request failed');
    },
  });
  await assert.rejects(client.get('/auth/me'), (e: unknown) => e instanceof ApiError && e.code === 'NETWORK_ERROR');
});

test('TOKEN_EXPIRED refreshes once for many parallel calls, then retries each', async () => {
  const tokens = memoryTokens('OLD', 'R1');
  let refreshCalls = 0;
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens,
    fetchImpl: async (url, init) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { success: true, data: { access: 'NEW', refresh: 'R2' } });
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer NEW' ? json(200, { success: true, data: { ok: true } }) : json(401, { success: false, code: 'TOKEN_EXPIRED', message: 'expired' });
    },
  });
  const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);
  assert.equal(results.length, 3);
  assert.equal(refreshCalls, 1); // single-flight
  assert.equal(tokens.state.access, 'NEW');
  assert.equal(tokens.state.refresh, 'R2'); // rotated token stored
});

test('a rejected refresh (reuse detected) wipes tokens and ends the session', async () => {
  const tokens = memoryTokens('OLD', 'R1');
  let ended = 0;
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens,
    onSessionEnd: () => void (ended += 1),
    fetchImpl: async (url) =>
      String(url).endsWith('/auth/refresh')
        ? json(401, { success: false, code: 'REFRESH_TOKEN_REUSED', message: 'reused' })
        : json(401, { success: false, code: 'TOKEN_EXPIRED', message: 'expired' }),
  });
  await assert.rejects(client.get('/auth/me'), (e: unknown) => e instanceof ApiError && e.code === 'TOKEN_EXPIRED');
  assert.equal(tokens.state.access, null);
  assert.equal(tokens.state.refresh, null);
  assert.equal(ended, 1);
});

test('no workspace chosen is a clear error', async () => {
  const client = createApiClient({ baseUrl: () => null, tokens: memoryTokens(null, null), fetchImpl: async () => json(200, {}) });
  await assert.rejects(client.get('/auth/me'), (e: unknown) => e instanceof ApiError && e.code === 'NO_WORKSPACE');
});

test('a file goes as multipart with no JSON content type, so fetch can write the boundary', async () => {
  const seen: { headers: Record<string, string>; body: unknown }[] = [];
  const client = createApiClient({
    baseUrl: () => BASE,
    tokens: memoryTokens('A1', 'R1'),
    fetchImpl: async (_url, init) => {
      seen.push({ headers: init?.headers as Record<string, string>, body: init?.body });
      return json(200, { success: true, data: { ok: true } });
    },
  });
  const form = new FormData();
  form.append('note', 'x');
  assert.deepEqual(await client.postForm('/organizations/o1/logo/', form), { ok: true });
  assert.equal(seen[0].body, form);
  assert.equal(seen[0].headers['Content-Type'], undefined);
  assert.equal(seen[0].headers.Authorization, 'Bearer A1');
});

test('a plan refusal reaches screens in words a shopkeeper can act on', async () => {
  const client = createApiClient({ baseUrl: () => BASE, tokens: memoryTokens('A1', 'R1'), fetchImpl: async () => json(403, { success: false, code: 'PLAN_LIMIT_REACHED', message: "The organization is at its plan's product ceiling." }) });
  await assert.rejects(client.post('/products/', {}), (e: unknown) => e instanceof ApiError && e.code === 'PLAN_LIMIT_REACHED' && e.message === 'Your plan has reached its limit. Open “Your plan” to move up.');
});
