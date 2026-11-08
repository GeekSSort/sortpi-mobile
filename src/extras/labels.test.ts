import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clampCopies, labelsHtml } from './labels.ts';

test('copies are whole numbers from 0 to 200', () => {
  assert.equal(clampCopies(3.7), 3);
  assert.equal(clampCopies(-2), 0);
  assert.equal(clampCopies(9999), 200);
  assert.equal(clampCopies(Number.NaN), 0);
});

test('one label is printed per copy, in the chosen size, with shop words escaped', () => {
  const html = labelsHtml([{ name: 'Tea <b>', price: '1250', code: 'SKU-0000115', copies: 2 }, { name: 'Soap', price: '40', code: '', copies: 1 }], 'medium');
  assert.equal(html.split('class="l"').length - 1, 3);
  assert.match(html, /width:50mm;height:30mm/);
  assert.match(html, /Tea &lt;b&gt;/);
  assert.ok(!html.includes('<b>'));
  assert.match(html, /৳ 1,250/);
  assert.match(html, /<svg/);
});
