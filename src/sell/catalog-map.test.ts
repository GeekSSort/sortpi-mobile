import assert from 'node:assert/strict';
import { test } from 'node:test';

import { itemName, stockLineToItem, toCartItem, toCatalogItems, type CatalogProduct } from './catalog-map.ts';

const cheese: CatalogProduct = {
  id: 'p1',
  name: 'ACI Extra Cheese',
  unit_short_name: 'pcs',
  unit_allow_decimal: false,
  variants: [
    { id: 'v1', sku: 'S-1', name: '500g', price: '491.6430', wholesale_price: null },
    { id: 'v2', sku: 'S-2', name: '1kg', price: '737.4600', wholesale_price: '700.0000', is_active: true },
    { id: 'v3', sku: 'S-3', name: '2kg', price: '983.2900', wholesale_price: null, is_active: false },
  ],
};

test('each active variant becomes its own tile, named with its size', () => {
  const items = toCatalogItems([cheese]);
  assert.deepEqual(items.map((i) => i.name), ['ACI Extra Cheese 500g', 'ACI Extra Cheese 1kg']);
});

test('a product with only the default variant keeps its plain name', () => {
  assert.equal(itemName('Rice', 'Default'), 'Rice');
  assert.equal(itemName('Rice', ''), 'Rice');
  assert.equal(itemName('Rice', 'Rice'), 'Rice');
  assert.equal(itemName('Tea', '2L'), 'Tea 2L');
});

test('a wholesale customer gets the wholesale price only where one is set', () => {
  const items = toCatalogItems([cheese], true);
  assert.equal(items[0].price, '491.6430');
  assert.equal(items[1].price, '700.0000');
});

test('an item sold by weight carries its unit into the cart, a piece item does not', () => {
  const rice: CatalogProduct = { id: 'p2', name: 'Rice', unit_short_name: 'kg', unit_allow_decimal: true, variants: [{ id: 'v9', sku: 'R-1', name: 'Default', price: '70.0000', wholesale_price: null }] };
  const line = toCartItem(toCatalogItems([rice])[0]);
  assert.equal(line.allowDecimal, true);
  assert.equal(line.unitShort, 'kg');
  assert.equal(line.unitId, null);
  const piece = toCartItem(toCatalogItems([cheese])[0]);
  assert.equal(piece.allowDecimal, undefined);
});

test('stock is left out for products that do not track it', () => {
  const svc: CatalogProduct = { id: 'p3', name: 'Delivery', track_inventory: false, variants: [{ id: 'v8', sku: 'D-1', name: 'Default', price: '30', wholesale_price: null, stock_on_hand: '0.000' }] };
  assert.equal(toCatalogItems([svc])[0].stock, null);
});

test('a stock line becomes an item with the branch price and what is on the shelf', () => {
  const it = stockLineToItem({ variant: 'v1', sku: 'S-1', product_name: 'Rice', variant_name: 'Default', price: '70.0000', available: '12.500', unit_short_name: 'kg', unit_allow_decimal: true });
  assert.deepEqual(it, { variantId: 'v1', sku: 'S-1', name: 'Rice', price: '70.0000', unitShort: 'kg', allowDecimal: true, stock: '12.500' });
});
