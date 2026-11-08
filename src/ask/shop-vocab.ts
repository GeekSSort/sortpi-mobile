import { readyDb } from '@/local/instance';
import { customerNames, itemNames, shopWords, status, type ShopWords } from '@/local/store';

import { buildNameIndex, resolveNames, type Named, type NameIndex } from './resolve';

type Cached = { stamp: string; items: NameIndex; customers: NameIndex };
let cache: Cached | null = null;

/** The shop's own item and customer names, indexed by sound. Rebuilt when the phone's copy of the shop is refreshed. */
async function indexes(): Promise<Cached | null> {
  const db = await readyDb();
  if (!db) return null;
  const s = await status(db);
  const stamp = `${s.owner}|${s.syncedAt}`;
  if (cache?.stamp === stamp) return cache;
  cache = { stamp, items: buildNameIndex(await itemNames(db)), customers: buildNameIndex(await customerNames(db)) };
  return cache;
}

const names = (found: { item: Named }[]) => [...new Set(found.map((f) => f.item.name))];

/** The shop's item names that a typed word probably means (best first), or none when the copy is not on the phone or nothing sounds alike. */
export async function resolveItemNames(typed: string): Promise<string[]> {
  const c = await indexes();
  return c ? names(resolveNames(c.items, typed, 4)) : [];
}

export async function resolveCustomerNames(typed: string): Promise<string[]> {
  const c = await indexes();
  return c ? names(resolveNames(c.customers, typed, 3)) : [];
}

/** The shop's own words, for telling the model what kind of shop this is. Null when the phone has no copy yet. */
export async function ownWords(): Promise<ShopWords | null> {
  const db = await readyDb();
  return db ? shopWords(db) : null;
}
