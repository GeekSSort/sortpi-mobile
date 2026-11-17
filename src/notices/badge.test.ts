import assert from 'node:assert/strict';
import { test } from 'node:test';

import { badgeText } from './badge.ts';

test('no badge when nothing is unread, or the count is not known yet', () => {
  assert.equal(badgeText(0), null);
  assert.equal(badgeText(undefined), null);
  assert.equal(badgeText(null), null);
  assert.equal(badgeText(-3), null);
  assert.equal(badgeText(Number.NaN), null);
});

test('the count shows up to nine, then 9+', () => {
  assert.equal(badgeText(1), '1');
  assert.equal(badgeText(9), '9');
  assert.equal(badgeText(10), '9+');
  assert.equal(badgeText(250), '9+');
});
