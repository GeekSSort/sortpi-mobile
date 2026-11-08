import { checkStock, toRows, type ShopRows, type SnapshotItem, type StockRow } from './snapshot.ts';

/** What the download needs from the network. The app fills it with the API client; the tests with a fake server. */
export type Net = {
  manifest(): Promise<{ server_time: string }>;
  changes(deviceId: string, cursor: string | null): Promise<{ mode?: string; snapshot_id?: string; items?: SnapshotItem[]; cursor?: string | null; complete?: boolean }>;
  stock(deviceId: string): Promise<{ items?: unknown }>;
};

export type Download = { rows: ShopRows; stock: StockRow[]; serverTime: string };

/**
 * Reads the whole workspace the way the desktop till does: follow the cursor until the server says it is complete, refuse a cursor that
 * repeats or a snapshot that changes under us, then check every page and the stock. Nothing is kept here; the caller publishes it.
 */
export async function downloadSnapshot(net: Net, deviceId: string, maxPages = 200): Promise<Download> {
  const manifest = await net.manifest();
  const items: SnapshotItem[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let snapshot: string | null = null;
  for (let n = 0; n <= maxPages; n += 1) {
    if (n === maxPages) throw new Error('The download is too long. Try again.');
    const page = await net.changes(deviceId, cursor);
    if (page.mode !== 'snapshot' || !page.snapshot_id || !Array.isArray(page.items)) throw new Error('The shop download is not in the form we expect.');
    if (snapshot && page.snapshot_id !== snapshot) throw new Error('The shop changed while it was downloading. Try again.');
    if ((page.cursor && page.complete === true) || (!page.cursor && page.complete !== true)) throw new Error('The shop download did not finish properly.');
    snapshot = page.snapshot_id;
    items.push(...page.items);
    cursor = page.cursor ?? null;
    if (!cursor) break;
    if (seen.has(cursor)) throw new Error('The shop download repeated itself.');
    seen.add(cursor);
  }
  const rows = toRows(items); // throws when a page is missing or a row repeats
  const stock = checkStock((await net.stock(deviceId)).items);
  return { rows, stock, serverTime: manifest.server_time };
}

/** Whose copy this is. A copy for another workspace, person or branch must not be shown to this one. */
export const ownerKey = (workspace: string, userId: string, branchId: string): string => `${workspace}|${userId}|${branchId}`;

/** Should the app download again now? Never while one is running; otherwise when there is no copy, it is someone else's, or it is old. */
export function shouldSync(o: { owner: string | null; syncedAt: string | null }, mine: string, now: number, maxAgeMs: number, running: boolean): boolean {
  if (running) return false;
  if (o.owner !== mine || !o.syncedAt) return true;
  const at = Date.parse(o.syncedAt);
  return !Number.isFinite(at) || now - at >= maxAgeMs;
}
