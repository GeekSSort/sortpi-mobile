import Fuse from 'fuse.js';

import { nameWords, normalizeBanglish } from './banglish.ts';
import { slotPlan } from './slots.ts';
import { normalizeText } from './text.ts';
import type { Plan } from './plan.ts';

export type IntentId =
  | 'sales_today' | 'sales_yesterday' | 'sales_week' | 'low_stock' | 'out_of_stock' | 'top_products' | 'bills_today'
  | 'due_amount' | 'supplier_due' | 'profit_today' | 'payments_today' | 'product_price' | 'product_stock' | 'start_selling' | 'stock_summary' | 'customer_balance' | 'metal_rates' | 'expiring_soon' | 'expired_stock' | 'orders_due';

export type Intent = { id: IntentId; examples: string[] };

/** What a person can ask, with a dozen ways to ask it: Banglish, misspelt, Bangla script and English. The matcher learns nothing; this list is the knowledge. */
export const INTENTS: Intent[] = [
  { id: 'sales_today', examples: ['ajker bikri koto dekhao', 'ajker bill koto dekhao', 'dekhao ajker bikri', 'ajker bikri dekhao', 'ajker sale dekhao', 'ajker hisab dekhao', 'aj er bikri dekhi', 'ajker bill koto', 'ajker sale koto', 'ajke koto bikri', 'ajkr bil kto', 'aj koto bikri hoyeche', 'ajker hisab koto', 'today sales', 'আজকের বিক্রি কত', 'ajker total sale', 'ajker bikri', 'aj koto taka sale', 'ajker bikri koto taka', 'sales today', 'ajker sale'] },
  { id: 'sales_yesterday', examples: ['gotokal bikri koto', 'gotokal er bikri koto', 'gotokal koto bikri', 'kal koto sale hoyechilo', 'gotokaler bill koto', 'yesterday sales', 'গতকালের বিক্রি কত', 'kalker hisab koto', 'gotokal er sale', 'gotokaler bikri'] },
  { id: 'sales_week', examples: ['ei soptaher bikri koto', 'week sale koto', '7 diner bikri', 'soptahe koto sale', 'last 7 days sales', 'এই সপ্তাহে বিক্রি কত', 'soptaher sale koto', 'weekly sales'] },
  { id: 'low_stock', examples: ['stock kom ache ki', 'ki ki kinbo', 'kon mal kinte hobe', 'ki mal ana lagbe', 'kom mal dekhao', 'ki ki order dibo', 'stock kom ki ase', 'kon kon mal kom', 'stock kom', 'kon product kom hoye ashche', 'low stock', 'কোন মাল কম', 'ki ki kinte hobe', 'kom stock ki ki', 'reorder lagbe ki', 'kon mal kom ase'] },
  { id: 'out_of_stock', examples: ['sesh hoye jawa mal dekhao', 'kon kon mal sesh hoye gese', 'kon mal sesh', 'sesh hoye geche ki ki', 'stock nai ki', 'out of stock', 'মাল শেষ', 'finished items', 'kon mal nai', 'ki ki sesh', 'ki ki sesh hoyeche', 'kon kon mal sesh hoyeche'] },
  { id: 'top_products', examples: ['sobcheye beshi kon mal bikri hoy', 'sobcheye beshi bikri kon mal', 'kon mal beshi bikri', 'top selling product', 'sera bikrir mal', 'best seller', 'সবচেয়ে বেশি বিক্রি', 'ki beshi bikri hocche', 'top product', 'beshi bikri hoy kon mal', 'sobcheye beshi bikri', 'sobcheye beshi bikri hoy ki'] },
  { id: 'bills_today', examples: ['ajker bill gulo dekhao', 'ajker bill list', 'today bills', 'ajker invoice dekhao', 'ajker bill koyta', 'কয়টা বিল', 'ajker koyta bill', 'ajker bill dekhi', 'koyta bill hoyeche ajke', 'ajke koyta bill hoyeche'] },
  { id: 'due_amount', examples: ['customer baki koto', 'customer dhar koto', 'customer er kache baki koto', 'customer der kache mot baki koto', 'customer der baki koto', 'kar kache koto baki', 'baki koto', 'who owes', 'বাকি কত', 'customer baki', 'kon customer baki', 'baki ase ki', 'koto baki ase', 'baki koto ase', 'kar baki ase'] },
  { id: 'supplier_due', examples: ['supplier ke koto dite hobe', 'supplier baki', 'mahajon ke koto dibo', 'ami koto dibo', 'supplier due', 'সাপ্লায়ারকে কত দিতে হবে', 'supplier der baki koto'] },
  { id: 'profit_today', examples: ['ajker labh koto', 'profit koto', 'ajke koto labh', 'লাভ কত', 'today profit', 'ajker profit', 'labh koto hoyeche'] },
  { id: 'payments_today', examples: ['ajker nogod koto', 'nagad koto ajke', 'নগদ কত', 'ajker nagad ar cash koto', 'cash koto ajke', 'bkash koto', 'kon payment method beshi', 'ajker cash', 'ajker taka koto ashche', 'payment koto ajke', 'ajker payment'] },
  { id: 'stock_summary', examples: ['stock dekhao', 'mot stock koto', 'মোট স্টক কত', 'stock er hisab dekhao', 'total stock', 'sob mal koto ase', 'stock value koto', 'amar stock dekhao', 'dokaner stock koto', 'stock e koto taka mal ase', 'স্টক দেখাও'] },
  { id: 'metal_rates', examples: ['sonar dam koto', 'gold rate', 'ajker sonar dam', 'soner rate', 'rupar dam koto', 'সোনার দাম কত', 'gold price today', 'sonar rate dekhao'] },
  { id: 'expiring_soon', examples: ['kon oshudher meyad sesh hoye jabe', 'kon mal er meyad sesh hoye jabe', 'meyad sesh hobe', 'kon mal er meyad sesh hoye jabe', 'kon oshudher meyad sesh hobe', 'expiry hobe ki ki', 'kobe meyad sesh hobe', 'মেয়াদ শেষ হবে', 'meyad sesh hobe emon mal dekhao', 'near expiry mal'] },
  { id: 'expired_stock', examples: ['meyad sesh hoye geche', 'meyad ses hoye geche', 'expired mal', 'expired mal koto', 'মেয়াদ উত্তীর্ণ মাল', 'expire hoye gese', 'meyad pera mal'] },
  { id: 'orders_due', examples: ['kon order dite hobe', 'order koyta baki', 'dorji er order baki', 'pending order', 'ei soptahe order dite hobe', 'kon order er somoy hoyeche', 'repair er order baki'] },
  { id: 'start_selling', examples: ['bikri suru korbo', 'বিক্রি শুরু করব', 'sale suru korbo', 'bikri korbo', 'sell korbo', 'bill korbo', 'new sale', 'বিক্রি করব', 'notun bill', 'sale suru'] },
];

