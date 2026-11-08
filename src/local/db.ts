/** The few things the local store needs from a SQLite database. The app backs it with expo-sqlite; the tests with Node's own SQLite. */
export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: (string | number | null)[]): Promise<void>;
  all<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  /** Everything done through `tx` is one unit, all or nothing, and other readers do not see it half done. */
  transaction(work: (tx: Db) => Promise<void>): Promise<void>;
}
