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

import { toCartItem as cartItem, toCatalogItems as catalogItems } from './catalog-map.ts';

test('a catalogue item sold by serial number carries that into the cart line', () => {
  const items = catalogItems([{ id: 'p', name: 'Phone', track_serial: true, variants: [{ id: 'v', sku: 'PH1', name: 'Default', price: '9000', wholesale_price: null }] }, { id: 'q', name: 'Case', variants: [{ id: 'w', sku: 'CS1', name: 'Default', price: '200', wholesale_price: null }] }]);
  assert.equal(items[0].trackSerial, true);
  assert.equal(cartItem(items[0]).trackSerial, true);
  assert.equal('trackSerial' in items[1], false);
  assert.equal('trackSerial' in cartItem(items[1]), false);
});

const shot = (url: string, extra: Partial<NonNullable<CatalogProduct['images']>[number]> = {}) => ({ url, ...extra });
const withImages = (images: NonNullable<CatalogProduct['images']>): CatalogProduct => ({ ...cheese, images });
const photoOf = (p: CatalogProduct, sku: string) => toCatalogItems([p]).find((i) => i.sku === sku)?.image;

test('an item has no photo when the product has none, or none that is ready', () => {
  assert.equal(photoOf(cheese, 'S-1'), undefined);
  assert.equal(photoOf(withImages([shot('a.jpg', { status: 'PENDING' }), shot('b.jpg', { status: 'FAILED' })]), 'S-1'), undefined);
  assert.equal(photoOf(withImages([{ url: '', thumbnail_url: '' }]), 'S-1'), undefined);
});

test('the small thumbnail is used when the server gives one', () => {
  assert.equal(photoOf(withImages([shot('full.jpg', { thumbnail_url: 'thumb.jpg', is_primary: true })]), 'S-1'), 'thumb.jpg');
  assert.equal(photoOf(withImages([shot('full.jpg', { is_primary: true })]), 'S-1'), 'full.jpg');
});

test("a variant's own photo wins over the product's, and the primary one wins among them", () => {
  const images = [shot('any.jpg'), shot('product-primary.jpg', { is_primary: true }), shot('v1-other.jpg', { variant: 'v1' }), shot('v1-primary.jpg', { variant: 'v1', is_primary: true })];
  assert.equal(photoOf(withImages(images), 'S-1'), 'v1-primary.jpg');
  assert.equal(photoOf(withImages(images.slice(0, 3)), 'S-1'), 'v1-other.jpg');
  // another variant has no photo of its own: it takes the product's primary, then any product photo
  assert.equal(photoOf(withImages(images), 'S-2'), 'product-primary.jpg');
  assert.equal(photoOf(withImages([shot('any.jpg'), shot('v1.jpg', { variant: 'v1' })]), 'S-2'), 'any.jpg');
});

test('a photo that belongs to another variant is not borrowed when the product has none of its own', () => {
  assert.equal(photoOf(withImages([shot('v1.jpg', { variant: 'v1', is_primary: true })]), 'S-2'), undefined);
});
