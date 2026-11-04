import { ApiError } from '../api/client.ts';
import { addMoney, compareMoney, mulMoney, parseMoney } from '../lib/money.ts';

export type PurchaseStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

/** Where an order stands, in the words a shop uses. DRAFT owes nothing; CONFIRMED is ordered (owed, nothing arrived yet). */
export const STATUS_WORDS: Record<PurchaseStatus, string> = { DRAFT: 'Not ordered yet', CONFIRMED: 'Ordered', PARTIAL: 'Part arrived', RECEIVED: 'All arrived', CANCELLED: 'Cancelled' };

export type StatusFilter = PurchaseStatus | 'ALL';

type Perms = string[] | undefined;
const has = (p: Perms, code: string) => !!p?.includes(code);
const owes = (due: string) => compareMoney(due, '0') > 0;

/** What a person may do next with an order, from its status and their permissions. The server decides again. */
export function nextSteps(p: { status: string; due_amount: string; adds_stock?: boolean }, perms: Perms) {
  const s = p.status;
  return {
    confirm: s === 'DRAFT' && has(perms, 'purchase.confirm'),
    receive: (s === 'CONFIRMED' || s === 'PARTIAL') && p.adds_stock !== false && has(perms, 'purchase.receive'),
    pay: (s === 'CONFIRMED' || s === 'PARTIAL' || s === 'RECEIVED') && owes(p.due_amount) && has(perms, 'purchase.payment'),
    cancel: (s === 'DRAFT' || s === 'CONFIRMED') && has(perms, 'purchase.delete'),
  };
}

export type Line = { variantId: string; name: string; sku: string; unitShort: string | null; allowDecimal: boolean; quantity: string; unitCost: string };

/** The same item scanned or picked twice is one line of more (the server refuses the same variant twice). */
export function addLine(lines: Line[], item: Omit<Line, 'quantity' | 'unitCost'> & { unitCost?: string }): Line[] {
  const at = lines.findIndex((l) => l.variantId === item.variantId);
  if (at >= 0) return lines.map((l, i) => (i === at ? { ...l, quantity: parseMoney(l.quantity).plus(1).toFixed() } : l));
  return [...lines, { ...item, quantity: '1', unitCost: item.unitCost ?? '' }];
}

export const isQty = (text: string, allowDecimal: boolean): boolean => (allowDecimal ? /^\d+(\.\d{1,3})?$/ : /^\d+$/).test(text.trim()) && Number(text) > 0;
export const isCost = (text: string): boolean => /^\d+(\.\d{1,4})?$/.test(text.trim()) && Number(text) > 0;

/** What is wrong with the order as typed, in plain words, or null. Checked before anything is sent. */
export function problems(o: { supplierId: string | null; lines: Line[] }): string | null {
  if (!o.supplierId) return 'Choose the supplier.';
  if (o.lines.length === 0) return 'Add at least one item.';
  const bad = o.lines.find((l) => !isQty(l.quantity, l.allowDecimal) || !isCost(l.unitCost));
  return bad ? 'Every item needs an amount and a price per piece.' : null;
}

/** VAT typed as a percentage (15) becomes the fraction the server wants (0.1500). Empty or zero is no VAT. */
export function vatFraction(pct: string): string | null {
  const t = pct.trim();
  if (!t || !/^\d+(\.\d{1,2})?$/.test(t) || Number(t) <= 0 || Number(t) > 100) return null;
  return parseMoney(t).div(100).toFixed(4);
}

/** A running estimate for the screen. Purchase tax is added on top of the cost. The server works out the real figures. */
export function estimate(lines: Line[], vatPct: string): { subtotal: string; tax: string; total: string } {
  const subtotal = lines.reduce((sum, l) => addMoney(sum, isCost(l.unitCost) && isQty(l.quantity, true) ? mulMoney(l.unitCost, l.quantity) : '0'), '0');
  const f = vatFraction(vatPct);
  const tax = f ? parseMoney(subtotal).times(f).round(2).toFixed() : '0';
  return { subtotal, tax, total: addMoney(subtotal, tax) };
}

export function purchaseBody(o: { supplierId: string; branchId: string; warehouseId: string; date: string; invoiceNo: string; note: string; vatPct: string; lines: Line[] }) {
  const f = vatFraction(o.vatPct);
  return {
    supplier: o.supplierId,
    branch: o.branchId,
    warehouse: o.warehouseId,
    purchase_date: o.date,
    ...(o.invoiceNo.trim() ? { supplier_invoice_no: o.invoiceNo.trim() } : {}),
    ...(o.note.trim() ? { note: o.note.trim() } : {}),
    items: o.lines.map((l) => ({ variant: l.variantId, quantity: l.quantity.trim(), unit_cost: l.unitCost.trim(), ...(f ? { tax_rate: f } : {}) })),
  };
}

/** Paying part or all of an order: more than nothing, never more than is still due. */
export function paymentProblem(amount: string, due: string): string | null {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) return 'Enter the amount you paid.';
  if (compareMoney(amount, due) > 0) return 'The amount is more than is still due on this order.';
  return null;
}

/** Words for the ways an order step can fail (codes from the server's registry). English keys, translated on screen. */
export function describePurchaseError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'PURCHASE_HAS_NO_LINES':
      return 'Add at least one item.';
    case 'INVALID_PURCHASE_QUANTITY':
      return 'An amount must be more than zero.';
    case 'PURCHASE_NOT_DRAFT':
      return 'This order was already placed.';
    case 'PURCHASE_NOT_RECEIVABLE':
      return 'This order cannot be received now. It may be already received, cancelled, or not placed yet.';
    case 'RECEIPT_EXCEEDS_ORDERED':
      return 'More arrived than was ordered.';
    case 'PURCHASE_NOT_CONFIRMED':
      return 'Place the order first. Nothing is owed on an order that is not placed.';
    case 'PURCHASE_CANCELLED':
      return 'This order was cancelled.';
    case 'PAYMENT_EXCEEDS_DUE':
      return 'The amount is more than is still due on this order.';
    case 'INVALID_PAYMENT_AMOUNT':
      return 'Enter the amount you paid.';
    case 'PURCHASE_ALREADY_RECEIVED':
      return 'Goods have already arrived, so it cannot be cancelled. Send them back instead.';
    case 'PURCHASE_ALREADY_CANCELLED':
      return 'This order is already cancelled.';
    case 'CROSS_ORGANIZATION':
      return 'That supplier or item is not in this shop.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'IDEMPOTENCY_KEY_REUSED':
    case 'REQUEST_IN_PROGRESS':
      return 'This is still being saved. Wait a moment and check before trying again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have been saved. Check the orders list before trying again.';
    default:
      return e.message || 'Could not save this.';
  }
}
