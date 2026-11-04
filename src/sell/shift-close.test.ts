import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countedProblem, drawerVariance } from './shift-close.ts';

test('variance is counted minus expected', () => {
  assert.deepEqual(drawerVariance('1000', '1000.00'), { kind: 'exact', amount: '0' });
  assert.deepEqual(drawerVariance('950.50', '1000.00'), { kind: 'short', amount: '49.5' });
  assert.deepEqual(drawerVariance('1010', '1000.00'), { kind: 'over', amount: '10' });
  assert.equal(drawerVariance('', '1000'), null);
  assert.equal(drawerVariance('12.', '1000'), null);
});

test('an empty drawer is counted as 0, but a blank is refused', () => {
  assert.equal(countedProblem('0'), null);
  assert.match(countedProblem('') ?? '', /Count the cash/);
});
