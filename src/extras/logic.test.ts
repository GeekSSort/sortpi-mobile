import assert from 'node:assert/strict';
import { test } from 'node:test';

import { giveProblem, parseSerials, productionBody, productionProblem, purities, validateMarkdown, validateRate } from './logic.ts';

test('serials are split, trimmed and de-duplicated', () => {
  assert.deepEqual(parseSerials(' A1,B2\nC3  A1 ;D4\t'), ['A1', 'B2', 'C3', 'D4']);
  assert.deepEqual(parseSerials('  '), []);
});

test('a metal rate needs a purity of that metal and a price per gram', () => {
  assert.deepEqual(purities('Silver'), ['999', '958', '925']);
  assert.deepEqual(validateRate({ metal: 'Gold', purity: '22K', rate: '9000' }), {});
  assert.ok(validateRate({ metal: 'Gold', purity: '925', rate: '9000' }).purity);
  assert.ok(validateRate({ metal: 'Gold', purity: '22K', rate: '0' }).rate);
});

test('a season markdown is a percent from 1 to 100', () => {
  assert.deepEqual(validateMarkdown({ season: 'Eid', percent: '30' }), {});
  assert.ok(validateMarkdown({ season: 'Eid', percent: '101' }).percent);
  assert.ok(validateMarkdown({ season: 'Eid', percent: '' }).percent);
});

test('giving free needs items with amounts', () => {
  assert.equal(giveProblem([]), 'Add at least one item.');
  assert.equal(giveProblem([{ variantId: 'v', quantity: '0' }]), 'Every item needs an amount above zero.');
  assert.equal(giveProblem([{ variantId: 'v', quantity: '2' }]), null);
});

test('production: ingredients or a cost for each; a combo needs contents', () => {
  const made = [{ variantId: 'cake', quantity: '10' }];
  assert.equal(productionProblem({ made, used: [], combo: false }), 'With no ingredients, type what each one made cost.');
  assert.equal(productionProblem({ made: [{ ...made[0], unitCost: '5' }], used: [], combo: false }), null);
  assert.equal(productionProblem({ made, used: [{ variantId: 'flour', quantity: '2' }], combo: false }), null);
  assert.equal(productionProblem({ made, used: [], combo: true }), 'Add what is in each pack.');
  assert.equal(productionProblem({ made: [], used: [], combo: true }), 'Pick the pack and say how many were made up.');
});

test('a combo pack uses its contents once per pack made', () => {
  const b = productionBody({ warehouseId: 'w', date: '2026-11-08', note: ' ', combo: true, made: [{ variantId: 'gift', quantity: '5' }], used: [{ variantId: 'soap', quantity: '2' }, { variantId: 'oil', quantity: '0.5' }] });
  assert.deepEqual(b.used, [{ variant_id: 'soap', quantity: '10' }, { variant_id: 'oil', quantity: '2.5' }]);
  assert.deepEqual(b.made, [{ variant_id: 'gift', quantity: '5' }]);
  const p = productionBody({ warehouseId: 'w', date: 'd', note: '', combo: false, made: [{ variantId: 'cake', quantity: '3', unitCost: '12' }], used: [] });
  assert.deepEqual(p.made, [{ variant_id: 'cake', quantity: '3', unit_cost: '12' }]);
});
