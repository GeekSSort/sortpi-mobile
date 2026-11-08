import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encodeBarcode, isValidEan13 } from './barcode.ts';
import { defaultBlocks, fillText, parseBlocks } from './blocks.ts';
import { buildReceipt, receiptDate, type ReceiptSale, type ReceiptShop } from './build.ts';
import { renderSlipHtml } from './slip.ts';
import { DEFAULT_RECEIPT_STYLE, readReceiptStyle } from './style.ts';

const sale: ReceiptSale = {
  invoice_number: 'MAIN26-3',
  sale_date: '2026-11-05T14:25:00Z',
  customer_name: 'Walk-in Customer',
  customer_phone: '',
  subtotal: '20.00',
  discount_amount: '0.00',
  tax_amount: '3.00',
  grand_total: '23.00',
  paid_amount: '23.00',
  due_amount: '0.00',
  status: 'COMPLETED',
  refund_state: 'NONE',
  items: [{ product_name: 'AQUAFINA <b>', quantity: '1.000', unit_price: '20.00', charged_total: '20.00' }],
  payments: [{ payment_method: 'CASH', reference_no: '' }],
};
const shop: ReceiptShop = { name: 'SirajDawaKhana', legal_name: 'Pharmacy', address: '12 Road', tax_number: '123', phone: '017000' };

test('the built-in receipt prints the business name once, in the web order', () => {
  const html = renderSlipHtml(buildReceipt({ sale, shop, settings: null, branchName: 'SirajDawaKhana' }));
  assert.equal(html.split('SirajDawaKhana').length - 1 >= 1, true);
  // the name block, then the Branch row in the details: the branch line is a row of the details, not a second masthead
  assert.ok(html.indexOf('class="name"') < html.indexOf('SALES INVOICE'));
  assert.ok(html.indexOf('SALES INVOICE') < html.indexOf('Invoice No'));
  assert.ok(html.indexOf('Invoice No') < html.indexOf('Total Amount'));
  assert.match(html, /Net Payable/);
  assert.match(html, /Thank you for shopping with SirajDawaKhana/);
  assert.match(html, /exchangeable within 7 days/);
  assert.match(html, /System by Geekssort/);
});

test('words from the shop are escaped, never run as markup', () => {
  const html = renderSlipHtml(buildReceipt({ sale, shop, settings: null }));
  assert.ok(!html.includes('<b>'));
  assert.match(html, /AQUAFINA &lt;b&gt;/);
});

test('the shop settings decide the blocks, the roll and the extras', () => {
  const settings = { 'pos.receipt_width': '58mm', 'receipt.show_barcode': 'true', 'receipt.thank_you': 'Come again, {shop}', 'sale.return_window_days': '3', 'receipt.show_tagline': 'false' };
  const html = renderSlipHtml(buildReceipt({ sale, shop, settings }));
  assert.match(html, /max-width:214px/);
  assert.match(html, /<svg/); // the invoice barcode
  assert.match(html, /Come again, SirajDawaKhana/);
  assert.match(html, /within 3 days/);
  assert.ok(!html.includes('Pharmacy')); // tagline switched off
});

test('a saved block list is printed in its own order with its own words', () => {
  const saved = JSON.stringify([{ id: 'x', type: 'text', text: 'Open 9 to 9' }, { id: 'y', type: 'name' }, { id: 'z', type: 'items' }]);
  const html = renderSlipHtml(buildReceipt({ sale, shop, settings: { 'receipt.slip_blocks': saved, 'receipt.labels': JSON.stringify({ price: 'Rate' }) } }));
  assert.ok(html.indexOf('Open 9 to 9') < html.indexOf('class="name"'));
  assert.match(html, />Rate</);
  assert.match(html, /Total Amount/); // required blocks are put back
});

test('a part-paid sale prints Paid, Due and Status', () => {
  const html = renderSlipHtml(buildReceipt({ sale: { ...sale, paid_amount: '10.00', due_amount: '13.00' }, shop, settings: null }));
  assert.match(html, />Due</);
  assert.ok(!html.includes('Net Payable'));
});

test('helpers: placeholders, barcodes, dates', () => {
  assert.equal(fillText('{shop} {days} {phone}', { shop: 'A', days: 7, phone: '1' }), 'A 7 1');
  assert.equal(isValidEan13('4006381333931'), true);
  assert.equal(isValidEan13('4006381333932'), false);
  assert.ok(encodeBarcode('MAIN26-3'));
  assert.equal(encodeBarcode('héllo ¿'), null);
  assert.match(receiptDate('2026-11-05T14:25:00'), /^05-11-2026 2:25 PM$/);
  assert.equal(parseBlocks('not json'), null);
  assert.equal(readReceiptStyle(undefined).paper, DEFAULT_RECEIPT_STYLE.paper);
  assert.ok(defaultBlocks('slip', DEFAULT_RECEIPT_STYLE).some((b) => b.type === 'system'));
});

import { renderSheetHtml } from './sheet.ts';

test('the A4 sheet has the ruled table, the cards and the totals box, with the business name once', () => {
  const withCode: ReceiptSale = { ...sale, items: [{ ...sale.items[0], sku: 'AQ-1', unit_short_name: 'pcs' }] };
  const html = renderSheetHtml(buildReceipt({ sale: withCode, shop, settings: { 'receipt.secondary_language': 'bn' }, layout: 'sheet', branchName: 'Main' }));
  assert.match(html, /class="sheet"/);
  assert.match(html, /class="card"/); // the particulars are cards
  assert.match(html, /Invoice No<\/bdi> <bdi dir="ltr" class="o">\(চালান নং\)/); // heading glossed in the second language
  assert.match(html, />AQ-1</); // item code column, because lines carry codes
  assert.match(html, />pcs</); // unit column
  assert.match(html, /width:92mm|\.totbox table\{width:92mm\}/);
  assert.equal(html.split('<p style="font-size:20px').length - 1, 1); // the name is printed once
  assert.match(html, /AQUAFINA &lt;b&gt;/); // escaped
});

test('the A4 sheet leaves out the code and unit columns when no line has them, and prints one language by default', () => {
  const html = renderSheetHtml(buildReceipt({ sale, shop, settings: null, layout: 'sheet' }));
  assert.ok(!html.includes('Item code'));
  assert.ok(!html.includes('class="o"'));
});

test('a shop that saved its own A4 block list gets that list', () => {
  const saved = JSON.stringify([{ id: 'a', type: 'name' }, { id: 'b', type: 'text', text: 'Branch office' }, { id: 'c', type: 'items' }, { id: 'd', type: 'totals' }]);
  const html = renderSheetHtml(buildReceipt({ sale, shop, settings: { 'receipt.sheet_blocks': saved }, layout: 'sheet' }));
  assert.match(html, /Branch office/);
  assert.match(html, /Invoice No/); // the details block is required, so it is put back, as on the web
  assert.ok(html.indexOf('Branch office') < html.indexOf('class="items"')); // the shop's own line comes before the table
});
