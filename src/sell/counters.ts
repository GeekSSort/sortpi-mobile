/** A till counter (`/pos/counters/`). `inUseBy` is who has a shift open on it now; null when it is free. */
export type Counter = { id: string; name: string; inUseBy: string | null };

type Row = { id?: unknown; name?: unknown; is_active?: unknown; in_use_by?: unknown };

/** Only counters in use by this shop today matter: switched-off ones are hidden, like on the web. */
export function fromCounterRows(rows: Row[]): Counter[] {
  return rows.filter((r) => r.id && r.is_active !== false).map((r) => ({ id: String(r.id), name: String(r.name ?? ''), inUseBy: r.in_use_by ? String(r.in_use_by) : null }));
}

/**
 * Which counter is chosen when the screen opens: the one used last time if it is free, otherwise the only free one.
 * Null means the cashier must choose (or the shop has no counters and none is needed).
 */
export function defaultCounter(counters: Counter[], lastId: string | null): string | null {
  const free = counters.filter((c) => !c.inUseBy);
  if (lastId && free.some((c) => c.id === lastId)) return lastId;
  return free.length === 1 ? free[0].id : null;
}
