import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shareMessage, shopNameOf, workspaceDisplayName } from './workspace.ts';

test('names a workspace from its address', () => {
  assert.equal(workspaceDisplayName('https://acme-traders.sortpi.com/api/v1'), 'Acme Traders');
  assert.equal(workspaceDisplayName('https://markaz.sortpi.com/api/v1'), 'Markaz');
});

test('development addresses are shown as they are', () => {
  assert.equal(workspaceDisplayName('http://localhost:8010/api/v1'), 'localhost:8010');
  assert.equal(workspaceDisplayName('http://192.168.0.207:8010/api/v1'), '192.168.0.207:8010');
});

test('nothing chosen, or junk, gives an empty name', () => {
  assert.equal(workspaceDisplayName(null), '');
  assert.equal(workspaceDisplayName('not a url'), '');
});

test('the shop name is the part before the platform domain; a development address has none', () => {
  assert.equal(shopNameOf('https://acme-traders.sortpi.com/api/v1', 'sortpi.com'), 'acme-traders');
  assert.equal(shopNameOf('https://sortpi.com/api/v1', 'sortpi.com'), null);
  assert.equal(shopNameOf('http://localhost:8010/api/v1', 'sortpi.com'), null);
  assert.equal(shopNameOf('https://acme.other.com/api/v1', 'sortpi.com'), null);
  assert.equal(shopNameOf(null, 'sortpi.com'), null);
  assert.equal(shopNameOf('not a url', 'sortpi.com'), null);
});

test('the message an owner shares names the shop and its web address', () => {
  assert.deepEqual(shareMessage('acme-traders', 'sortpi.com'), { name: 'acme-traders', host: 'acme-traders.sortpi.com' });
});
