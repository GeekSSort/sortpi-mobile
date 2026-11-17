import type { Db } from '../local/db.ts';

/**
 * The outbox: things the person did that the shop's server has not heard yet. A new product is written here first, on the phone, and the
 * screen moves on at once; a sender then tells the server, one step at a time, and writes down each step that worked so a retry (or a
 * restart) carries on from there instead of starting over. Lives in the phone's SQLite file but outside the copy of the shop: the copy is
 * thrown away when it is out of date or on sign-out, and these must survive both.
 */

export type OutboxState = 'pending' | 'failed';

export type OutboxRow = {
  id: string;
  /** Whose it is: the shop address and the person. Only that person's phone session sends it. */
  account: string;
  kind: 'product';
  /** What to send, as JSON (the form, the branch, the photo). */
  payload: string;
  /** How far the sending got: 0 nothing yet, 1 the item exists on the server, 2 its opening stock is counted, 3 its photo is on. */
  step: number;
  /** The item's id on the server and its variants (JSON), once step 1 is done. */
  product_id: string | null;
  made: string | null;
  /** One key for the opening stock, so a retry cannot count it in twice. */
  stock_key: string;
  state: OutboxState;
  /** Plain words about the last failure. */
  error: string | null;
  attempts: number;
  created_at: number;
  next_try_at: number;
};

const DDL = `
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT NOT NULL PRIMARY KEY, account TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0,
  product_id TEXT, made TEXT, stock_key TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, next_try_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS outbox_account ON outbox (account, created_at);
`;

export async function openOutbox(db: Db): Promise<void> {
  await db.exec(DDL);
}

export type NewOutboxRow = Pick<OutboxRow, 'id' | 'account' | 'kind' | 'payload' | 'stock_key'>;

/** Writes it down. This is the only thing the person waits for, so it is one small insert. */
export async function enqueue(db: Db, row: NewOutboxRow, now: number): Promise<void> {
  await db.run(
    'INSERT INTO outbox (id, account, kind, payload, stock_key, created_at, next_try_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.id, row.account, row.kind, row.payload, row.stock_key, now, now],
  );
}

/** Everything of this person's that is still here (waiting or stuck), oldest first. */
export const list = (db: Db, account: string): Promise<OutboxRow[]> =>
  db.all<OutboxRow>('SELECT * FROM outbox WHERE account = ? ORDER BY created_at, id', [account]);

/** What is due to be sent now: waiting, and past its retry time. Stuck ones wait for the person. */
export const due = (db: Db, account: string, now: number): Promise<OutboxRow[]> =>
  db.all<OutboxRow>("SELECT * FROM outbox WHERE account = ? AND state = 'pending' AND next_try_at <= ? ORDER BY created_at, id", [account, now]);

/** The soonest time something waiting will be due, or null when nothing is waiting. */
export async function nextDue(db: Db, account: string): Promise<number | null> {
  const r = (await db.all<{ t: number | null }>("SELECT MIN(next_try_at) AS t FROM outbox WHERE account = ? AND state = 'pending'", [account]))[0];
  return r?.t ?? null;
}

export type Progress = { step?: number; product_id?: string | null; made?: string | null };

/** Writes down a step that worked, so a retry carries on from it. */
export async function saveProgress(db: Db, id: string, p: Progress): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (p.step !== undefined) { sets.push('step = ?'); params.push(p.step); }
  if (p.product_id !== undefined) { sets.push('product_id = ?'); params.push(p.product_id); }
  if (p.made !== undefined) { sets.push('made = ?'); params.push(p.made); }
  if (!sets.length) return;
  await db.run(`UPDATE outbox SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
}

/** How long to wait before the next try: quick at first, then calmer, never more than five minutes. */
export function retryDelayMs(attempts: number): number {
  const steps = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
  return steps[Math.min(Math.max(attempts, 1), steps.length) - 1];
}

/**
 * A failure that trying again will not fix: the server understood and said no (a taken barcode, a missing permission, a bad value).
 * No answer, a slow answer, a busy server and an expired sign-in are not: they pass.
 */
export function isPermanent(failure: { status?: number; code?: string }): boolean {
  const s = failure.status ?? 0;
  if (s === 0 || s === 401 || s === 408 || s === 425 || s === 429 || s >= 500) return false;
  return s >= 400 && s < 500;
}

/** A try failed. A permanent failure parks it for the person; any other waits and is tried again. */
export async function recordFailure(db: Db, id: string, f: { message: string; permanent: boolean }, now: number): Promise<void> {
  const row = (await db.all<{ attempts: number }>('SELECT attempts FROM outbox WHERE id = ?', [id]))[0];
  if (!row) return;
  const attempts = row.attempts + 1;
  if (f.permanent) {
    await db.run("UPDATE outbox SET state = 'failed', error = ?, attempts = ? WHERE id = ?", [f.message, attempts, id]);
  } else {
    await db.run("UPDATE outbox SET error = ?, attempts = ?, next_try_at = ? WHERE id = ?", [f.message, attempts, now + retryDelayMs(attempts), id]);
  }
}

/** The person says "try again": it is due now and starts counting afresh. */
export const retryNow = (db: Db, id: string, now: number): Promise<void> =>
  db.run("UPDATE outbox SET state = 'pending', error = NULL, attempts = 0, next_try_at = ? WHERE id = ?", [now, id]);

export const remove = (db: Db, id: string): Promise<void> => db.run('DELETE FROM outbox WHERE id = ?', [id]);

/** Whose phone session owns an item: the shop address and the person (not the branch, which the item carries itself). */
export const outboxAccount = (workspaceUrl: string, userId: string): string => `${workspaceUrl}|${userId}`;

/**
 * Whose items the sender should send right now, or null when nobody is signed in. The session moves through "booting", "locked" and
 * "unreachable" for a moment (a blip in the signal when the app comes back from the photo picker is enough), and none of those means the
 * person left: only "signedOut" does. Sending must not stop for a blip, or an item saved at that moment sits unsent until the next app start.
 */
export function senderAccount(status: string, workspaceUrl: string | null | undefined, userId: string | null | undefined): string | null {
  if (status === 'signedOut' || !workspaceUrl || !userId) return null;
  return outboxAccount(workspaceUrl, userId);
}
