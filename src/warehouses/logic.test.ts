import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanCode, typeWord } from './logic.ts';

test('codes are upper case, letters, digits and dashes', () => {
  assert.equal(cleanCode(' dhk main! '), 'DHKMAIN');
  assert.equal(cleanCode('wh-2'), 'WH-2');
});

test('types have shop words, unknown ones pass through', () => {
  assert.equal(typeWord('TRANSIT'), 'On the way');
  assert.equal(typeWord('OTHER'), 'OTHER');
});
