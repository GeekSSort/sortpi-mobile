import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitToPaper, PAPERS } from './paper.ts';

test('a roll receipt is held to its real width, an A4 one is left alone', () => {
  assert.match(fitToPaper('<p>x</p>', '80mm'), /width:80mm/);
  assert.match(fitToPaper('<p>x</p>', '58mm'), /width:58mm/);
  assert.equal(fitToPaper('<p>x</p>', 'a4'), '<p>x</p>');
});

test('the papers are the real sizes', () => {
  assert.deepEqual(PAPERS.map((p) => p.mm[0]), [58, 80, 210]);
});

import { parsePaperPref } from './paper.ts';

test('the saved paper: a size prints at once, ask asks, anything else is "not chosen yet"', () => {
  assert.equal(parsePaperPref('80mm'), '80mm');
  assert.equal(parsePaperPref('a4'), 'a4');
  assert.equal(parsePaperPref('ask'), 'ask');
  assert.equal(parsePaperPref(null), null);
  assert.equal(parsePaperPref('letter'), null);
});
