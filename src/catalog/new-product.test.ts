import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { buildProductRequest, describeProductError, isPriceText, profitNote, validateNewProduct, type NewProductForm } from './new-product.ts';

const ok: NewProductForm = { barcode: ' 8901234567890 ', name: ' Coca-Cola 500ml ', categoryId: 'c1', unitId: 'u1', price: '45.50', sku: '', costPrice: '', wholesalePrice: '', mrp: '', reorderLevel: '' };

test('a complete form has no errors', () => {
  assert.deepEqual(validateNewProduct(ok), {});
});

test('missing name, category and unit are named', () => {
  const e = validateNewProduct({ ...ok, name: '  ', categoryId: '', unitId: '' });
  assert.deepEqual(Object.keys(e).sort(), ['categoryId', 'name', 'unitId']);
});

test('price is optional but must be a real amount when given', () => {
  assert.equal(validateNewProduct({ ...ok, price: '' }).price, undefined);
  assert.ok(validateNewProduct({ ...ok, price: '12,5' }).price);
  assert.ok(validateNewProduct({ ...ok, price: '-3' }).price);
  assert.equal(isPriceText('120'), true);
  assert.equal(isPriceText('120.5000'), true);
  assert.equal(isPriceText('120.50001'), false);
});

test('the request trims text and leaves out what was not filled in', () => {
  assert.deepEqual(buildProductRequest(ok), { name: 'Coca-Cola 500ml', category: 'c1', unit: 'u1', barcode: '8901234567890', price: '45.50' });
  const bare = buildProductRequest({ ...ok, barcode: '', price: '' });
  assert.equal('barcode' in bare, false);
  assert.equal('price' in bare, false);
  assert.equal('sku' in bare, false);
});

test('cost, wholesale, MRP and reorder level are checked when given and sent where the API wants them', () => {
  const e = validateNewProduct({ ...ok, costPrice: 'abc', wholesalePrice: '1,5', mrp: '-1', reorderLevel: '2.5555' });
  assert.deepEqual(Object.keys(e).sort(), ['costPrice', 'mrp', 'reorderLevel', 'wholesalePrice']);
  const body = buildProductRequest({ ...ok, sku: ' SKU-1 ', costPrice: '30', wholesalePrice: '40', mrp: '50', reorderLevel: '10' });
  assert.deepEqual(body, {
    name: 'Coca-Cola 500ml', category: 'c1', unit: 'u1', barcode: '8901234567890', price: '45.50', wholesale_price: '40', reorder_level: '10',
    variants: [{ name: 'Default', is_default: true, sku: 'SKU-1', cost_price: '30', mrp: '50' }],
  });
});

test('the profit note shows what is kept, and flags a price below cost', () => {
  assert.deepEqual(profitNote('30', '40'), { profit: '10', percent: '25.0', loss: false });
  assert.equal(profitNote('50', '40')?.loss, true);
  assert.equal(profitNote('', '40'), null);
  assert.equal(profitNote('30', '0'), null);
});

test('server refusals read as sentences', () => {
  assert.match(describeProductError(new ApiError(400, 'DUPLICATE_BARCODE', 'x')), /barcode/);
  assert.match(describeProductError(new ApiError(400, 'DUPLICATE_SKU', 'x')), /SKU/);
  assert.equal(describeProductError(new ApiError(400, 'VALIDATION_ERROR', 'x', { name: ['This field is required.'] })), 'name: This field is required.');
});
