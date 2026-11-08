import type { Db } from './db.ts';
import { openAppDb } from './expo-db';
import { openStore, status } from './store.ts';

/** One database handle for the whole app, opened the first time anything asks for it. */
let opening: Promise<Db> | null = null;
export const appDb = (): Promise<Db> => (opening ??= openAppDb().then(async (db) => (await openStore(db), db)));

/** Whose shop is signed in right now (workspace, person, branch), set by the provider. Null when nobody is. */
let current: string | null = null;
export const setCurrentOwner = (owner: string | null): void => {
  current = owner;
};

/** The database, but only when it holds a copy that belongs to the person signed in now; otherwise null and the caller asks the server. */
export async function readyDb(): Promise<Db | null> {
  if (!current) return null;
  try {
    const db = await appDb();
    const s = await status(db);
    return s.owner === current && s.products > 0 ? db : null;
  } catch {
    return null; // a broken local copy must never stop a sale: the server still answers
  }
}
