import { ApiError } from '@/api/client';
import type { CatalogItem } from '@/sell/catalog-map';
import type { LookupResponse } from '@/sell/lookup-map';

import { readyDb } from './instance';
import { toCatalogItem, toLookupResponse } from './map.ts';
import { findByCode, searchItems } from './store.ts';

/** The server could not be reached (no signal, a timeout). Any other answer, even an error, is the server speaking and is not covered by the local copy. */
export const isOffline = (e: unknown): boolean => e instanceof ApiError && (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT' || e.status === 0);

/** Items for the Sell search from the phone's own copy, or null when there is no copy for this person. */
export async function localCatalog(q: string, wholesale: boolean, limit: number): Promise<CatalogItem[] | null> {
  const db = await readyDb();
  if (!db) return null;
  try {
    return (await searchItems(db, q, limit)).map((i) => toCatalogItem(i, wholesale));
  } catch {
    return null;
  }
}

/** A scan or typed code from the phone's own copy: the answer shape of `/products/lookup/`, `null` when no item has that code, `undefined` when there is no copy to ask. */
export async function localLookup(code: string): Promise<(LookupResponse & { variant: LookupResponse['variant'] & { mrp?: string | null } }) | null | undefined> {
  const db = await readyDb();
  if (!db) return undefined;
  try {
    const hit = await findByCode(db, code);
    return hit ? toLookupResponse(hit) : null;
  } catch {
    return undefined;
  }
}
