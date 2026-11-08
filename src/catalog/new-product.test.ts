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

import { openingStockBody } from './new-product.ts';

test('a brand and a generic name go with the item', () => {
  const body = buildProductRequest({ ...ok, brandId: 'b1', genericName: ' Paracetamol 500 mg ' });
  assert.equal(body.brand, 'b1');
  assert.equal(body.generic_name, 'Paracetamol 500 mg');
});

test('sizes make a VARIABLE item with every price on its own row, and nothing at the top', () => {
  const body = buildProductRequest({ ...ok, variants: [{ name: ' Small ', price: '100', cost: '60', opening: '' }, { name: 'Large', price: '', cost: '70', opening: '' }] });
  assert.equal((body as { type?: string }).type, 'VARIABLE');
  assert.equal('price' in body, false);
  assert.equal('barcode' in body, false);
  assert.deepEqual((body as { variants: unknown[] }).variants, [{ name: 'Small', is_default: true, cost_price: '60', selling_price: '100' }, { name: 'Large', is_default: false, cost_price: '70' }]);
});

test('sizes are checked: two at least, named, different, with real amounts and a cost for stock', () => {
  const r = (name: string, o: Partial<{ price: string; cost: string; opening: string }> = {}) => ({ name, price: '', cost: '', opening: '', ...o });
  assert.ok(validateNewProduct({ ...ok, variants: [r('Small')] }).variants);
  assert.ok(validateNewProduct({ ...ok, variants: [r('Small'), r(' ')] }).variants);
  assert.ok(validateNewProduct({ ...ok, variants: [r('Small'), r('small')] }).variants);
  assert.ok(validateNewProduct({ ...ok, variants: [r('S', { price: '1,5' }), r('L')] }).variants);
  assert.ok(validateNewProduct({ ...ok, variants: [r('S', { opening: '5' }), r('L')] }).variants);
  assert.equal(validateNewProduct({ ...ok, variants: [r('S', { opening: '5', cost: '20' }), r('L')] }).variants, undefined);
});

test('opening stock needs a cost, is one STOCK_IN adjustment, and expects an empty shelf', () => {
  assert.ok(validateNewProduct({ ...ok, openingStock: '10' }).openingStock);
  assert.equal(validateNewProduct({ ...ok, openingStock: '10', costPrice: '30' }).openingStock, undefined);
  const b = openingStockBody({ ...ok, openingStock: '10', costPrice: '30' }, [{ id: 'v1', name: 'Default' }], 'w1');
  assert.deepEqual(b, { warehouse: 'w1', reason: 'STOCK_IN', note: 'Opening stock for Coca-Cola 500ml', apply: true, expect_unchanged: true, items: [{ variant: 'v1', new_quantity: '10.000', expected_quantity: '0.000', unit_cost: '30' }] });
  assert.equal(openingStockBody({ ...ok, openingStock: '' }, [{ id: 'v1', name: 'Default' }], 'w1'), null);
});

test('with sizes, each size is counted onto its own variant by name', () => {
  const f = { ...ok, variants: [{ name: 'Small', price: '', cost: '60', opening: '4' }, { name: 'Large', price: '', cost: '70', opening: '' }, { name: 'XL', price: '', cost: '80', opening: '2' }] };
  const b = openingStockBody(f, [{ id: 'a', name: 'Small' }, { id: 'b', name: 'Large' }, { id: 'c', name: 'xl' }], 'w1');
  assert.deepEqual(b?.items.map((i) => [i.variant, i.new_quantity, i.unit_cost]), [['a', '4.000', '60'], ['c', '2.000', '80']]);
});
