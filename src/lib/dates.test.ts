import assert from 'node:assert/strict';
import { test } from 'node:test';

import { localDateISO } from './dates.ts';

test('the date is the local calendar day, padded', () => {
  assert.equal(localDateISO(new Date(2026, 10, 4, 23, 59)), '2026-11-04'); // 11:59 pm on 4 Nov, whatever the time zone
  assert.equal(localDateISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});
