import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shiftLook } from './logic.ts';

test('a shift is open, even, short or over', () => {
  assert.equal(shiftLook({ status: 'OPEN', variance: null }), 'open');
  assert.equal(shiftLook({ status: 'CLOSED', variance: '0.0000' }), 'even');
  assert.equal(shiftLook({ status: 'CLOSED', variance: '-25.0000' }), 'short');
  assert.equal(shiftLook({ status: 'CLOSED', variance: '10.5000' }), 'over');
  assert.equal(shiftLook({ status: 'CLOSED', variance: null }), 'even');
});
