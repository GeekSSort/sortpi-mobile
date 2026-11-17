import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { NewProductForm } from '../catalog/new-product.ts';
import type { OutboxRow } from './outbox.ts';
import { sendProduct, type MadeProduct, type ProductJob, type SendDeps } from './send.ts';

const form = (over: Partial<NewProductForm> = {}): NewProductForm => ({
  barcode: '', name: 'Tea', categoryId: 'c1', unitId: 'u1', price: '8', sku: '', costPrice: '5', wholesalePrice: '', mrp: '', reorderLevel: '',
  openingStock: '3', variants: [], ...over,
});
const job = (over: Partial<ProductJob> = {}): ProductJob => ({ form: form(), branchId: 'b1', photo: null, name: 'Tea', ...over });
const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  id: 'r1', account: 'a', kind: 'product', payload: '{}', step: 0, product_id: null, made: null, stock_key: 'stock-key', state: 'pending', error: null,
  attempts: 0, created_at: 1000, next_try_at: 1000, ...over,
});
const made: MadeProduct = { id: 'p1', variants: [{ id: 'v1', name: 'Default' }] };

function fakes(over: Partial<SendDeps> = {}) {
  const calls: string[] = [];
  const saved: unknown[] = [];
  const d: SendDeps = {
    async create(_body, key) { calls.push(`create:${key}`); return made; },
    async findExisting() { calls.push('find'); return null; },
    async warehouse(b) { calls.push(`warehouse:${b}`); return 'w1'; },
    async stock(_body, key) { calls.push(`stock:${key}`); },
    async upload(id, photo) { calls.push(`upload:${id}:${photo.name}`); },
    async save(p) { saved.push(p); },
    ...over,
  };
  return { d, calls, saved };
}

test('a new item is made, its stock counted, its photo put on, and each step is written down', async () => {
  const { d, calls, saved } = fakes();
  await sendProduct(row(), job({ photo: { uri: 'file:///p.jpg', name: 'p.jpg', type: 'image/jpeg' } }), d);
  assert.deepEqual(calls, ['create:r1', 'warehouse:b1', 'stock:stock-key', 'upload:p1:p.jpg']);
  assert.deepEqual(saved, [{ step: 1, product_id: 'p1', made: JSON.stringify(made.variants) }, { step: 2 }, { step: 3 }]);
});

test('with no opening stock and no photo, only the item is made (no warehouse look-up, no stock call)', async () => {
  const { d, calls } = fakes();
  await sendProduct(row(), job({ form: form({ openingStock: '' }) }), d);
  assert.deepEqual(calls, ['create:r1']);
});

test('the item is made once: a retry of the stock carries on after the item and never makes it again', async () => {
  const { d, calls } = fakes();
  await sendProduct(row({ step: 1, product_id: 'p1', made: JSON.stringify(made.variants), attempts: 2 }), job(), d);
  assert.deepEqual(calls, ['warehouse:b1', 'stock:stock-key']);
});

test('the stock is counted once: a retry of the photo does not count it again', async () => {
  const { d, calls } = fakes();
  await sendProduct(row({ step: 2, product_id: 'p1', made: JSON.stringify(made.variants) }), job({ photo: { uri: 'u', name: 'p.jpg', type: 'image/jpeg' } }), d);
  assert.deepEqual(calls, ['upload:p1:p.jpg']);
});

test('after a try that may have got through, the server is asked for the item before another is made', async () => {
  const { d, calls } = fakes({ async findExisting() { calls.push('find'); return made; } });
  await sendProduct(row({ attempts: 1 }), job({ form: form({ openingStock: '' }) }), d);
  assert.deepEqual(calls, ['find'], 'found it, so it is not made a second time');
});

test('if the server has no such item after a failed try, it is made', async () => {
  const { d, calls } = fakes();
  await sendProduct(row({ attempts: 1 }), job({ form: form({ openingStock: '' }) }), d);
  assert.deepEqual(calls, ['find', 'create:r1']);
});

test('the first try does not ask the server for an existing item', async () => {
  const { d, calls } = fakes();
  await sendProduct(row({ attempts: 0 }), job({ form: form({ openingStock: '' }) }), d);
  assert.ok(!calls.includes('find'));
});

test('a failing step stops there, and what worked before it stays written down', async () => {
  const { d, saved } = fakes({ async stock() { throw new Error('boom'); } });
  await assert.rejects(sendProduct(row(), job(), d), /boom/);
  assert.deepEqual(saved, [{ step: 1, product_id: 'p1', made: JSON.stringify(made.variants) }], 'the item is saved as made; the stock step is not');
});

test('sizes and colours: each size\'s stock is counted against the variant the server made', async () => {
  const sized: MadeProduct = { id: 'p2', variants: [{ id: 'va', name: 'S' }, { id: 'vb', name: 'M' }] };
  let body: unknown;
  const { d } = fakes({ async create() { return sized; }, async stock(b) { body = b; } });
  const f = form({ openingStock: '', variants: [{ name: 'S', price: '8', cost: '5', opening: '2' }, { name: 'M', price: '9', cost: '6', opening: '4' }] });
  await sendProduct(row(), job({ form: f }), d);
  const items = (body as { items: { variant: string; new_quantity: string }[] }).items;
  assert.deepEqual(items.map((l) => [l.variant, l.new_quantity]), [['va', '2.000'], ['vb', '4.000']]);
});
