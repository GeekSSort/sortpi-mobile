import assert from 'node:assert/strict';
import { test } from 'node:test';

import { looksLikeCode, splitQuantity } from './code-input.ts';

test('barcodes, SKUs and label codes are codes; words and short numbers are not', () => {
  assert.equal(looksLikeCode('8901234567890'), true);
  assert.equal(looksLikeCode(' AQUAFINA-C8E828 '), true);
  assert.equal(looksLikeCode('SKU-0000115'), true);
  assert.equal(looksLikeCode('tea'), false);
  assert.equal(looksLikeCode('blue shirt 2'), false);
  assert.equal(looksLikeCode('500'), false);
  assert.equal(looksLikeCode(''), false);
});

test('3*milk and milk*3 add three; a lone number or a sum is not a shortcut', () => {
  assert.deepEqual(splitQuantity('3*milk'), { quantity: 3, text: 'milk' });
  assert.deepEqual(splitQuantity('milk*3'), { quantity: 3, text: 'milk' });
  assert.deepEqual(splitQuantity(' 12 * 8901234567890 '), { quantity: 12, text: '8901234567890' });
  assert.deepEqual(splitQuantity('0.5*rice'), { quantity: 0.5, text: 'rice' });
  assert.deepEqual(splitQuantity('milk'), { quantity: 1, text: 'milk' });
  assert.deepEqual(splitQuantity('2*2'), { quantity: 1, text: '2*2' });
  assert.deepEqual(splitQuantity('0*milk'), { quantity: 1, text: '0*milk' });
});
