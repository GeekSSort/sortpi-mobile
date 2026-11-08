import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sameName } from './names.ts';

test('the same shop name is the same however it is typed', () => {
  assert.equal(sameName('SirajDawaKhana', ' sirajdawakhana '), true);
  assert.equal(sameName('SortPi Demo', 'Dhaka'), false);
  assert.equal(sameName(null, 'Dhaka'), false);
  assert.equal(sameName('', ''), false);
});
