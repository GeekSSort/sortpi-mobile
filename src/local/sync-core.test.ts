import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import type { SnapshotItem } from './snapshot.ts';
import { downloadSnapshot, ownerKey, shouldSync, type Net } from './sync-core.ts';

const fx = JSON.parse(readFileSync(new URL('./fixtures/snapshot.json', import.meta.url), 'utf8')) as { items: SnapshotItem[]; stock: unknown[]; server_time: string };

/** A server that hands the fixture out two pages at a time. */
function server(over: Partial<Net> = {}, step = 3): Net {
  return {
    manifest: async () => ({ server_time: fx.server_time }),
    changes: async (_d, cursor) => {
      const from = cursor ? Number(cursor) : 0;
      const to = from + step;
      return { mode: 'snapshot', snapshot_id: 's1', items: fx.items.slice(from, to), cursor: to < fx.items.length ? String(to) : null, complete: to >= fx.items.length };
    },
    stock: async () => ({ items: fx.stock }),
    ...over,
  };
}

test('it follows the cursor to the end and checks everything', async () => {
  const d = await downloadSnapshot(server(), 'dev1');
  assert.equal(d.rows.products.length, 4);
  assert.equal(d.stock.length, fx.stock.length);
  assert.equal(d.serverTime, fx.server_time);
});

test('a cursor that repeats is refused', async () => {
  const loop = server({ changes: async () => ({ mode: 'snapshot', snapshot_id: 's1', items: [], cursor: '1', complete: false }) });
  await assert.rejects(downloadSnapshot(loop, 'd'), /repeated itself/);
});

test('a snapshot that changes under us is refused', async () => {
  let n = 0;
  const shifty = server({ changes: async () => ({ mode: 'snapshot', snapshot_id: `s${n++}`, items: [], cursor: String(n), complete: false }) });
  await assert.rejects(downloadSnapshot(shifty, 'd'), /changed while/);
});

test('a download that never says complete, or says it too early, is refused', async () => {
  await assert.rejects(downloadSnapshot(server({ changes: async () => ({ mode: 'snapshot', snapshot_id: 's', items: [], cursor: null, complete: false }) }), 'd'), /did not finish/);
  await assert.rejects(downloadSnapshot(server({ changes: async () => ({ mode: 'snapshot', snapshot_id: 's', items: [], cursor: '1', complete: true }) }), 'd'), /did not finish/);
  await assert.rejects(downloadSnapshot(server({ changes: async () => ({ mode: 'delta' as never, snapshot_id: 's', items: [], cursor: null, complete: true }) }), 'd'), /not in the form/);
});

test('a missing page or bad stock stops the whole download', async () => {
  const cut = server({ changes: async () => ({ mode: 'snapshot', snapshot_id: 's', items: [{ path: '/brands/?page=1&limit=1', body: { data: [{ id: 'a', name: 'A' }], meta: { page: 1, limit: 1, total: 2, total_pages: 2 } } }], cursor: null, complete: true }) });
  await assert.rejects(downloadSnapshot(cut, 'd'), /missing a page/);
  await assert.rejects(downloadSnapshot(server({ stock: async () => ({ items: [{ variant_id: 'v', warehouse_id: 'w', quantity: 'many' }] }) }), 'd'), /not valid/);
});

test('when to download again', () => {
  const mine = ownerKey('shop.sortpi.com', 'u1', 'b1');
  const now = Date.parse('2026-11-08T12:00:00Z');
  const ten = 10 * 60_000;
  assert.equal(shouldSync({ owner: null, syncedAt: null }, mine, now, ten, false), true);
  assert.equal(shouldSync({ owner: ownerKey('shop.sortpi.com', 'u2', 'b1'), syncedAt: '2026-11-08T11:59:00Z' }, mine, now, ten, false), true);
  assert.equal(shouldSync({ owner: mine, syncedAt: '2026-11-08T11:55:00Z' }, mine, now, ten, false), false);
  assert.equal(shouldSync({ owner: mine, syncedAt: '2026-11-08T11:40:00Z' }, mine, now, ten, false), true);
  assert.equal(shouldSync({ owner: mine, syncedAt: '2026-11-08T11:40:00Z' }, mine, now, ten, true), false);
});
