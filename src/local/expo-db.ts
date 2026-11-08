import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Db } from './db.ts';

const wrap = (raw: Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync'>): Omit<Db, 'transaction'> => ({
  exec: (sql) => raw.execAsync(sql),
  run: async (sql, params = []) => {
    await raw.runAsync(sql, params);
  },
  all: <T>(sql: string, params: (string | number | null)[] = []) => raw.getAllAsync<T>(sql, params),
});

/**
 * The app's database, a file on the phone. A publish runs in an EXCLUSIVE transaction (its own connection), so a search that happens
 * while a new copy is going in sees the old shop in full until the new one is committed.
 */
export async function openAppDb(name = 'sortpi-local.db'): Promise<Db> {
  const raw = await openDatabaseAsync(name);
  await raw.execAsync('PRAGMA journal_mode = WAL');
  return {
    ...wrap(raw),
    transaction: (work) =>
      raw.withExclusiveTransactionAsync(async (txn) => {
        await work({ ...wrap(txn), transaction: () => Promise.reject(new Error('Transactions do not nest.')) });
      }),
  };
}