type Doc = { intent: IntentId; text: string };
const corpus: Doc[] = INTENTS.flatMap((i) => i.examples.map((e) => ({ intent: i.id, text: normalizeBanglish(e) })));
const fuse = new Fuse(corpus, { keys: ['text'], includeScore: true, threshold: 0.4, ignoreLocation: true, minMatchCharLength: 2 });

/** Sure enough to answer without asking: the score is 0 for a perfect match, so this is 1 minus it. */
export const SURE = 0.6;

export type Match =
  | { kind: 'intent'; intent: IntentId; confidence: number; product?: string }
  | { kind: 'plan'; plan: Plan; confidence: number }
  | { kind: 'unsure'; confidence: number; suggestions: IntentId[] }
  | { kind: 'unsupported'; confidence: number };

const tokens = (s: string) => new Set(s.split(' ').filter(Boolean));
/** Words that appear in many questions and say nothing about the topic: sharing only these is a coincidence. */
const GENERIC = new Set(['ajker', 'gotokal', 'koto', 'ki', 'ase', 'ke', 'er', 'hobe', 'dite', 'hoyeche', 'ta']);
const topicShared = (example: string, words: Set<string>) => [...tokens(example)].some((w) => words.has(w) && !GENERIC.has(w));

/**
 * Works out what was asked. An item question ("coca cola dam koto", "coca cola ase ki") is spotted by its price or stock word plus a
 * name left over; everything else is matched fuzzily against the examples. A weak match is never guessed: the caller gets the nearest
 * questions to offer, or "not supported" for something that is not about the shop.
 */
/** "Kal" is yesterday AND tomorrow. A future verb in the same sentence ("kal koto bikri hobe") means tomorrow, which no shop data can answer. */
const BARE_KAL = new Set(['kal', 'kaler', 'kalker', 'kalke', 'কাল', 'কালকের', 'কালকে', 'কালের']);
const FUTURE = new Set(['hobe', 'hobey', 'hobo', 'hoibo', 'hoibe', 'dibo', 'debo', 'korbo', 'korbe', 'ashbe', 'asbe', 'jabe', 'lagbe', 'porbe', 'হবে', 'দিব', 'দেব', 'করব', 'করবে', 'লাগবে', 'পড়বে', 'আসবে', 'যাবে']);
export function asksAboutTomorrow(input: string): boolean {
  const words = normalizeText(input).split(' ');
  return words.some((w) => BARE_KAL.has(w)) && words.some((w) => FUTURE.has(w));
}


/**
 * People do not ask "what is the total of my stock"; they say "stock dekhao". A command, or "koto", with one topic word and nothing else
 * (no item name, no "low", no "finished") means the plain picture of that topic. Words that only mean "show", "my", "total" or "now" are dropped first.
 */
