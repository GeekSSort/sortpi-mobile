import { appDb } from '@/local/instance';

/** Questions the phone could not answer, kept on the phone so the next version can learn them. Never sent anywhere, never wiped with the shop copy. */
export async function logMiss(text: string, kind: 'unsure' | 'unsupported'): Promise<void> {
  try {
    const db = await appDb();
    await db.exec('CREATE TABLE IF NOT EXISTS ask_log (at TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL)');
    await db.run('INSERT INTO ask_log (at, text, kind) VALUES (?, ?, ?)', [new Date().toISOString(), text.slice(0, 200), kind]);
  } catch {
    // a log must never get in the way of an answer
  }
}
