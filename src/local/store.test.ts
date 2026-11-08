import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { memoryDb } from './node-db.ts';
import { checkStock, rowsByFamily, toRows, type SnapshotItem } from './snapshot.ts';
import { findByCode, itemName, lowStock, openStore, publish, searchCustomers, searchItems, status, wipe } from './store.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/snapshot.json', import.meta.url), 'utf8')) as { items: SnapshotItem[]; stock: { variant_id: string; warehouse_id: string; quantity: string }[]; server_time: string };
const META = { owner: 'shop|u1|b1', serverTime: fixture.server_time, syncedAt: '2026-11-08T12:00:00Z' };

async function filled() {
  const db = memoryDb();
  await openStore(db);
  await publish(db, toRows(fixture.items), checkStock(fixture.stock), META);
  return db;
}

test('the downloaded pages become rows for every table', () => {
  const r = toRows(fixture.items);
  assert.equal(r.products.length, 4);
  assert.ok(r.variants.length >= 4);
  assert.ok(r.barcodes.length >= 1);
  assert.equal(r.customers.length, 3);
  assert.equal(r.present.length, 7);
  assert.equal(r.products[0].name_key, String(r.products[0].name).toLowerCase());
});

test('a copy with a missing page or a repeated row is refused', () => {
  const two: SnapshotItem[] = [{ path: '/brands/?page=1&limit=1', body: { data: [{ id: 'a', name: 'A' }], meta: { page: 1, limit: 1, total: 2, total_pages: 2 } } }];
  assert.throws(() => rowsByFamily(two), /missing a page/);
  const dup: SnapshotItem[] = [{ path: '/brands/?page=1&limit=10', body: { data: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }], meta: { page: 1, limit: 10, total: 2, total_pages: 1 } } }];
  assert.throws(() => rowsByFamily(dup), /repeated row/);
  const short: SnapshotItem[] = [{ path: '/brands/?page=1&limit=10', body: { data: [{ id: 'a', name: 'A' }], meta: { page: 1, limit: 10, total: 2, total_pages: 1 } } }];
  assert.throws(() => rowsByFamily(short), /incomplete/);
});

test('stock rows must look like the server\'s', () => {
  assert.equal(checkStock(fixture.stock).length, fixture.stock.length);
  assert.throws(() => checkStock([{ variant_id: 'v', warehouse_id: 'w', quantity: '12,5' }]));
  assert.throws(() => checkStock('nope'));
});

test('publish stores the shop and says whose it is and when', async () => {
  const db = await filled();
  const s = await status(db);
  assert.deepEqual([s.owner, s.syncedAt, s.products, s.customers], ['shop|u1|b1', '2026-11-08T12:00:00Z', 4, 3]);
});

test('a failed publish leaves the old copy as it was', async () => {
  const db = await filled();
  const bad = toRows(fixture.items);
  bad.products.push({ ...bad.products[0], id: null as unknown as string }); // a NOT NULL column fails halfway
  await assert.rejects(publish(db, bad, [], { ...META, owner: 'other' }));
  const s = await status(db);
  assert.equal(s.owner, 'shop|u1|b1');
  assert.equal(s.products, 4);
});

test('search finds by name, code and barcode, and the name that starts with it comes first', async () => {
  const db = await filled();
  const r = toRows(fixture.items);
  const p = r.products[0];
  const word = String(p.name).split(' ')[0].toLowerCase();
  const hits = await searchItems(db, word.toUpperCase());
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((h) => h.productId === p.id));
  const v = r.variants.find((x) => x.product_id === p.id)!;
  assert.ok((await searchItems(db, String(v.sku))).some((h) => h.variantId === v.id));
  const bc = r.barcodes[0];
  assert.equal((await findByCode(db, String(bc.code)))?.variantId, bc.variant_id);
  assert.equal(await findByCode(db, 'no-such-code'), null);
  assert.deepEqual(await searchItems(db, '   '), []);
  assert.deepEqual(await searchItems(db, '%'), []); // a percent sign is just a character
});

test('an item carries its stock across warehouses', async () => {
  const db = await filled();
  const sv = fixture.stock[0];
  const hit = await findByCode(db, (toRows(fixture.items).variants.find((v) => v.id === sv.variant_id)?.sku as string) ?? '');
  if (hit) assert.ok(Number(hit.stock) >= Number(sv.quantity) - 0.0001);
});

test('low stock lists items at or under their reorder level', async () => {
  const db = await filled();
  const first = (await searchItems(db, toRows(fixture.items).products[0].name as string))[0];
  await db.run('UPDATE products SET reorder_level = ? WHERE id = ?', ['100000', first.productId]);
  assert.ok((await lowStock(db)).some((i) => i.productId === first.productId));
  await db.run('UPDATE products SET reorder_level = ? WHERE id = ?', ['0', first.productId]);
  assert.ok(!(await lowStock(db)).some((i) => i.productId === first.productId));
});

test('customers are found by name, phone or code', async () => {
  const db = await filled();
  const c = toRows(fixture.items).customers[0];
  assert.ok((await searchCustomers(db, String(c.name).toUpperCase())).some((x) => x.id === c.id));
  if (c.phone) assert.ok((await searchCustomers(db, String(c.phone).slice(-5))).some((x) => x.id === c.id));
  assert.equal((await searchCustomers(db, '')).length, 3);
});

test('wipe forgets the shop', async () => {
  const db = await filled();
  await wipe(db);
  const s = await status(db);
  assert.deepEqual([s.owner, s.products, s.customers], [null, 0, 0]);
});

test('an older database is thrown away and made again', async () => {
  const db = await filled();
  await db.run("UPDATE meta SET value = '0' WHERE key = 'schema'");
  await openStore(db);
  assert.equal((await status(db)).products, 0);
});

test('item names follow the till\'s rule', () => {
  assert.equal(itemName('Rice', 'Default'), 'Rice');
  assert.equal(itemName('Cheese', '500g'), 'Cheese 500g');
  assert.equal(itemName('Tea', null), 'Tea');
});

import { toCatalogItem, toLookupResponse } from './map.ts';

test('a local item turns into the shapes the screens already use', async () => {
  const db = await filled();
  const first = (await searchItems(db, toRows(fixture.items).products[0].name as string))[0];
  const look = toLookupResponse(first);
  assert.equal(look.variant.id, first.variantId);
  assert.equal(look.product.name, first.productName);
  assert.equal(look.price, first.price ?? '0');
  const cat = toCatalogItem({ ...first, price: '100.0000', wholesale: '80.0000' }, true);
  assert.equal(cat.price, '80.0000');
  assert.equal(toCatalogItem({ ...first, price: '100.0000', wholesale: null }, true).price, '100.0000');
  assert.equal(toCatalogItem({ ...first, price: '100.0000', wholesale: '80.0000' }, false).price, '100.0000');
});
