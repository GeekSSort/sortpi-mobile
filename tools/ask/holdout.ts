// The honest number: the matcher on phrasing it was not tuned on.   node --experimental-strip-types tools/ask/holdout.ts --failures
import { evaluate, formatReport, matcherAnswer } from '../../src/ask/eval.ts';
import { HOLDOUT } from '../../src/ask/testset-holdout.ts';

const report = evaluate(HOLDOUT, matcherAnswer);
console.log(formatReport(report, `Word matcher on the held-out set (never tuned on), ${HOLDOUT.length} questions`));
if (process.argv.includes('--failures')) {
  console.log('\nNot right:');
  for (const f of report.failures) console.log(`  [${f.verdict}] ${f.case.q}  ->  want ${f.case.tool}${f.case.item ? ' ' + f.case.item : ''}${f.case.name ? ' ' + f.case.name : ''}, got ${f.got.tool}${f.got.item ? ' ' + f.got.item : ''}${f.got.name ? ' ' + f.got.name : ''}`);
}
