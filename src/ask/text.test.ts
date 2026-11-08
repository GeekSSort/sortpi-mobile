import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bnToLatin, editDistance, fold, normalizeText, skeleton } from './text.ts';

test('text is cleaned: digits, joiners, punctuation, case', () => {
  assert.equal(normalizeText('  ১৫০০ টাকা।  AJKER, bill?? '), '1500 টাকা ajker bill');
  assert.equal(normalizeText('য়'), 'য়'); // base + nukta becomes the single letter
  assert.equal(normalizeText('ক‍ত'), 'কত'); // joiners removed
});

test('Bangla script is written out in Latin letters', () => {
  assert.equal(bnToLatin('বিক্রি'), 'bikri');
  assert.equal(bnToLatin('পানি'), 'pani');
  assert.equal(skeleton('স্টক'), skeleton('stock'));
});

test('the same word in different spellings and scripts gets the same form', () => {
  const same = (...words: string[]) => {
    const forms = new Set(words.map(fold));
    assert.equal(forms.size, 1, `${words.join(' / ')} -> ${[...forms].join(' / ')}`);
  };
  same('koto', 'kata', 'kotoo', 'KOTO', 'কত');
  same('bikri', 'bikry', 'bikkri', 'বিক্রি');
  same('dam', 'dom', 'daam', 'দাম');
  same('pani', 'paani', 'পানি');
  same('baki', 'baaki', 'bakee', 'বাকি');
  same('stock', 'stok');
  same('bhalo', 'valo', 'balo', 'ভালো');
  same('ajker', 'ajkerr', 'আজকের');
  same('sesh', 'shesh', 'শেষ');
  same('coca cola', 'cocacola', 'kokakola', 'কোকাকোলা');
});

test('different words keep different forms', () => {
  for (const [a, b] of [['koto', 'kom'], ['dam', 'dor'], ['baki', 'bikri'], ['ase', 'sesh'], ['pani', 'chini']]) assert.notEqual(fold(a), fold(b), `${a} / ${b}`);
});

test('the skeleton survives dropped vowels', () => {
  assert.equal(skeleton('kto'), skeleton('koto'));
  assert.equal(skeleton('bil'), skeleton('bill'));
  assert.equal(skeleton('ajkr'), skeleton('ajker'));
});

test('edit distance', () => {
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(editDistance('', 'abc'), 3);
  assert.equal(editDistance('abc', 'abc'), 0);
});
