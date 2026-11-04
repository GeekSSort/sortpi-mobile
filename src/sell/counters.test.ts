import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultCounter, fromCounterRows } from './counters.ts';

const rows = [
  { id: 'c1', name: 'Counter 1', is_active: true, in_use_by: null },
  { id: 'c2', name: 'Counter 2', is_active: true, in_use_by: 'Rina' },
  { id: 'c3', name: 'Old', is_active: false, in_use_by: null },
];

test('switched-off counters are hidden and in-use ones keep who has them', () => {
  const c = fromCounterRows(rows);
  assert.deepEqual(c.map((x) => x.id), ['c1', 'c2']);
  assert.equal(c[1].inUseBy, 'Rina');
});

test('the last counter is chosen again if it is free', () => {
  const c = fromCounterRows([{ id: 'a', name: 'A', in_use_by: null }, { id: 'b', name: 'B', in_use_by: null }]);
  assert.equal(defaultCounter(c, 'b'), 'b');
  assert.equal(defaultCounter(c, null), null); // two free, cashier chooses
});

test('the only free counter is chosen; an in-use last counter is not', () => {
  const c = fromCounterRows(rows);
  assert.equal(defaultCounter(c, null), 'c1');
  assert.equal(defaultCounter(c, 'c2'), 'c1');
  assert.equal(defaultCounter([], null), null);
});
