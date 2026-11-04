import { ApiError } from '../api/client.ts';
import { compareMoney } from '../lib/money.ts';
import { cleanCount } from '../stock/count.ts';
import type { Transfer } from './logic.ts';

/** A shelf or warehouse a transfer can start or end at. */
export type Place = { id: string; name: string; code: string; type: string; is_active: boolean; branch: string };

/** Where goods can be sent to: open places other than the one they leave, and never the transit shelf (it belongs to the system). */
export const destinations = (places: Place[], fromId: string | undefined): Place[] => places.filter((p) => p.is_active && p.type !== 'TRANSIT' && p.id !== fromId);
/** Where goods can leave from: open places of the branch the person is in. */
export const origins = (places: Place[], branchId: string | undefined): Place[] => places.filter((p) => p.is_active && p.type !== 'TRANSIT' && (!branchId || p.branch === branchId));

export type DraftLine = { variant: string; name: string; sku: string; available: string; unit: string; allowDecimal: boolean; quantity: string };
export type Sendable = { variant: string; name: string; sku: string; available: string; unit: string; allowDecimal: boolean };

/** Take the smaller of two quantities, as text. */
const smaller = (a: string, b: string) => (compareMoney(a, b) <= 0 ? a : b);

/** An item goes on the transfer as one unit (or all of it when less than one is there). Adding it again does nothing: the line already exists. */
export function addLine(lines: DraftLine[], row: Sendable): DraftLine[] {
  if (lines.some((l) => l.variant === row.variant)) return lines;
  return [...lines, { ...row, quantity: smaller('1', row.available) }];
}

export const removeLine = (lines: DraftLine[], variant: string) => lines.filter((l) => l.variant !== variant);

/** Typed quantity: digits only (a dot only where parts are allowed), and never above what is on the shelf. */
export function setQuantity(lines: DraftLine[], variant: string, text: string): DraftLine[] {
  return lines.map((l) => {
    if (l.variant !== variant) return l;
    const clean = cleanCount(text, l.allowDecimal);
    return { ...l, quantity: clean && compareMoney(clean, l.available) > 0 ? l.available : clean };
  });
}

export function stepQuantity(lines: DraftLine[], variant: string, direction: 1 | -1): DraftLine[] {
  return lines.map((l) => {
    if (l.variant !== variant) return l;
    const now = compareMoney(l.quantity || '0', '0') > 0 ? l.quantity : '0';
    const next = direction === 1 ? String(Number(now) + 1) : String(Math.max(0, Number(now) - 1));
    return { ...l, quantity: compareMoney(next, l.available) > 0 ? l.available : next };
  });
}

/** Why the transfer cannot be saved yet, as an English key, or null when it can. */
export function problem(o: { from?: string; to?: string; lines: DraftLine[] }): string | null {
  if (!o.from) return 'Choose where the goods leave from.';
  if (!o.to) return 'Choose where to send them.';
  if (o.from === o.to) return 'Choose two different places.';
  if (o.lines.length === 0) return 'Add at least one item.';
  if (o.lines.some((l) => compareMoney(l.quantity || '0', '0') <= 0)) return 'Every item needs an amount more than zero.';
  return null;
}

/** The body for `POST /inventory/transfers/`. Quantities go as text with three places, as the server keeps them. */
export function transferBody(o: { from: string; to: string; lines: DraftLine[]; note: string }) {
  return {
    from_warehouse: o.from,
    to_warehouse: o.to,
    ...(o.note.trim() ? { note: o.note.trim() } : {}),
    items: o.lines.map((l) => ({ variant: l.variant, quantity: Number(l.quantity).toFixed(3) })),
  };
}

/**
 * Creating a transfer has no Idempotency-Key, so after a lost connection the list is read to see whether the draft was made: a draft
 * between the same two places, made since the attempt began, carrying the same items in the same amounts.
 */
export function matchCreated(transfers: Transfer[], body: ReturnType<typeof transferBody>, since: string): Transfer | null {
  const key = (items: { variant: string; quantity: string }[]) => items.map((i) => `${i.variant}:${Number(i.quantity).toFixed(3)}`).sort().join('|');
  const want = key(body.items);
  return transfers.find((t) => t.status === 'DRAFT' && t.created_at >= since && t.from_warehouse === body.from_warehouse && t.to_warehouse === body.to_warehouse && key(t.items) === want) ?? null;
}

/** The first plain message the server gave for a refused field ("That warehouse is closed and cannot receive stock."). */
export function firstFieldMessage(errors: Record<string, unknown> | undefined): string | null {
  const walk = (v: unknown): string | null => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) for (const x of v) { const m = walk(x); if (m) return m; }
    else if (v && typeof v === 'object') for (const x of Object.values(v)) { const m = walk(x); if (m) return m; }
    return null;
  };
  return walk(errors);
}

/** Words for the ways making a transfer can be refused. Server sentences about a field are shown as they are (they are plain). */
export function describeNewTransferError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'VALIDATION_ERROR':
      return firstFieldMessage(e.errors) ?? 'Check the places and the amounts.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NOT_FOUND':
      return 'One of those places was not found. Pull down to refresh.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have been saved: check the list before trying again.';
    default:
      return e.message || 'Could not save this.';
  }
}
