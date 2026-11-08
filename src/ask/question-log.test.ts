import assert from 'node:assert/strict';
import { test } from 'node:test';

import { memoryDb } from '../local/node-db.ts';
import { clearQuestions, clip, countQuestions, csvCell, listQuestions, logQuestion, setVerdict, toCsv } from './question-log.ts';

test('a question is kept with what the app made of it, and can be marked right or wrong', async () => {
  const db = await memoryDb();
  const id = await logQuestion(db, { text: '  ajker   bill\nkoto ', path: 'matcher', result: 'sales_today', business: 'fabric' }, new Date('2026-11-08T10:00:00Z'));
  assert.ok(id);
  const id2 = await logQuestion(db, { text: 'pani koy botte', path: 'model', result: 'stock_of', plan: '{"tool":"stock_of"}' });
  await setVerdict(db, id2!, 'wrong', 'Stock kom ki ase?');
  const rows = await listQuestions(db);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].text, 'ajker bill koto');
  assert.equal(rows[1].at, '2026-11-08T10:00:00.000Z');
  assert.equal(rows[0].verdict, 'wrong');
  assert.equal(rows[0].corrected, 'Stock kom ki ase?');
  assert.equal(await countQuestions(db), 2);
});

test('an empty question is not kept, a long one is clipped, and everything can be deleted', async () => {
  const db = await memoryDb();
  assert.equal(await logQuestion(db, { text: '   ', path: 'none', result: 'unsupported' }), null);
  await logQuestion(db, { text: 'x'.repeat(500), path: 'none', result: 'unsupported' });
  assert.equal((await listQuestions(db))[0].text.length, 200);
  assert.equal(clip(' a  b '), 'a b');
  await clearQuestions(db);
  assert.equal(await countQuestions(db), 0);
});

test('CSV cells are quoted, and a cell that would run as a spreadsheet formula is marked as text', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=SUM(A1:A9)'), "'=SUM(A1:A9)");
  assert.equal(csvCell('@cmd'), "'@cmd");
  assert.equal(csvCell('-5 taka'), "'-5 taka");
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('আজকের বিল কত'), 'আজকের বিল কত');
});

test('the export lists the oldest question first and keeps Bangla and quotes intact', async () => {
  const db = await memoryDb();
  await logQuestion(db, { text: 'আজকের বিল কত', path: 'matcher', result: 'sales_today' }, new Date('2026-11-08T09:00:00Z'));
  await logQuestion(db, { text: '=HYPERLINK("x")', path: 'none', result: 'unsupported' }, new Date('2026-11-08T10:00:00Z'));
  const csv = toCsv(await listQuestions(db));
  const lines = csv.split('\n');
  assert.equal(lines[0], 'at,question,path,result,verdict,meant,business,plan');
  assert.ok(lines[1].includes('আজকের বিল কত'));
  assert.ok(lines[2].includes(`"'=HYPERLINK(""x"")"`));
});
