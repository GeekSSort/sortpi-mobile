import assert from 'node:assert/strict';
import { test } from 'node:test';

import { percentWord, refillLook, validateGroup, whatsappLink } from './logic.ts';

test('WhatsApp links add the country code and drop the leading zero', () => {
  assert.equal(whatsappLink('01712345678', 'Hi there'), 'https://wa.me/8801712345678?text=Hi%20there');
  assert.equal(whatsappLink('+880 1712-345678', 'x'), 'https://wa.me/8801712345678?text=x');
  assert.equal(whatsappLink('0088017123456789', 'x')?.startsWith('https://wa.me/8801712'), true);
  assert.equal(whatsappLink('12345', 'x'), null);
  assert.equal(whatsappLink('', 'x'), null);
});

test('a refill is told, late, due today or coming', () => {
  assert.equal(refillLook({ days_left: -2, contacted_at: null }), 'late');
  assert.equal(refillLook({ days_left: 0, contacted_at: null }), 'today');
  assert.equal(refillLook({ days_left: 4, contacted_at: null }), 'soon');
  assert.equal(refillLook({ days_left: -2, contacted_at: '2026-11-08' }), 'told');
});

test('a price group needs a name and a percent from 1 to 100', () => {
  assert.deepEqual(Object.keys(validateGroup({ name: ' ', percent: '0' })).sort(), ['name', 'percent']);
  assert.ok(validateGroup({ name: 'Schools', percent: '101' }).percent);
  assert.deepEqual(validateGroup({ name: 'Schools', percent: '7.5' }), {});
  assert.equal(percentWord('10.0000'), '10%');
});
