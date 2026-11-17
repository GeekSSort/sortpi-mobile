import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitWithin, PHOTO_MAX_SIDE, PHOTO_QUALITY } from './photo-size.ts';

test('a big landscape photo is shrunk so its long side is 1280, keeping its shape', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1280, height: 960 });
  assert.deepEqual(fitWithin(8160, 6120), { width: 1280, height: 960 });
});

test('a big portrait photo is shrunk by its height', () => {
  assert.deepEqual(fitWithin(3000, 4000), { width: 960, height: 1280 });
});

test('a square photo', () => {
  assert.deepEqual(fitWithin(4000, 4000), { width: 1280, height: 1280 });
});

test('a photo that already fits is left at its size (null), and is never made bigger', () => {
  assert.equal(fitWithin(1280, 720), null);
  assert.equal(fitWithin(800, 600), null);
  assert.equal(fitWithin(1280, 1280), null);
});

test('a photo whose size is not known is not resized by guesswork', () => {
  assert.equal(fitWithin(undefined, 3000), null);
  assert.equal(fitWithin(4000, undefined), null);
  assert.equal(fitWithin(0, 0), null);
  assert.equal(fitWithin(Number.NaN, 3000), null);
});

test('a very thin photo keeps at least one pixel on its short side', () => {
  assert.deepEqual(fitWithin(100_000, 10), { width: 1280, height: 1 });
});

test('the limits are the ones the shop screens need', () => {
  assert.equal(PHOTO_MAX_SIDE, 1280);
  assert.ok(PHOTO_QUALITY > 0.5 && PHOTO_QUALITY < 0.9);
});
