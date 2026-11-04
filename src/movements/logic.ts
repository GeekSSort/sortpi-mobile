import { formatQuantity } from '../stock/status.ts';

export type Tone = 'good' | 'out' | 'warn' | 'bad' | 'info';
export type MovementIcon = 'ArrowDownLeft' | 'ArrowUpRight' | 'TriangleAlert' | 'Undo' | 'Package' | 'Receipt' | 'Cash';

export type Movement = {
  id: string;
  created_at: string;
  sku: string;
  product_name: string;
  variant_name: string;
  warehouse_code: string;
  movement_type: string;
  quantity: string;
  unit_short_name: string;
  unit_allow_decimal: boolean;
  balance_after: string;
  reference_type: string;
  reference_id: string | null;
  note: string;
  created_by_email: string;
};

/** What each kind of stock movement means in a shopkeeper's words. English keys, translated on screen. */
const KNOWN: Record<string, { words: string; icon: MovementIcon; tone: Tone | 'sign' }> = {
  OPENING: { words: 'Opening stock', icon: 'Package', tone: 'good' },
  PURCHASE: { words: 'Goods arrived', icon: 'ArrowDownLeft', tone: 'good' },
  SALE: { words: 'Sold', icon: 'Cash', tone: 'out' },
  SALE_RETURN: { words: 'Customer brought it back', icon: 'Undo', tone: 'good' },
  SALE_CANCEL: { words: 'Sale cancelled, stock put back', icon: 'Undo', tone: 'good' },
  SALE_RETURN_WITHDRAW: { words: 'Return taken back', icon: 'Undo', tone: 'out' },
  PURCHASE_RETURN: { words: 'Sent back to the supplier', icon: 'ArrowUpRight', tone: 'out' },
  TRANSFER_IN: { words: 'Came in on a transfer', icon: 'ArrowDownLeft', tone: 'good' },
  TRANSFER_OUT: { words: 'Went out on a transfer', icon: 'ArrowUpRight', tone: 'out' },
  ADJUSTMENT: { words: 'Stock corrected', icon: 'Receipt', tone: 'warn' },
  DAMAGE: { words: 'Damaged', icon: 'TriangleAlert', tone: 'bad' },
  EXPIRED: { words: 'Expired and written off', icon: 'TriangleAlert', tone: 'bad' },
  PRODUCTION: { words: 'Made in the shop', icon: 'ArrowDownLeft', tone: 'good' },
  PRODUCTION_USE: { words: 'Used to make something', icon: 'ArrowUpRight', tone: 'out' },
};

const titleCase = (code: string) => code.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Anything the server adds later still shows: its code is spelled out, with a neutral look, until it is added above. */
export function describeMovement(type: string): { words: string; icon: MovementIcon; tone: Tone; known: boolean } {
  const k = KNOWN[type];
  return k ? { words: k.words, icon: k.icon, tone: k.tone === 'sign' ? 'info' : k.tone, known: true } : { words: titleCase(type), icon: 'Package', tone: 'info', known: false };
}

/** The chips over the list: one kind of movement at a time (the server filters on `type`). */
export const TYPE_CHIPS: { id: string; label: string; type?: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'sale', label: 'Sold', type: 'SALE' },
  { id: 'purchase', label: 'Goods arrived', type: 'PURCHASE' },
  { id: 'sale-return', label: 'Customer brought back', type: 'SALE_RETURN' },
  { id: 'purchase-return', label: 'Sent back to supplier', type: 'PURCHASE_RETURN' },
  { id: 'in', label: 'Transfers in', type: 'TRANSFER_IN' },
  { id: 'out', label: 'Transfers out', type: 'TRANSFER_OUT' },
  { id: 'adjust', label: 'Corrections', type: 'ADJUSTMENT' },
  { id: 'damage', label: 'Damaged', type: 'DAMAGE' },
  { id: 'expired', label: 'Expired', type: 'EXPIRED' },
];

/** +5 or −3, with the unit: the sign says which way the shelf moved. Quantities stay text. */
export function signedQuantity(m: Pick<Movement, 'quantity' | 'unit_short_name' | 'unit_allow_decimal'>): string {
  const neg = m.quantity.trim().startsWith('-');
  const body = formatQuantity(neg ? m.quantity.trim().slice(1) : m.quantity, m.unit_allow_decimal);
  return `${neg ? '−' : '+'}${body}${m.unit_short_name ? ` ${m.unit_short_name}` : ''}`;
}

/** Colour by direction when the kind is neutral: green when the shelf gained, otherwise the kind's own colour. */
export const direction = (quantity: string): 'in' | 'out' | 'none' => (quantity.trim().startsWith('-') ? 'out' : /^0(\.0+)?$/.test(quantity.trim()) ? 'none' : 'in');

/** The item as people name it: the "Default" kind is not worth saying. */
export const itemName = (m: Pick<Movement, 'product_name' | 'variant_name'>) => (m.variant_name && m.variant_name.toLowerCase() !== 'default' ? `${m.product_name} ${m.variant_name}` : m.product_name);

/** Where tapping a row goes: the sale or purchase the movement came from, when the person may open it. */
export function sourceOf(m: Pick<Movement, 'reference_type' | 'reference_id'>, perms: string[] | undefined): { route: '/sale/[id]' | '/purchase/[id]'; id: string } | null {
  if (!m.reference_id) return null;
  const has = (...p: string[]) => p.some((x) => perms?.includes(x));
  if (m.reference_type === 'SALE' && has('sale.view', 'sale.view_own')) return { route: '/sale/[id]', id: m.reference_id };
  if (m.reference_type === 'PURCHASE' && has('purchase.view')) return { route: '/purchase/[id]', id: m.reference_id };
  return null;
}
