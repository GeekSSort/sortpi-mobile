import assert from 'node:assert/strict';
import { test } from 'node:test';

import { showAskButton } from './fab-rules.ts';

test('the chat button shows on the main screens and hides where it would be in the way', () => {
  for (const p of ['/', '/stock', '/customers', '/more', '/reports', '/sales', '/sale/abc']) assert.equal(showAskButton(p), true, p);
  for (const p of ['/sell', '/ask', '/ask-model', '/lock', '/login', '/add-product', '/new-purchase', '/edit-purchase', '/price-check', '/end-shift']) assert.equal(showAskButton(p), false, p);
});
