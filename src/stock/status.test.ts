import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatQuantity, stockLevel } from './status.ts';

test('a line is out at zero, negative below, low at or under its reorder level', () => {
  assert.equal(stockLevel('0.000', '5.000'), 'out');
  assert.equal(stockLevel('-2.000', '5.000'), 'negative');
  assert.equal(stockLevel('5.000', '5.000'), 'low');
  assert.equal(stockLevel('6.000', '5.000'), 'in');
});

test('with no reorder level set a line is never low', () => {
  assert.equal(stockLevel('1.000', '0.000'), 'in');
});

test('quantities show whole for piece units and trimmed decimals for fractional ones', () => {
  assert.equal(formatQuantity('1180.000', false), '1,180');
  assert.equal(formatQuantity('2.500', true), '2.5');
  assert.equal(formatQuantity('3.000', true), '3');
  assert.equal(formatQuantity('2.500', null), '2.5'); // unit unknown: never cut a fraction off
});
