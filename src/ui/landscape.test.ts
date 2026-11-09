import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isWideAndroidLandscape } from './landscape.ts';

test('only sufficiently wide and tall Android landscape windows use the desktop-style layout', () => {
  assert.equal(isWideAndroidLandscape('android', 1280, 800), true);
  assert.equal(isWideAndroidLandscape('android', 900, 480), true);
  assert.equal(isWideAndroidLandscape('android', 899, 480), false);
  assert.equal(isWideAndroidLandscape('android', 960, 420), false);
  assert.equal(isWideAndroidLandscape('android', 900, 1200), false);
  assert.equal(isWideAndroidLandscape('ios', 1280, 800), false);
});
