import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isWalkIn, walkInBody } from './walk-in.ts';

test('the walk-in record is found by code or by name, in any letter case', () => {
  assert.equal(isWalkIn({ code: 'cus-walkin' }), true);
  assert.equal(isWalkIn({ code: 'C-0001', name: '  walk-in customer ' }), true);
  assert.equal(isWalkIn({ code: 'C-0002', name: 'Rahim Store' }), false);
  assert.equal(isWalkIn({}), false);
});

test('the record made for a new shop matches the one the web makes', () => {
  assert.deepEqual(walkInBody(), { code: 'CUS-WALKIN', name: 'Walk-in Customer', phone: '', customer_type: 'RETAIL' });
  assert.equal(isWalkIn(walkInBody()), true);
});
