import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guideStep } from './guide.ts';

test('the guide follows the sale: add an item, take payment, choose how, done', () => {
  assert.equal(guideStep({ mode: 'scan', cartEmpty: true }), 1);
  assert.equal(guideStep({ mode: 'scan', cartEmpty: false }), 2);
  assert.equal(guideStep({ mode: 'pay', cartEmpty: false }), 3);
  assert.equal(guideStep({ mode: 'done', cartEmpty: false }), 'done');
});
