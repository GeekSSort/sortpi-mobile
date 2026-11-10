// What the phone remembers about a sale across an app kill, a lock or a lost connection. Pure: no storage, no network, so it is tested.
//
// Two small records:
//  - the PENDING sale: written before `POST /sales/sell/` goes out, with the exact request and its Idempotency-Key. If the answer never
//    arrives (timeout, kill, crash) the same request can be sent again: the server replays the original sale instead of making a second one.
//  - the DRAFT cart: what is on the till but not yet being paid, so a lock, a call or a kill does not empty it.

import { ApiError } from '../api/client.ts';
import type { Cart, PaymentInput, SellContext } from './cart.ts';
import type { PickedCustomer } from './customers.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** The server keeps an idempotency key for a good while, but a sale left this long should be looked at by a person, not replayed. */
export const PENDING_MAX_AGE_MS = 2 * DAY_MS;
export const DRAFT_MAX_AGE_MS = DAY_MS;

export type PendingSale = {
  v: 1;
  key: string;
  at: number;
  userId: string;
  ctx: SellContext;
  cart: Cart;
  payments: PaymentInput[];
  /** Serial numbers dealt to the cart lines (by line key), for items sold by serial. Sent again exactly as they were. */
  serials?: Record<string, string[]>;
  /** What the sale was expected to come to, for the screen that asks the person to finish it. */
  total: string;
  customerName: string | null;
};

export type DraftCart = { v: 1; at: number; userId: string; branchId: string; cart: Cart; customer: PickedCustomer | null };

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** The stored pending sale, or null when there is none, it is somebody else's, it is too old, or it cannot be read. */
export function decodePending(raw: string | null | undefined, userId: string, now: number): PendingSale | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!isObj(p) || p.v !== 1 || typeof p.key !== 'string' || !p.key || typeof p.at !== 'number' || p.userId !== userId) return null;
    if (!isObj(p.ctx) || !Array.isArray(p.cart) || !Array.isArray(p.payments) || typeof p.total !== 'string') return null;
    if (now - p.at > PENDING_MAX_AGE_MS) return null;
    return p as unknown as PendingSale;
  } catch {
    return null;
  }
}

/** The stored draft cart, or null: none, somebody else's, another branch's, stale, empty or unreadable. */
export function decodeDraft(raw: string | null | undefined, userId: string, branchId: string, now: number): DraftCart | null {
  if (!raw) return null;
  try {
    const d: unknown = JSON.parse(raw);
    if (!isObj(d) || d.v !== 1 || d.userId !== userId || d.branchId !== branchId || typeof d.at !== 'number' || !Array.isArray(d.cart) || d.cart.length === 0) return null;
    if (now - d.at > DRAFT_MAX_AGE_MS) return null;
    return d as unknown as DraftCart;
  } catch {
    return null;
  }
}

/**
 * After a failed sell request: may the server have recorded the sale anyway? A timeout, a lost connection, a server error or "still being
 * processed" leave that open, so the request is kept and the SAME key is sent again. Any other answer is the server saying it wrote nothing.
 */
export function mayHaveCommitted(e: unknown): boolean {
  if (!(e instanceof ApiError)) return true; // something unexpected: assume the worst, a repeat with the same key is safe
  return e.status === 0 || e.status >= 500 || e.code === 'TIMEOUT' || e.code === 'NETWORK_ERROR' || e.code === 'REQUEST_IN_PROGRESS';
}
