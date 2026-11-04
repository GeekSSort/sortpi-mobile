import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildChecklist, countsToFetch } from './steps.ts';

const admin = ['product.create', 'product.view', 'sale.create', 'sale.view', 'user.create', 'user.view'];

test('a step shows only to someone who can do it', () => {
  const c = buildChecklist(['sale.create', 'sale.view_own'], {});
  assert.deepEqual(c.steps.map((s) => s.id), ['sale']);
});

test('done comes from what the server already holds', () => {
  const c = buildChecklist(admin, { product: 12, sale: 0, staff: 1 });
  assert.deepEqual(c.steps.map((s) => [s.id, s.done]), [['product', true], ['sale', false], ['staff', false]]); // staff: only the owner exists
  assert.equal(c.doneCount, 1);
  assert.equal(c.complete, false);
});

test('everything done completes the list; a second user counts as invited', () => {
  const c = buildChecklist(admin, { product: 1, sale: 3, staff: 2 });
  assert.equal(c.complete, true);
  assert.equal(c.total, 3);
});

test('without view permission a step cannot be proven done, and is not fetched', () => {
  const perms = ['product.create'];
  assert.equal(buildChecklist(perms, { product: 50 }).steps[0].done, false);
  assert.deepEqual(countsToFetch(perms), []);
  assert.deepEqual(countsToFetch(admin), ['product', 'sale', 'staff']);
});

test('a person with no setup permissions gets no checklist', () => {
  const c = buildChecklist(['report.sales'], {});
  assert.equal(c.total, 0);
  assert.equal(c.complete, false);
});
