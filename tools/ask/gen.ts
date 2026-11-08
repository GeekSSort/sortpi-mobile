// Makes training data for a small model that turns a Bangla / Banglish question into a lookup plan.
//   node --experimental-strip-types tools/ask/gen.ts [--n 30000] [--seed 1]
// Writes tools/ask/out/train.jsonl and valid.jsonl (chat messages: shop, question, plan) and prints what is in them. The output folder is not committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compactSystem, TOOLS, type Period } from '../../src/ask/plan.ts';
import { NAMES, PERIODS, REFUSE, SHAPES, SHOPS, type Shop } from './lexicon.ts';
import { mulberry32, noisy, pick, type Rng } from './noise.ts';

const arg = (k: string, d: number) => Number(process.argv[process.argv.indexOf(`--${k}`) + 1]) || d;
const N = arg('n', 30000);
const rng: Rng = mulberry32(arg('seed', 1));
const OUT = fileURLToPath(new URL('./out/', import.meta.url));

/** The same sentence shape always lands on the same side, so validation sentences are never seen in training. */
const isValid = (shape: string, text: string): boolean => [...`${shape}|${text}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 10 === 0;

const none = { tool: 'none', period: 'today', item: '', name: '' } as const;
type Row = { split: 'train' | 'valid'; system: string; plan: string; tool: string; trade: string; q: string };
const rows: Row[] = [];

function fill(text: string, shop: Shop, period: Period | null) {
  const item = pick(rng, shop.items);
  const person = pick(rng, NAMES);
  let said = text;
  let hasItem = false;
  let hasName = false;
  said = said.replace('{P}', () => (period ? pick(rng, PERIODS[period]) : '')).replace('{I}', () => ((hasItem = true), pick(rng, item.says))).replace('{N}', () => ((hasName = true), pick(rng, person.says))).replace('{U}', () => pick(rng, shop.units));
  return { said: said.replace(/\s+/g, ' ').trim(), item: hasItem ? item.en : '', name: hasName ? person.en : '' };
}

for (let k = 0; k < N; k += 1) {
  const shop = pick(rng, SHOPS);
  // a role that may not open some lookups (a cashier has no reports): the right answer for those is "none"
  const limited = rng() < 0.15;
  const tools = new Set(shop.allowed.filter((t) => !(limited && ['profit', 'sales_by_cashier', 'sales_by_branch', 'customer_dues', 'supplier_dues', 'sales_by_category'].includes(t) && rng() < 0.7)));
  const ctx = { business: shop.business, features: shop.features, tools: TOOLS.filter((t) => tools.has(t.id)) };
  const level = 0.15 + rng() * 0.45;
  let q: string;
  let plan: Record<string, string>;
  let shapeId: string;
  let text: string;
  const roll = rng();
  if (roll < 0.14) {
    text = pick(rng, REFUSE);
    shapeId = 'refuse';
    q = noisy(rng, fill(text, shop, null).said, level);
    plan = { ...none };
  } else {
    const shape = pick(rng, SHAPES);
    text = pick(rng, shape.text);
    shapeId = shape.id;
    const periodKey: Period = pick(rng, ['today', 'today', 'today', 'yesterday', 'week', 'month'] as Period[]);
    // The label's period is only what the sentence says: a sentence with no period word means today (orders: this week).
    const says = shape.period && text.includes('{P}') && !(periodKey === 'today' && rng() < 0.3) ? periodKey : null;
    const f = fill(text, shop, says);
    q = noisy(rng, f.said, level);
    plan = tools.has(shape.tool) ? { tool: shape.tool, period: says ?? (shape.tool === 'orders_due' ? 'week' : 'today'), item: f.item, name: f.name } : { ...none };
  }
  const split = isValid(shapeId, text) ? 'valid' : 'train';
  rows.push({ split, system: compactSystem(ctx), plan: JSON.stringify(plan), tool: plan.tool, trade: shop.trade, q });
}

mkdirSync(OUT, { recursive: true });
for (const s of ['train', 'valid'] as const) writeFileSync(`${OUT}${s}.jsonl`, rows.filter((r) => r.split === s).map((r) => JSON.stringify({ messages: [{ role: 'system', content: r.system }, { role: 'user', content: r.q }, { role: 'assistant', content: r.plan }] })).join('\n') + '\n');
writeFileSync(`${OUT}samples.txt`, rows.slice(0, 80).map((r) => `${r.trade.padEnd(11)} ${r.q.padEnd(48)} -> ${r.plan}`).join('\n') + '\n');

const count = <T,>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, number>>((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const train = rows.filter((r) => r.split === 'train');
const promptChars = Math.round(rows.reduce((n, r) => n + r.system.length + r.q.length + 60, 0) / rows.length);
console.log(`${rows.length} examples: ${train.length} train, ${rows.length - train.length} valid (sentence shapes never shared).`);
console.log(`average prompt ${promptChars} characters (about ${Math.round(promptChars / 3.6)} tokens); the prompted model reads about 2300.`);
console.log('by lookup:', JSON.stringify(count(rows, (r) => r.tool)));
console.log('by trade :', JSON.stringify(count(rows, (r) => r.trade)));
console.log(`written to ${OUT}`);
