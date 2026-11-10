import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeSellError } from './messages.ts';

test('known sale errors read as instructions', () => {
  assert.match(describeSellError(new ApiError(400, 'INSUFFICIENT_STOCK', 'x')), /expired or held back/);
  assert.match(describeSellError(new ApiError(404, 'NO_OPEN_SHIFT', 'x')), /Open your shift/);
});

test('a dropped connection tells the cashier retrying is safe', () => {
  assert.match(describeSellError(new ApiError(0, 'NETWORK_ERROR', 'x')), /not charge twice/);
});

test('unknown codes keep the server message', () => {
  assert.equal(describeSellError(new ApiError(400, 'WEIRD', 'Server said no')), 'Server said no');
});

import { LOOKUP_FAILED_TITLE, NOT_IN_CATALOGUE_TITLE, notInCatalogueText } from './messages.ts';

test('an unknown barcode reads like the web till', () => {
  assert.equal(NOT_IN_CATALOGUE_TITLE, 'Not in the catalogue');
  assert.equal(LOOKUP_FAILED_TITLE, 'That scan could not be looked up');
  assert.deepEqual(notInCatalogueText(true, '123'), { text: 'The scanner read it cleanly — no product carries this barcode yet.' });
});

test('a typed code that is not found does not claim the scanner read it', () => {
  assert.deepEqual(notInCatalogueText(false, '8900'), { text: 'No product with the code “{code}”.', vars: { code: '8900' } });
});

import { ApiError as GiftApiError } from '../api/client.ts';
import { describeSellError as describeGift } from './messages.ts';

test('every gift card refusal has words a cashier can act on', () => {
  for (const code of ['GIFT_CARD_NOT_FOUND', 'GIFT_CARD_INACTIVE', 'GIFT_CARD_EXPIRED', 'GIFT_CARD_BALANCE', 'GIFT_CARD_SALE_CANCEL']) {
    const text = describeGift(new GiftApiError(400, code, 'raw server text'));
    assert.notEqual(text, 'Something went wrong. Try again.', code);
    assert.ok(!text.includes('raw server text'), code);
  }
});
