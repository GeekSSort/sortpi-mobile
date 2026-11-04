import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeSellError } from './messages.ts';

test('known sale errors read as instructions', () => {
  assert.match(describeSellError(new ApiError(400, 'INSUFFICIENT_STOCK', 'x')), /Not enough stock/);
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
