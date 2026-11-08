import { DatabaseSync } from 'node:sqlite';

import type { Db } from './db.ts';

/** The tests' database: Node's built-in SQLite in memory, behind the same interface the app's expo-sqlite adapter fills. */
export function memoryDb(): Db {
  const raw = new DatabaseSync(':memory:');
  const db: Db = {
    async exec(sql) { raw.exec(sql); },
    async run(sql, params = []) { raw.prepare(sql).run(...params); },
    async all<T>(sql: string, params: (string | number | null)[] = []) { return raw.prepare(sql).all(...params) as T[]; },
    async transaction(work) {
      raw.exec('BEGIN');
      try { await work(db); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
  return db;
}
