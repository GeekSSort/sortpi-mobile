import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitToPaper, PAPERS, parsePaperPref } from './paper.ts';

test('a roll receipt is held to its real width, an A4 one is left alone', () => {
  assert.match(fitToPaper('<p>x</p>', '80mm'), /width:80mm/);
  assert.match(fitToPaper('<p>x</p>', '58mm'), /width:58mm/);
  assert.equal(fitToPaper('<p>x</p>', 'a4'), '<p>x</p>');
});

test('the papers are the real sizes', () => {
  assert.deepEqual(PAPERS.map((p) => p.mm[0]), [58, 80, 210]);
});

test('explicit sizes are preserved and unset or legacy preferences use 80 mm', () => {
  assert.equal(parsePaperPref('58mm'), '58mm');
  assert.equal(parsePaperPref('80mm'), '80mm');
  assert.equal(parsePaperPref('a4'), 'a4');
  assert.equal(parsePaperPref('ask'), '80mm');
  assert.equal(parsePaperPref(null), '80mm');
  assert.equal(parsePaperPref('letter'), '80mm');
});
