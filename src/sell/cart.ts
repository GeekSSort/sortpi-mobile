import { addMoney, isZeroMoney, mulMoney, parseMoney, subMoney, type Money } from '../lib/money.ts';

/**
 * The sale being rung up. Pure logic: no React, no network, so it is unit-tested.
 *
 * Prices in here come from the barcode lookup and are only for showing the cashier a running estimate.
 * `POST /sales/sell/` ignores any price, total or tax the client sends and prices the sale itself, so
 * the real total comes from the server (`/quotations/preview/` before paying, the sale response after).
 */
export type CartLine = {
  /** variant + selling unit: the same carton scanned twice is one line of two. */
  key: string;
  variantId: string;
  unitId: string | null;
  name: string;
  sku: string;
  /** "Carton", "Box"... when a unit's own barcode was scanned. */
  unitLabel: string | null;
  unitPrice: Money;
  /** Decimal string; whole numbers from the stepper, parts of a unit (1.5 kg) typed or picked for items sold by weight. */
  quantity: string;
  /** True when the unit may be sold in parts (kg, litre). Absent means whole units only. */
  allowDecimal?: boolean;
  /** "kg", "pcs": printed after the number so 1.5 reads as 1.5 kg. */
  unitShort?: string;
  /** Sold by serial number (a phone's IMEI): one number per unit goes with the sale. */
  trackSerial?: boolean;
  /** A price agreed for this line, instead of the shelf price. The server takes it (with the right to change prices) and never above the printed MRP. */
  priceSet?: Money;
  /** Taka taken off this line's total (the right to give a discount). */
  lineDiscount?: Money;
};

export type Cart = CartLine[];

export type ScannedItem = Omit<CartLine, 'key' | 'quantity'>;

export const lineKey = (variantId: string, unitId: string | null) => `${variantId}|${unitId ?? ''}`;

/** Scanning an item already in the cart adds one to its line instead of making a second line. */
export function addItem(cart: Cart, item: ScannedItem): Cart {
  const key = lineKey(item.variantId, item.unitId);
  if (cart.some((l) => l.key === key)) {
    return cart.map((l) => (l.key === key ? { ...l, quantity: addMoney(l.quantity, '1') } : l));
  }
  return [...cart, { ...item, key, quantity: '1' }];
}

/** How many of this item are already in the cart (a decimal string), or null when it is not there yet. */
export function lastQuantity(cart: Cart, item: Pick<ScannedItem, 'variantId' | 'unitId'>): string | null {
  const key = lineKey(item.variantId, item.unitId);
  return cart.find((l) => l.key === key)?.quantity ?? null;
}

/** A quantity of zero or less removes the line. */
export function setQuantity(cart: Cart, key: string, quantity: string): Cart {
  if (parseMoney(quantity).lte(0)) return cart.filter((l) => l.key !== key);
  return cart.map((l) => (l.key === key ? { ...l, quantity } : l));
}

export const changeQuantity = (cart: Cart, key: string, by: number): Cart => {
  const line = cart.find((l) => l.key === key);
  return line ? setQuantity(cart, key, by >= 0 ? addMoney(line.quantity, String(by)) : subMoney(line.quantity, String(-by))) : cart;
};

export const removeLine = (cart: Cart, key: string): Cart => cart.filter((l) => l.key !== key);

/** The price this line is sold at: the one agreed for it, or the shelf price. */
export const linePrice = (line: CartLine): Money => line.priceSet ?? line.unitPrice;

/** What the line comes to on the phone's own sums: price times quantity, less the line's discount (never below nothing). */
export function lineEstimate(line: CartLine): Money {
  const gross = mulMoney(linePrice(line), line.quantity);
  if (!line.lineDiscount) return gross;
  const net = subMoney(gross, line.lineDiscount);
  return parseMoney(net).lt(0) ? '0' : net;
}

/** Sets or, with null, clears the agreed price of one line. */
export const setLinePrice = (cart: Cart, key: string, price: Money | null): Cart => cart.map((l) => (l.key === key ? { ...l, priceSet: price ?? undefined } : l));
/** Sets or, with null, clears the taka taken off one line. */
export const setLineDiscount = (cart: Cart, key: string, amount: Money | null): Cart => cart.map((l) => (l.key === key ? { ...l, lineDiscount: amount ?? undefined } : l));

/** Whether what was typed can be a price (digits, up to 2 places). Returns the reason in words when it cannot. */
export const linePriceProblem = (typed: string): string | null => (/^\d{1,9}(\.\d{1,2})?$/.test(typed.trim()) ? null : 'Type a price like 450 or 449.50.');
/** Whether what was typed can be a line discount: an amount above 0 and not more than the line comes to. */
export function lineDiscountProblem(typed: string, lineTotal: Money): string | null {
  const v = typed.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v) || !parseMoney(v).gt(0)) return 'Type a discount above 0, like 10 or 12.50.';
  return parseMoney(v).gt(parseMoney(lineTotal)) ? 'That is more than the line comes to.' : null;
}

/** The item fields a sale or a preview carries for one line: what was agreed for the price and the discount, nothing else the server works out. */
const lineExtras = (l: CartLine) => ({ ...(l.priceSet ? { unit_price: parseMoney(l.priceSet).toFixed(4) } : {}), ...(l.lineDiscount ? { discount_amount: parseMoney(l.lineDiscount).toFixed(2) } : {}) });

