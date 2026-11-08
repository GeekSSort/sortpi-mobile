import type { Db } from '../local/db.ts';

/**
 * The questions people really type, kept on the phone only so the assistant can be tested and taught on real shop talk. Nothing here is sent
 * anywhere; the owner can share or delete the list. A question that may name a customer is shared only when the owner chooses to.
 */
export type Path = 'matcher' | 'model' | 'none';
export type Verdict = 'right' | 'wrong';
export type Entry = { text: string; path: Path; result: string; plan?: string | null; business?: string | null };
export type LoggedQuestion = { id: number; at: string; text: string; path: Path; result: string; plan: string | null; verdict: Verdict | null; corrected: string | null; business: string | null };

export const TABLE_SQL = `CREATE TABLE IF NOT EXISTS ask_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, text TEXT NOT NULL, path TEXT NOT NULL, result TEXT NOT NULL,
  plan TEXT, verdict TEXT, corrected TEXT, business TEXT
)`;

/** The question as one tidy line, at most 200 characters. */
export const clip = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, 200);

export async function logQuestion(db: Db, e: Entry, now: Date = new Date()): Promise<number | null> {
  const text = clip(e.text);
  if (!text) return null;
  await db.exec(TABLE_SQL);
  await db.run('INSERT INTO ask_questions (at, text, path, result, plan, business) VALUES (?, ?, ?, ?, ?, ?)', [now.toISOString(), text, e.path, e.result, e.plan ?? null, e.business ?? null]);
  return (await db.all<{ id: number }>('SELECT last_insert_rowid() AS id'))[0]?.id ?? null;
}

/** "Right" or "wrong" from the person; when wrong, `corrected` is the question they say they meant. */
export async function setVerdict(db: Db, id: number, verdict: Verdict, corrected?: string): Promise<void> {
  await db.exec(TABLE_SQL);
  await db.run('UPDATE ask_questions SET verdict = ?, corrected = ? WHERE id = ?', [verdict, corrected ?? null, id]);
}

export async function listQuestions(db: Db, limit = 500): Promise<LoggedQuestion[]> {
  await db.exec(TABLE_SQL);
  return db.all<LoggedQuestion>('SELECT id, at, text, path, result, plan, verdict, corrected, business FROM ask_questions ORDER BY id DESC LIMIT ?', [limit]);
}

export async function countQuestions(db: Db): Promise<number> {
  await db.exec(TABLE_SQL);
  return (await db.all<{ n: number }>('SELECT count(*) AS n FROM ask_questions'))[0]?.n ?? 0;
}

export async function clearQuestions(db: Db): Promise<void> {
  await db.exec(TABLE_SQL);
  await db.run('DELETE FROM ask_questions');
}

/** One spreadsheet cell. A cell that begins with = + - @ or a tab would be run as a formula when opened, so it is marked as text. */
export function csvCell(v: string | number | null): string {
  let s = v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ['at', 'question', 'path', 'result', 'verdict', 'meant', 'business', 'plan'];

/** The questions as CSV, oldest first, for the owner to share: what was typed, what the app made of it, and whether the person said it was right. */
export function toCsv(rows: LoggedQuestion[]): string {
  const lines = [...rows].reverse().map((r) => [r.at, r.text, r.path, r.result, r.verdict, r.corrected, r.business, r.plan].map(csvCell).join(','));
  return [CSV_HEADER.join(','), ...lines].join('\n');
}
