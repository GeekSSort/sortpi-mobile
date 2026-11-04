import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeLogoError, logoProblem, MAX_LOGO_BYTES } from './logo.ts';

test('a picture of the right kind and size can go; the server judges what the phone cannot tell', () => {
  assert.equal(logoProblem({ uri: 'f', mimeType: 'image/png', fileSize: 1000 }), null);
  assert.equal(logoProblem({ uri: 'f', mimeType: 'IMAGE/JPEG', fileSize: MAX_LOGO_BYTES }), null);
  assert.equal(logoProblem({ uri: 'f' }), null);
  assert.equal(logoProblem({ uri: 'f', mimeType: 'image/png', fileSize: MAX_LOGO_BYTES + 1 }), 'That picture is too big. Pick one under 2 MB.');
  assert.equal(logoProblem({ uri: 'f', mimeType: 'image/svg+xml' }), 'Use a PNG, JPG, WEBP, GIF or AVIF picture.');
  assert.equal(logoProblem({ uri: 'f', mimeType: 'video/mp4' }), 'Use a PNG, JPG, WEBP, GIF or AVIF picture.');
});

test('the server refusals are said in words', () => {
  assert.equal(describeLogoError(new ApiError(400, 'LOGO_TOO_LARGE', 'x')), 'That picture is too big. Pick one under 2 MB.');
  assert.equal(describeLogoError(new ApiError(400, 'LOGO_NOT_AN_IMAGE', 'x')), 'Use a PNG, JPG, WEBP, GIF or AVIF picture.');
  assert.equal(describeLogoError(new ApiError(0, 'NETWORK_ERROR', 'x')), 'No connection. It was not saved. Try again.');
});

test('a server fault is not shown in its own English words', () => {
  assert.equal(describeLogoError(new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')), 'Something went wrong. Try again.');
});
