import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildNameIndex, resolveNames } from './resolve.ts';

const shop = buildNameIndex([
  { id: '1', name: 'Coca Cola 250ml' }, { id: '2', name: 'Akij Extra Water 1kg' }, { id: '3', name: 'Napa Extra 500mg' }, { id: '4', name: 'Teer Chinigura Rice 1 kg' },
  { id: '5', name: 'Paracetamol 500mg' }, { id: '6', name: 'Karim Uddin' }, { id: '7', name: 'Rahim Mia' }, { id: '8', name: 'জামদানি শাড়ি' },
]);
const top = (q: string) => resolveNames(shop, q)[0]?.item.name;

test('a name is found however it is spelt and in either script', () => {
  assert.equal(top('coca cola'), 'Coca Cola 250ml');
  assert.equal(top('cocacola'), 'Coca Cola 250ml');
  assert.equal(top('কোকাকোলা'), 'Coca Cola 250ml');
  assert.equal(top('koka kola'), 'Coca Cola 250ml');
  assert.equal(top('napa'), 'Napa Extra 500mg');
  assert.equal(top('নাপা'), 'Napa Extra 500mg');
  assert.equal(top('chinigura'), 'Teer Chinigura Rice 1 kg');
  assert.equal(top('chinigura chal'), 'Teer Chinigura Rice 1 kg');
  assert.equal(top('karim'), 'Karim Uddin');
  assert.equal(top('kareem'), 'Karim Uddin');
  assert.equal(top('করিম'), 'Karim Uddin');
  assert.equal(top('jamdani'), 'জামদানি শাড়ি');
  assert.equal(top('water'), 'Akij Extra Water 1kg');
  assert.equal(top('watar'), 'Akij Extra Water 1kg');
});

test('a word the shop does not have finds nothing, and too-short input finds nothing', () => {
  assert.deepEqual(resolveNames(shop, 'mosla'), []);
  assert.deepEqual(resolveNames(shop, 'zz'), []);
  assert.deepEqual(resolveNames(shop, ''), []);
});

test('the best match comes first and the list is capped', () => {
  const many = buildNameIndex(Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Water ${i}L` })));
  assert.equal(resolveNames(many, 'water').length, 5);
});
