export type ExpiryState = 'expired' | 'expiring' | 'ok' | 'undated';
export type Batch = {
  variant: string;
  product_name: string;
  variant_name: string;
  sku: string;
  unit: string;
  allow_decimal: boolean;
  warehouse_name: string;
  batch_no: string;
  expiry_date: string | null;
  days_left: number | null;
  state: ExpiryState;
  quantity: string;
  on_hand: string;
  /** Only for roles that may see money. */
  value?: string;
};

/** How far ahead "expiring" reaches. The server counts it (`within_days`), the person picks it. */
export const WINDOWS = [7, 15, 30, 60, 90] as const;
export const DEFAULT_WINDOW = 30;

export type Chip = { id: string; label: string; state?: ExpiryState };
/** The chips over the list. "Expiring" is the one a pharmacy opens first. */
export const STATE_CHIPS: Chip[] = [
  { id: 'expiring', label: 'Expiring soon', state: 'expiring' },
  { id: 'expired', label: 'Already expired', state: 'expired' },
  { id: 'ok', label: 'Fine for now', state: 'ok' },
  { id: 'undated', label: 'No date', state: 'undated' },
];

/** Colour and words per state: red already expired, orange expiring, green fine, grey no date (nothing to watch). */
export const LOOK: Record<ExpiryState, { tone: 'bad' | 'warn' | 'good' | 'plain'; icon: 'Cancel' | 'TriangleAlert' | 'CheckCircle' | 'Package' }> = {
  expired: { tone: 'bad', icon: 'Cancel' },
  expiring: { tone: 'warn', icon: 'TriangleAlert' },
  ok: { tone: 'good', icon: 'CheckCircle' },
  undated: { tone: 'plain', icon: 'Package' },
};

/** "Expired 3 days ago", "Expires today", "Expires tomorrow", "12 days left". English keys with `{n}`. */
export function daysWords(days: number | null): { key: string; n?: number } {
  if (days === null) return { key: 'No expiry date' };
  if (days === -1) return { key: 'Expired yesterday' };
  if (days < 0) return { key: 'Expired {n} days ago', n: -days };
  if (days === 0) return { key: 'Expires today' };
  if (days === 1) return { key: 'Expires tomorrow' };
  return { key: '{n} days left', n: days };
}

export const itemName = (b: Pick<Batch, 'product_name' | 'variant_name'>) => (b.variant_name && b.variant_name.toLowerCase() !== 'default' ? `${b.product_name} ${b.variant_name}` : b.product_name);

/** The expiry date as "16 Nov 2026" from "2026-11-16", with the month words of the chosen language. */
export function dateWords(iso: string, months: readonly string[]): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${months[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : iso;
}

/** A shop without the expiry feature is answered 404: say so kindly instead of showing an error. */
export const notTracked = (status: number) => status === 404;
