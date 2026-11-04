import type { Cart, CartLine } from './cart.ts';
import { lineKey } from './cart.ts';

/**
 * A parked cart, as the server keeps it (`/pos/hold/`, `cart_data` is free JSON the web till also writes).
 * Lines are stored in the web's own shape (`productId` is the variant id, `price` a number) so a cart parked
 * on the phone can be taken back on the web till and the other way round. Prices are only a reminder:
 * the sale is priced again by the server when it is paid.
 */
export type HeldLine = { variantId: string; unitId: string | null; name: string; sku: string; unitLabel: string | null; unitPrice: string; quantity: string; allowDecimal?: boolean; unitShort?: string };
export type HeldCart = { id: string; reference: string; customerId: string | null; customerName: string; cashierName: string; at: string; wholesale: boolean; lines: HeldLine[] };

export const holdReference = (now: number) => `HOLD-${String(now).slice(-8)}`;

export function holdBody(o: { branchId: string; customerId?: string | null; wholesale?: boolean; cart: Cart; now: number }) {
  return {
    reference: holdReference(o.now),
    branch: o.branchId,
    ...(o.customerId ? { customer: o.customerId } : {}),
    cart_data: {
      price_mode: o.wholesale ? 'wholesale' : 'retail',
      items: o.cart.map((l) => ({
        productId: l.variantId,
        name: l.name,
        sku: l.sku,
        price: Number(l.unitPrice),
        quantity: Number(l.quantity),
        ...(l.unitId ? { unitId: l.unitId, unitName: l.unitLabel ?? '' } : {}),
        // The phone's own extras; the web ignores them.
        allowDecimal: !!l.allowDecimal,
        ...(l.unitShort ? { unitShort: l.unitShort } : {}),
      })),
    },
  };
}

type Row = { id?: unknown; reference?: unknown; customer?: unknown; customer_name?: unknown; cashier_name?: unknown; created_at?: unknown; cart_data?: { price_mode?: unknown; items?: unknown } | null };

/** Reads a server row defensively: `cart_data` is whatever some till once wrote, so every field is checked. */
export function fromRow(row: Row): HeldCart {
  const items = Array.isArray(row.cart_data?.items) ? (row.cart_data.items as Record<string, unknown>[]) : [];
  const lines: HeldLine[] = items
    .filter((i) => i && (i.productId || i.variantId) && Number(i.quantity) > 0)
    .map((i) => ({
      variantId: String(i.variantId ?? i.productId),
      unitId: i.unitId ? String(i.unitId) : null,
      name: String(i.name ?? ''),
      sku: String(i.sku ?? ''),
      unitLabel: i.unitName ? String(i.unitName) : null,
      unitPrice: String(Number(i.price) || 0),
      quantity: String(Number(i.quantity)),
      allowDecimal: !!i.allowDecimal,
      ...(i.unitShort ? { unitShort: String(i.unitShort) } : {}),
    }));
  return {
    id: String(row.id ?? ''),
    reference: String(row.reference ?? ''),
    customerId: row.customer ? String(row.customer) : null,
    customerName: String(row.customer_name ?? '') || '',
    cashierName: String(row.cashier_name ?? ''),
    at: String(row.created_at ?? ''),
    wholesale: String(row.cart_data?.price_mode ?? '').toLowerCase() === 'wholesale',
    lines,
  };
}

/** Taking a parked cart back adds its lines to what is already in the cart; the same item becomes one line of more. */
export function mergeHeld(cart: Cart, held: HeldLine[]): Cart {
  let out = cart;
  for (const h of held) {
    const key = lineKey(h.variantId, h.unitId);
    const line: CartLine = { key, variantId: h.variantId, unitId: h.unitId, name: h.name, sku: h.sku, unitLabel: h.unitLabel, unitPrice: h.unitPrice, quantity: h.quantity, allowDecimal: h.allowDecimal, unitShort: h.unitShort };
    const at = out.findIndex((l) => l.key === key);
    out = at < 0 ? [...out, line] : out.map((l, i) => (i === at ? { ...l, quantity: String(Number(l.quantity) + Number(h.quantity)) } : l));
  }
  return out;
}
