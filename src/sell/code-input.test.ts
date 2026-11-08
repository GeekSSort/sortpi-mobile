import assert from 'node:assert/strict';
import { test } from 'node:test';

import { looksLikeCode } from './code-input.ts';

test('barcodes, SKUs and label codes are codes; words and short numbers are not', () => {
  assert.equal(looksLikeCode('8901234567890'), true);
  assert.equal(looksLikeCode(' AQUAFINA-C8E828 '), true);
  assert.equal(looksLikeCode('SKU-0000115'), true);
  assert.equal(looksLikeCode('tea'), false);
  assert.equal(looksLikeCode('blue shirt 2'), false);
  assert.equal(looksLikeCode('500'), false);
  assert.equal(looksLikeCode(''), false);
});
