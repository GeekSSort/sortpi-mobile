import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { canNest, categoryTree, createBody, describeCatalogError, emptyOnes, nameProblem, renameBody, type Row } from './manage.ts';

const r = (id: string, name: string, parent: string | null = null, n = 1): Row => ({ id, name, parent, product_count: n });

test('the tree lists each parent with its children under it, by name, with depth', () => {
  const tree = categoryTree([r('c', 'Zoo'), r('a2', 'Beta', 'a'), r('a', 'Alpha'), r('a1', 'Apple', 'a'), r('g', 'Gala', 'a1')]);
  assert.deepEqual(tree.map((t) => `${'-'.repeat(t.depth)}${t.name}`), ['Alpha', '-Apple', '--Gala', '-Beta', 'Zoo']);
  assert.equal(tree.find((t) => t.id === 'a')?.children, 2);
  assert.equal(tree.find((t) => t.id === 'g')?.children, 0);
});

test('a kind whose parent is not in the list is shown at the top, not lost', () => {
  assert.deepEqual(categoryTree([r('x', 'Lost', 'missing')]).map((t) => [t.name, t.depth]), [['Lost', 0]]);
});

test('kinds nest only above the third level', () => {
  assert.equal(canNest(0), true);
  assert.equal(canNest(1), true);
  assert.equal(canNest(2), false);
});

test('empty ones are those with no items and nothing inside', () => {
  const tree = categoryTree([r('a', 'Alpha', null, 0), r('b', 'Beta', 'a', 0), r('c', 'Cee', null, 0), r('d', 'Dee', null, 3)]);
  assert.deepEqual(emptyOnes(tree).map((t) => t.name), ['Beta', 'Cee']); // Alpha holds Beta, so it is not empty
});

test('a name is refused when empty or a repeat ignoring capitals, but not against itself', () => {
  const sibs = [{ id: '1', name: 'Dairy' }, { id: '2', name: 'Spices' }];
  assert.ok(nameProblem('category', '  ', sibs));
  assert.ok(nameProblem('category', 'dairy', sibs));
  assert.ok(nameProblem('brand', ' SPICES ', sibs));
  assert.equal(nameProblem('category', 'Dairy', sibs, '1'), null); // renaming to its own name (or only its capitals) is fine
  assert.equal(nameProblem('category', 'dairy', sibs, '1'), null);
  assert.equal(nameProblem('brand', 'Pran', sibs), null);
});

test('request bodies are trimmed and carry a parent only when there is one', () => {
  assert.deepEqual(createBody('  Dairy ', null), { name: 'Dairy' });
  assert.deepEqual(createBody('Cheese', 'p1'), { name: 'Cheese', parent: 'p1' });
  assert.deepEqual(renameBody(' X '), { name: 'X' });
});

test('refusals have plain sentences, with the number of items when the server gives it', () => {
  assert.deepEqual(describeCatalogError(new ApiError(409, 'CATEGORY_IN_USE', 'x', { products: 45 })), { text: '{n} items still use this. Move them to another one first.', n: 45 });
  assert.match(describeCatalogError(new ApiError(409, 'BRAND_IN_USE', 'x')).text, /still use this/);
  assert.match(describeCatalogError(new ApiError(409, 'CATEGORY_HAS_CHILDREN', 'x')).text, /inside this/);
  assert.match(describeCatalogError(new ApiError(400, 'CATEGORY_TOO_DEEP', 'x')).text, /three levels/);
  assert.equal(describeCatalogError(new ApiError(500, 'NEW', 'raw')).text, 'raw');
});
