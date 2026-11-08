// Measures the assistant on the hand-written test set.   node --experimental-strip-types tools/ask/eval.ts [--failures]
import { evaluate, formatReport, matcherAnswer } from '../../src/ask/eval.ts';
import { TESTSET } from '../../src/ask/testset.ts';

const report = evaluate(TESTSET, matcherAnswer);
console.log(formatReport(report, `Word matcher only (no model), ${TESTSET.length} questions`));
if (process.argv.includes('--failures')) {
  console.log('\nNot right:');
  for (const f of report.failures) console.log(`  [${f.verdict}] ${f.case.layer.padEnd(8)} ${f.case.q}  ->  want ${f.case.tool}${f.case.item ? ' ' + f.case.item : ''}${f.case.name ? ' ' + f.case.name : ''}, got ${f.got.tool}${f.got.item ? ' ' + f.got.item : ''}`);
}
