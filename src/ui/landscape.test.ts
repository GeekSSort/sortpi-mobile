import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isDesktopShell, isWideAndroidLandscape, shellSidebarWidth } from './landscape.ts';

test('only sufficiently wide and tall Android landscape windows use the desktop-style layout', () => {
  assert.equal(isWideAndroidLandscape('android', 1280, 800), true);
  assert.equal(isWideAndroidLandscape('android', 900, 480), true);
  assert.equal(isWideAndroidLandscape('android', 899, 480), false);
  assert.equal(isWideAndroidLandscape('android', 960, 420), false);
  assert.equal(isWideAndroidLandscape('android', 900, 1200), false);
  assert.equal(isWideAndroidLandscape('ios', 1280, 800), false);
});

test('the side menu stays open on tablets held sideways, not on phones or portrait', () => {
  assert.equal(isDesktopShell('android', 1920, 1080), true);
  assert.equal(isDesktopShell('android', 960, 600), true);
  assert.equal(isDesktopShell('android', 899, 600), false);
  assert.equal(isDesktopShell('android', 800, 1280), false);
  assert.equal(isDesktopShell('android', 915, 412), false);
  assert.equal(isDesktopShell('ios', 1920, 1080), false);
});

test('the open menu is narrower on a small tablet', () => {
  assert.equal(shellSidebarWidth(960), 232);
  assert.equal(shellSidebarWidth(1280), 264);
});
