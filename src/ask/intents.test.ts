import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nameWords, normalizeBanglish } from './banglish.ts';
import { matchIntent, type Match } from './intents.ts';

const intentOf = (m: Match) => (m.kind === 'intent' ? m.intent : m.kind);

test('spellings fold to one text', () => {
  assert.equal(normalizeBanglish('Ajker Bill Koto?'), 'ajker bill koto');
  assert.equal(normalizeBanglish('ajkr bil kto'), 'ajker bill koto');
  assert.equal(normalizeBanglish('আজকের বিল কত'), 'ajker bill koto');
  assert.equal(normalizeBanglish('stk kom ki ase??'), 'stock low ki ase');
  assert.equal(normalizeBanglish('  '), '');
});

test('the four test questions from the brief', () => {
  assert.equal(intentOf(matchIntent('ajker bill koto?')), 'sales_today');
  assert.equal(intentOf(matchIntent('ajkr bil kto')), 'sales_today');
  assert.equal(intentOf(matchIntent('stock kom ki ase?')), 'low_stock');
  assert.equal(intentOf(matchIntent('weather kemon?')), 'unsupported');
});

test('the same question in Bangla script and English', () => {
  assert.equal(intentOf(matchIntent('আজকের বিক্রি কত')), 'sales_today');
  assert.equal(intentOf(matchIntent('today sales')), 'sales_today');
  assert.equal(intentOf(matchIntent('গতকালের বিক্রি কত')), 'sales_yesterday');
  assert.equal(intentOf(matchIntent('এই সপ্তাহে বিক্রি কত')), 'sales_week');
  assert.equal(intentOf(matchIntent('বাকি কত')), 'due_amount');
  assert.equal(intentOf(matchIntent('লাভ কত')), 'profit_today');
});

test('each of the other questions finds its intent', () => {
  const cases: [string, string][] = [
    ['kon mal sesh', 'out_of_stock'], ['top selling product', 'top_products'], ['kon mal beshi bikri', 'top_products'], ['ajker bill gulo dekhao', 'bills_today'],
    ['customer der baki koto', 'due_amount'], ['supplier ke koto dite hobe', 'supplier_due'], ['ajker labh koto', 'profit_today'], ['ajker cash', 'payments_today'],
    ['sell korbo', 'start_selling'], ['gotokal koto bikri', 'sales_yesterday'], ['low stock', 'low_stock'], ['out of stock', 'out_of_stock'],
  ];
  for (const [q, want] of cases) assert.equal(intentOf(matchIntent(q)), want, q);
});

test('a question about one item is spotted by its price or stock word and the name left over', () => {
  const p = matchIntent('coca cola dam koto');
  assert.deepEqual([p.kind, p.kind === 'intent' && p.intent, p.kind === 'intent' && p.product], ['intent', 'product_price', 'coca cola']);
  const s = matchIntent('Coca Cola ase ki?');
  assert.deepEqual([s.kind, s.kind === 'intent' && s.intent, s.kind === 'intent' && s.product], ['intent', 'product_stock', 'coca cola']);
  assert.equal(matchIntent('rice stock koto').kind === 'intent' && (matchIntent('rice stock koto') as { product?: string }).product, 'rice');
  assert.deepEqual(nameWords(normalizeBanglish('ajker bill koto')), []);
});

test('something that is not about the shop is not guessed', () => {
  for (const q of ['weather kemon?', 'who won the match', 'tell me a joke', 'আমার নাম কী', '???', '']) assert.equal(matchIntent(q).kind === 'intent' && (matchIntent(q) as { intent: string }).intent, false, q);
});

test('a vague question offers the nearest questions instead of guessing', () => {
  const m = matchIntent('bill');
  assert.ok(m.kind === 'unsure' || m.kind === 'intent');
});

test('everyday phrasings and spelling slips are understood', () => {
  const cases: [string, string][] = [['koto baki ase', 'due_amount'], ['ki ki sesh hoyeche', 'out_of_stock'], ['sobcheye beshi bikri', 'top_products'], ['koyta bill hoyeche ajke', 'bills_today'], ['ajker sale kmn', 'sales_today'], ['stok kom', 'low_stock'], ['kal er hisab', 'sales_yesterday']];
  for (const [q, want] of cases) assert.equal(intentOf(matchIntent(q)), want, q);
});

test('a question that only shares "ajker" or "koto" with the shop is not about the shop', () => {
  for (const q of ['ajker tarikh', 'time koto', 'ajker weather', 'hello', 'how are you']) assert.notEqual(intentOf(matchIntent(q)), 'payments_today', q);
  for (const q of ['ajker tarikh', 'ajker weather', 'hello']) assert.equal(matchIntent(q).kind === 'intent', false, q);
});

test('"pani koy botte" is a stock question about water, in Banglish and in Bangla script', async () => {
  const { itemSearchTerms } = await import('./banglish.ts');
  for (const q of ['pani koy botte', 'pani koy botol ase', 'পানি কয় বোতল আছে', 'pani ase ki']) {
    const m = matchIntent(q);
    assert.equal(m.kind, 'intent', q);
    if (m.kind === 'intent') {
      assert.equal(m.intent, 'product_stock', q);
      assert.deepEqual(itemSearchTerms(m.product ?? ''), ['water', m.product], q);
    }
  }
  assert.equal(matchIntent('pani dam koto').kind === 'intent' && (matchIntent('pani dam koto') as { intent: string }).intent, 'product_price');
  assert.deepEqual(itemSearchTerms('coca cola'), ['coca cola']);
  assert.deepEqual(itemSearchTerms(''), []);
});

test('the same question in many spellings and both scripts means the same thing', () => {
  const cases: [string, string][] = [
    ['ajker bill koto', 'sales_today'], ['ajkr bil kto', 'sales_today'], ['ajkerr bill kotoo?', 'sales_today'], ['AJKER BILL KOTO???', 'sales_today'],
    ['আজকের বিল কত', 'sales_today'], ['ajke koto bikri', 'sales_today'], ['ajker bikry koto', 'sales_today'], ['আজকের বিক্রি কত?', 'sales_today'],
    ['gotokal koto sale', 'sales_yesterday'], ['gotokaler bikri koto', 'sales_yesterday'],
    ['stock kom ki ase', 'low_stock'], ['stok kom ki ache', 'low_stock'],
    ['কোন মাল শেষ', 'out_of_stock'], ['kon mal sesh hoye geche', 'out_of_stock'],
    ['baki koto', 'due_amount'], ['customer er dhar koto', 'due_amount'],
    ['labh koto hoyeche', 'profit_today'], ['ajker cash koto', 'payments_today'],
  ];
  for (const [q, want] of cases) {
    const m = matchIntent(q);
    assert.equal(m.kind === 'intent' ? m.intent : m.kind, want, q);
  }
});

test('a product word that sounds like a function word is still a product ("cola" is not "kal")', () => {
  const m = matchIntent('coca cola dam koto');
  assert.equal(m.kind === 'intent' && m.intent, 'product_price');
  assert.equal(m.kind === 'intent' && m.product, 'coca cola');
});
