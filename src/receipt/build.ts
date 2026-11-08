// A sale, the shop's details and the shop's receipt settings -> the data the roll receipt draws. Mirrors the web's SaleReceipt
// (saas/client/src/components/modules/sales/SaleReceipt.tsx) so a phone and a computer print the same rows, in the same words.

import { formatBDT } from '../lib/money.ts';
import { METHOD_LABEL, saleState } from '../sales/logic.ts';
import { defaultBlocks, parseBlocks, parseLabels, SYSTEM_CREDIT } from './blocks.ts';
import { asReceiptLanguage } from './i18n.ts';
import { DEFAULT_RECEIPT_STYLE, readReceiptStyle, RECEIPT_ZOOM } from './style.ts';
import type { ReceiptData } from './slip.ts';

/** The parts of a sale the receipt reads (the phone's `Sale`). */
export type ReceiptSale = {
  invoice_number: string;
  sale_date: string;
  customer_name: string;
  customer_phone: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  grand_total: string;
  paid_amount: string;
  due_amount: string;
  status: string;
  refund_state: string;
  items: { product_name: string; sku?: string; unit_short_name?: string; quantity: string; unit_price: string; charged_total: string }[];
  payments: { payment_method: string; reference_no: string }[];
};

/** The shop's masthead: the company record (`/organizations/`). Tagline is the legal name field, as on the web. */
export type ReceiptShop = { name: string; legal_name?: string; address?: string; tax_number?: string; phone?: string; logo_url?: string; currency_symbol?: string };

const STATUS_WORD = { paid: 'Paid', due: 'Due', returned: 'Returned', cancelled: 'Cancelled' } as const;

/** "15-11-2026 8:25 PM", the way the web's invoice prints the date. */
export function receiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours() % 12 || 12;
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${h}:${p(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** A quantity without needless zeros: 2, 1.5, never 2.000. */
export const receiptQty = (q: string): string => String(Number(q));

export function buildReceipt(o: {
  sale: ReceiptSale;
  shop: ReceiptShop;
  /** The shop's settings as `key -> value`; null when the signed-in person may not read them (the built-in receipt is used). */
  settings: Record<string, unknown> | null;
  branchName?: string | null;
  paper?: '80mm' | '58mm';
  /** `sheet` is the A4 invoice, `slip` the roll receipt. */
  layout?: 'slip' | 'sheet';
}): ReceiptData {
  const { sale, shop } = o;
  const style = o.settings ? readReceiptStyle(o.settings) : DEFAULT_RECEIPT_STYLE;
  const paper = o.paper ?? style.paper;
  const money = (v: string) => `${shop.currency_symbol || '৳'} ${formatBDT(v, { symbol: false })}`;
  const allowPartial = o.settings ? String(o.settings['pos.allow_partial_payment']) === 'true' : false;
  const due = Number(sale.due_amount) > 0;
  const methods = [...new Set(sale.payments.map((p) => METHOD_LABEL[p.payment_method] ?? p.payment_method))].join(', ');
  const txn = sale.payments.find((p) => p.reference_no)?.reference_no;
  const status = STATUS_WORD[saleState(sale)];
  const walkIn = /^walk-?in/i.test(sale.customer_name.trim());

  const totals: ReceiptData['totals'] = [
    { label: 'Subtotal', value: money(sale.subtotal) },
    ...(Number(sale.discount_amount) > 0 ? [{ label: 'Discount', value: `-${money(sale.discount_amount)}` }] : []),
    ...(Number(sale.tax_amount) > 0 ? [{ label: 'VAT', value: money(sale.tax_amount) }] : []),
    { label: 'Total Amount', value: money(sale.grand_total), strong: true, ruleAbove: true },
    ...(allowPartial || due
      ? [{ label: 'Paid', value: money(sale.paid_amount), strong: true }, ...(due ? [{ label: 'Due', value: money(sale.due_amount), strong: true }] : []), { label: 'Status', value: status }]
      : [{ label: 'Net Payable', value: money(sale.grand_total), strong: true }, { label: 'Status', value: status }]),
  ];

  const layout = o.layout ?? 'slip';
  const blocks = (o.settings ? parseBlocks(layout === 'sheet' ? style.sheetBlocks : style.slipBlocks) : null) ?? defaultBlocks(layout, style);
  return {
    business: { name: shop.name, tagline: shop.legal_name || '', address: shop.address || '', bin: shop.tax_number || '', phone: shop.phone || '' },
    title: 'SALES INVOICE',
    meta: [
      { label: 'Invoice No', value: sale.invoice_number },
      { label: 'Date', value: receiptDate(sale.sale_date) },
      { label: 'Branch', value: o.branchName || '—' },
      { label: 'Payment', value: methods || '—' },
      ...(txn ? [{ label: 'Txn ID', value: txn }] : []),
    ],
    customer: { name: sale.customer_name, phone: walkIn ? '' : sale.customer_phone },
    items: sale.items.map((it) => ({ name: it.product_name, price: money(it.unit_price), qty: receiptQty(it.quantity), total: money(it.charged_total), code: it.sku || undefined, unit: it.unit_short_name || undefined })),
    totals,
    system: SYSTEM_CREDIT,
    blocks,
    labels: parseLabels(style.labels),
    vars: { shop: shop.name, days: style.returnDays, phone: shop.phone || '' },
    logoUrl: shop.logo_url || undefined,
    barcode: sale.invoice_number,
    paper,
    zoom: RECEIPT_ZOOM[style.fontSize],
    primary: asReceiptLanguage(o.settings?.['receipt.primary_language'], 'en'),
    secondary: asReceiptLanguage(o.settings?.['receipt.secondary_language'], ''),
  };
}
