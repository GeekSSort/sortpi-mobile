import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tabletLayout, validTillQuantity } from './tablet-layout.ts';

test('the tablet understands all web POS settings and the old grid value', () => {
  for (const value of ['wall', 'express', 'touch', 'sheet']) assert.equal(tabletLayout(value), value);
  assert.equal(tabletLayout('grid'), 'express');
  assert.equal(tabletLayout('unknown'), undefined);
});

test('the quantity cell accepts only positive values with the item precision', () => {
  assert.equal(validTillQuantity('2', false), true);
  assert.equal(validTillQuantity('1.125', true), true);
  for (const value of ['', '0', '-1', '1.25', '1e6']) assert.equal(validTillQuantity(value, false), false);
  assert.equal(validTillQuantity('1.1250', true), false);
  assert.equal(validTillQuantity('9'.repeat(400), false), false);
});
