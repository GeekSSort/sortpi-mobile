// Writes the test questions with the shop each is asked in, for a model run.   node --experimental-strip-types tools/ask/export-eval.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compactSystem, TOOLS } from '../../src/ask/plan.ts';
import { TESTSET } from '../../src/ask/testset.ts';
import { HOLDOUT } from '../../src/ask/testset-holdout.ts';
import { SHOPS } from './lexicon.ts';

const OUT = fileURLToPath(new URL('./out/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const grocery = SHOPS.find((s) => s.trade === 'grocery')!;
const rows = [...TESTSET.map((c) => ({ set: 'tuned', c })), ...HOLDOUT.map((c) => ({ set: 'holdout', c }))].map(({ set, c }) => {
  const shop = SHOPS.find((s) => s.trade === c.trade) ?? grocery; // a trade question is asked in a shop of that trade, the rest in a grocery
  const tools = TOOLS.filter((t) => shop.allowed.includes(t.id));
  return JSON.stringify({ set, q: c.q, system: compactSystem({ business: shop.business, features: shop.features, tools }) });
});
writeFileSync(`${OUT}eval.jsonl`, rows.join('\n') + '\n');
console.log(`${rows.length} questions written to ${OUT}eval.jsonl`);