/** Sum of the lines' scanned prices. An estimate: tax and discounts are the server's business. */
export const estimateSubtotal = (cart: Cart): Money => cart.reduce((sum, l) => addMoney(sum, lineEstimate(l)), '0');

export const itemCount = (cart: Cart): number => cart.reduce((n, l) => n + Number(parseMoney(l.quantity).round(0, 3).toFixed(0)), 0);

export const isEmpty = (cart: Cart) => cart.length === 0 || cart.every((l) => isZeroMoney(l.quantity));

/** The server wants quantities as 3-decimal strings (`"2.000"`). */
export const qtyText = (q: string): string => parseMoney(q).toFixed(3);

/** A discount on the whole order, as the cashier typed it: a percent of the bill or a fixed amount. The server applies it and says what it came to. */
export type OrderDiscount = { kind: 'PCT' | 'AMT'; value: string };
export type SellContext = { customerId: string; warehouseId: string; branchId: string; shiftId?: string; wholesale?: boolean; couponCode?: string; redeemPoints?: number; orderDiscount?: OrderDiscount | null; shipping?: Money };

/** The discount's request fields. The server takes a percent as a fraction (10 % is 0.1), so 10 typed is sent as "0.1000". */
export function discountFields(d: OrderDiscount | null | undefined): { discount_percent?: string; discount_amount?: string } {
  if (!d) return {};
  const v = parseMoney(d.value);
  if (!v.gt(0)) return {};
  return d.kind === 'PCT' ? { discount_percent: v.div(100).toFixed(4) } : { discount_amount: v.toFixed(2) };
}

/** Delivery or shipping charged on top of the goods. The server adds it, untaxed, to the sale's total (checked: 146.66 + 20 = 166.66). */
export const shippingFields = (shipping: Money | undefined): { extra_charge_amount?: string; extra_charge_reason?: string } =>
  shipping && parseMoney(shipping).gt(0) ? { extra_charge_amount: parseMoney(shipping).toFixed(2), extra_charge_reason: 'Shipping' } : {};

/** Whether what was typed can be a shipping charge: an amount, up to 2 places. Blank means none. */
export const shippingProblem = (typed: string): string | null => (typed.trim() === '' || /^\d{1,9}(\.\d{1,2})?$/.test(typed.trim()) ? null : 'Type the shipping like 60 or 60.50.');

/** Whether what was typed can be a discount: a percent above 0 up to 100, or an amount above 0. Returns the reason in words when it cannot. */
export function discountProblem(kind: OrderDiscount['kind'], typed: string): string | null {
  const v = typed.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v) || !parseMoney(v).gt(0)) return 'Type a discount above 0, like 10 or 12.5.';
  if (kind === 'PCT' && parseMoney(v).gt(100)) return 'A percent cannot be more than 100.';
  return null;
}
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK' | 'MOBILE' | 'GIFT_CARD';
export type PaymentInput = { payment_method: PaymentMethod; amount: Money; reference_no?: string };

/** Body for POST /sales/sell/. No price, total, tax or discount: the server computes those. */
export function buildSellRequest(ctx: SellContext, cart: Cart, payments: PaymentInput[], serials?: Record<string, string[]>) {
  return {
    customer_id: ctx.customerId,
    warehouse_id: ctx.warehouseId,
    branch_id: ctx.branchId,
    ...(ctx.shiftId ? { shift_id: ctx.shiftId } : {}),
    ...(ctx.wholesale ? { price_mode: 'WHOLESALE' as const } : {}),
    ...(ctx.couponCode ? { coupon_code: ctx.couponCode } : {}),
    ...(ctx.redeemPoints ? { redeem_points: ctx.redeemPoints } : {}),
    ...discountFields(ctx.orderDiscount),
    ...shippingFields(ctx.shipping),
    items: cart.map((l) => ({ variant_id: l.variantId, quantity: qtyText(l.quantity), ...(l.unitId ? { unit_id: l.unitId } : {}), ...lineExtras(l), ...(serials?.[l.key]?.length ? { serials: serials[l.key] } : {}) })),
    payments,
  };
}

/** Body for POST /quotations/preview/: the server's own pricing of this cart, without saving anything. */
export function buildPreviewRequest(ctx: Pick<SellContext, 'customerId' | 'branchId' | 'wholesale' | 'orderDiscount'>, cart: Cart) {
  return {
    ...discountFields(ctx.orderDiscount),
    branch_id: ctx.branchId,
    customer_id: ctx.customerId,
    price_mode: ctx.wholesale ? ('WHOLESALE' as const) : ('RETAIL' as const),
    items: cart.map((l) => ({ variant_id: l.variantId, quantity: qtyText(l.quantity), ...(l.unitId ? { unit_id: l.unitId } : {}), ...lineExtras(l) })),
  };
}

/** Change to give back for cash. Never sent to the server: it records only what the sale is worth. */
export function changeDue(total: Money, cashReceived: Money): Money {
  const diff = subMoney(cashReceived, total);
  return parseMoney(diff).lt(0) ? '0' : diff;
}
