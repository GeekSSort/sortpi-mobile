import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bn } from './bn.ts';
import { defaultLang, interpolate, scaled, translate } from './translate.ts';

test('Bangla answers from the dictionary, English stays as written', () => {
  assert.equal(translate(bn, 'bn', 'Start selling'), 'বিক্রি শুরু করুন');
  assert.equal(translate(bn, 'en', 'Start selling'), 'Start selling');
});

test('a line with no Bangla falls back to English and is reported', () => {
  const seen: string[] = [];
  assert.equal(translate(bn, 'bn', 'A line nobody translated', undefined, (m) => seen.push(m)), 'A line nobody translated');
  assert.deepEqual(seen, ['A line nobody translated']);
});

test('slots are filled in both languages and left visible when a value is missing', () => {
  assert.equal(translate(bn, 'bn', '{n} sales', { n: 3 }), '3টা বিক্রি');
  assert.equal(translate(bn, 'en', '{n} sales', { n: 3 }), '3 sales');
  assert.equal(interpolate('Hello {name}'), 'Hello {name}');
});

test('every Bangla line keeps the same slots as its English key', () => {
  const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  for (const [en, translated] of Object.entries(bn)) {
    assert.ok(translated.trim().length > 0, `empty Bangla for: ${en}`);
    assert.equal(slots(translated), slots(en), `slots differ for: ${en}`);
  }
});

test('a Bangla phone starts in Bangla, every other starts in English', () => {
  assert.equal(defaultLang('bn-BD'), 'bn');
  assert.equal(defaultLang('en-US'), 'en');
  assert.equal(defaultLang(undefined), 'en');
});

test('text sizes scale in steps', () => {
  assert.equal(scaled(16, 'normal'), 16);
  assert.equal(scaled(16, 'large'), 19.2);
  assert.equal(scaled(16, 'xlarge'), 22.4);
});
