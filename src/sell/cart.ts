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

export const lineEstimate = (line: CartLine): Money => mulMoney(line.unitPrice, line.quantity);

/** Sum of the lines' scanned prices. An estimate: tax and discounts are the server's business. */
export const estimateSubtotal = (cart: Cart): Money => cart.reduce((sum, l) => addMoney(sum, lineEstimate(l)), '0');

export const itemCount = (cart: Cart): number => cart.reduce((n, l) => n + Number(parseMoney(l.quantity).round(0, 3).toFixed(0)), 0);

export const isEmpty = (cart: Cart) => cart.length === 0 || cart.every((l) => isZeroMoney(l.quantity));

/** The server wants quantities as 3-decimal strings (`"2.000"`). */
export const qtyText = (q: string): string => parseMoney(q).toFixed(3);

export type SellContext = { customerId: string; warehouseId: string; branchId: string; shiftId?: string; wholesale?: boolean; couponCode?: string; redeemPoints?: number };
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK' | 'MOBILE';
export type PaymentInput = { payment_method: PaymentMethod; amount: Money; reference_no?: string };

/** Body for POST /sales/sell/. No price, total, tax or discount: the server computes those. */
export function buildSellRequest(ctx: SellContext, cart: Cart, payments: PaymentInput[]) {
  return {
    customer_id: ctx.customerId,
    warehouse_id: ctx.warehouseId,
    branch_id: ctx.branchId,
    ...(ctx.shiftId ? { shift_id: ctx.shiftId } : {}),
    ...(ctx.wholesale ? { price_mode: 'WHOLESALE' as const } : {}),
    ...(ctx.couponCode ? { coupon_code: ctx.couponCode } : {}),
    ...(ctx.redeemPoints ? { redeem_points: ctx.redeemPoints } : {}),
    items: cart.map((l) => ({ variant_id: l.variantId, quantity: qtyText(l.quantity), ...(l.unitId ? { unit_id: l.unitId } : {}) })),
    payments,
  };
}

/** Body for POST /quotations/preview/: the server's own pricing of this cart, without saving anything. */
export function buildPreviewRequest(ctx: Pick<SellContext, 'customerId' | 'branchId' | 'wholesale'>, cart: Cart) {
  return {
    branch_id: ctx.branchId,
    customer_id: ctx.customerId,
    price_mode: ctx.wholesale ? ('WHOLESALE' as const) : ('RETAIL' as const),
    items: cart.map((l) => ({ variant_id: l.variantId, quantity: qtyText(l.quantity), ...(l.unitId ? { unit_id: l.unitId } : {}) })),
  };
}

/** Change to give back for cash. Never sent to the server: it records only what the sale is worth. */
export function changeDue(total: Money, cashReceived: Money): Money {
  const diff = subMoney(cashReceived, total);
  return parseMoney(diff).lt(0) ? '0' : diff;
}