const FILLER = new Set(['dekhao', 'koto', 'ki', 'ase', 'er', 'e', 'ta', 'ke', 'total', 'my', 'ar', 'ki', 'ekta', 'ekhon']);
const BARE: Record<string, IntentId> = { stock: 'stock_summary', product: 'stock_summary', sale: 'sales_today', bill: 'bills_today', baki: 'due_amount', profit: 'profit_today', taka: 'payments_today' };
const STOCK_EXTRAS = new Set(['stock', 'product', 'bill', 'hisab', 'taka', 'value', 'price']);
export function bareTopic(norm: string): IntentId | null {
  const content = norm.split(' ').filter((w) => w && !FILLER.has(w));
  if (content.length === 0) return null;
  if (content.includes('stock') || content.includes('product')) return content.every((w) => STOCK_EXTRAS.has(w)) ? 'stock_summary' : null; // "stock kom" and "stock sesh" are other questions
  return content.length === 1 ? (BARE[content[0]] ?? null) : null;
}

/** Words that ask to CHANGE something (a price, a record, a payment). The assistant only reads, so these are never turned into a lookup. */
const ACTION = new Set(['advice', 'change', 'likho', 'likhe', 'joma', 'kete', 'cancel', 'batil', 'dilam', 'nilam', 'niyechi', 'diyechi', 'muche', 'delete', 'jog', 'eshechhe', 'bodlao', 'বাতিল', 'লিখো', 'লিখে', 'জমা', 'দিলাম', 'নিলাম', 'নিয়েছি', 'দিয়েছি']);

const SLOT_ONLY = new Set(['sales_by_category', 'sales_by_cashier', 'sales_by_branch', 'sales_by_day', 'item_sales', 'orders_due']);

export function matchIntent(input: string): Match {
  if (asksAboutTomorrow(input)) return { kind: 'unsupported', confidence: 0 };
  const norm = normalizeBanglish(input);
  if (norm.split(' ').some((w) => ACTION.has(w))) return { kind: 'unsupported', confidence: 0 };
  // What the older questions already say for today (sales, profit, bills, payments) stays with them; the slot parser takes what they cannot say:
  // another period, "by cashier", "by category", one item's sales, orders.
  const slots = slotPlan(norm);
  if (slots && (SLOT_ONLY.has(slots.tool) || slots.period !== 'today')) return { kind: 'plan', plan: slots, confidence: 1 };
  if (!norm) return { kind: 'unsupported', confidence: 0 };
  const bare = bareTopic(norm);
  if (bare) return { kind: 'intent', intent: bare, confidence: 1 };
  const words = tokens(norm);
  if (words.has('gold') && (words.has('price') || words.has('koto') || words.has('dekhao'))) return { kind: 'intent', intent: 'metal_rates', confidence: 1 };
  const name = nameWords(norm).join(' ');
  // "karim er baki koto", "karim er hisab dekhao": one person's balance (a "customer" or "supplier" word means the whole list instead)
  if (name && (words.has('baki') || words.has('hisab')) && !words.has('customer') && !words.has('supplier') && !words.has('price') && !words.has('stock')) return { kind: 'intent', intent: 'customer_balance', confidence: 1, product: name };
  if (name) {
    if (words.has('price')) return { kind: 'intent', intent: 'product_price', confidence: 1, product: name };
    if (words.has('stock') || words.has('ase') || words.has('koyta')) return { kind: 'intent', intent: 'product_stock', confidence: 1, product: name };
  }
  const found = fuse.search(norm).slice(0, 12);
  const best = found[0];
  const ifNothing = (m: Match): Match => (slots ? { kind: 'plan', plan: slots, confidence: 1 } : m); // the slot parser reads what the stored questions did not
  if (!best) return ifNothing({ kind: 'unsupported', confidence: 0 });
  const confidence = 1 - (best.score ?? 1);
  // A strong score alone can be a coincidence between short strings: it must also share a topic word (not just "ajker" or "koto") with the question it matched.
  const shares = topicShared(best.item.text, words);
  if (confidence >= SURE && shares) return { kind: 'intent', intent: best.item.intent, confidence };
  const suggestions = [...new Set(found.filter((f) => 1 - (f.score ?? 1) >= 0.45 && topicShared(f.item.text, words)).map((f) => f.item.intent))].slice(0, 3);
  return ifNothing(suggestions.length ? { kind: 'unsure', confidence, suggestions } : { kind: 'unsupported', confidence });
}

/** The item name left in a question once the question words are taken out ("coca cola dam koto" gives "coca cola"); empty when there is none. */
export const productNameIn = (input: string): string => nameWords(normalizeBanglish(input)).join(' ');
