// Scores a model's answers (from run_mlx.py) on both test sets, next to the word matcher, and the two together (the app's real order).
//   node --experimental-strip-types tools/ask/score.ts <name> [--failures]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { accuracy, evaluate, formatReport, matcherAnswer, precision, type Got } from '../../src/ask/eval.ts';
import { parsePlan } from '../../src/ask/plan.ts';
import { TESTSET } from '../../src/ask/testset.ts';
import { HOLDOUT } from '../../src/ask/testset-holdout.ts';

const name = process.argv[2];
if (!name) throw new Error('usage: score.ts <name>');
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const lines = readFileSync(`${OUT}${name}.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { set: string; q: string; text: string });
const said = new Map(lines.map((l) => [`${l.set}|${l.q}`, l.text]));
let invalid = 0;

const modelAnswer = (set: string) => (q: string): Got => {
  const p = parsePlan((said.get(`${set}|${q}`) ?? '').trim());
  if (p === null) {
    invalid += 1;
    return { tool: 'none' };
  }
  return p === 'none' ? { tool: 'none' } : { tool: p.tool, period: p.period, item: p.item, name: p.name };
};
/** The app's order: the word matcher answers when it is sure; otherwise the model is asked. */
const together = (set: string) => (q: string): Got => {
  const m = matcherAnswer(q);
  return m.tool !== 'none' ? m : modelAnswer(set)(q);
};

for (const [label, cases] of [['tuned', TESTSET], ['holdout', HOLDOUT]] as const) {
  console.log(`\n=== ${label} set (${cases.length} questions) ===`);
  for (const [who, fn] of [['word matcher', matcherAnswer], [`model ${name}`, modelAnswer(label)], ['matcher then model', together(label)]] as const) {
    invalid = 0;
    const r = evaluate([...cases], fn);
    console.log(`${who.padEnd(22)} accuracy ${(accuracy(r.overall) * 100).toFixed(0)}%  precision ${(precision(r.overall) * 100).toFixed(0)}%  right ${r.overall.correct} wrong ${r.overall.wrong} missed ${r.overall.missed}${who.startsWith('model') ? `  (unreadable answers: ${invalid})` : ''}`);
    if (process.argv.includes('--failures') && who === 'matcher then model') for (const f of r.failures) console.log(`    [${f.verdict}] ${f.case.q}  want ${f.case.tool}${f.case.item ? ' ' + f.case.item : ''}  got ${f.got.tool}${f.got.item ? ' ' + f.got.item : ''}`);
  }
}
