import Fuse from 'fuse.js';

import { nameWords, normalizeBanglish } from './banglish.ts';
import { normalizeText } from './text.ts';

export type IntentId =
  | 'sales_today' | 'sales_yesterday' | 'sales_week' | 'low_stock' | 'out_of_stock' | 'top_products' | 'bills_today'
  | 'due_amount' | 'supplier_due' | 'profit_today' | 'payments_today' | 'product_price' | 'product_stock' | 'start_selling' | 'stock_summary';

export type Intent = { id: IntentId; examples: string[] };

/** What a person can ask, with a dozen ways to ask it: Banglish, misspelt, Bangla script and English. The matcher learns nothing; this list is the knowledge. */
export const INTENTS: Intent[] = [
  { id: 'sales_today', examples: ['ajker bikri dekhao', 'ajker sale dekhao', 'ajker hisab dekhao', 'aj er bikri dekhi', 'ajker bill koto', 'ajker sale koto', 'ajke koto bikri', 'ajkr bil kto', 'aj koto bikri hoyeche', 'ajker hisab koto', 'today sales', 'আজকের বিক্রি কত', 'ajker total sale', 'ajker bikri', 'aj koto taka sale', 'ajker bikri koto taka', 'sales today', 'ajker sale'] },
  { id: 'sales_yesterday', examples: ['gotokal koto bikri', 'kal koto sale hoyechilo', 'gotokaler bill koto', 'yesterday sales', 'গতকালের বিক্রি কত', 'kalker hisab koto', 'gotokal er sale', 'gotokaler bikri'] },
  { id: 'sales_week', examples: ['ei soptaher bikri koto', 'week sale koto', '7 diner bikri', 'soptahe koto sale', 'last 7 days sales', 'এই সপ্তাহে বিক্রি কত', 'soptaher sale koto', 'weekly sales'] },
  { id: 'low_stock', examples: ['stock kom ki ase', 'kon kon mal kom', 'stock kom', 'kon product kom hoye ashche', 'low stock', 'কোন মাল কম', 'ki ki kinte hobe', 'kom stock ki ki', 'reorder lagbe ki', 'kon mal kom ase'] },
  { id: 'out_of_stock', examples: ['kon mal sesh', 'sesh hoye geche ki ki', 'stock nai ki', 'out of stock', 'মাল শেষ', 'finished items', 'kon mal nai', 'ki ki sesh', 'ki ki sesh hoyeche', 'kon kon mal sesh hoyeche'] },
  { id: 'top_products', examples: ['kon mal beshi bikri', 'top selling product', 'sera bikrir mal', 'best seller', 'সবচেয়ে বেশি বিক্রি', 'ki beshi bikri hocche', 'top product', 'beshi bikri hoy kon mal', 'sobcheye beshi bikri', 'sobcheye beshi bikri hoy ki'] },
  { id: 'bills_today', examples: ['ajker bill gulo dekhao', 'ajker bill list', 'today bills', 'ajker invoice dekhao', 'ajker bill koyta', 'কয়টা বিল', 'ajker koyta bill', 'ajker bill dekhi', 'koyta bill hoyeche ajke', 'ajke koyta bill hoyeche'] },
  { id: 'due_amount', examples: ['customer der baki koto', 'kar kache koto baki', 'baki koto', 'who owes', 'বাকি কত', 'customer baki', 'kon customer baki', 'baki ase ki', 'koto baki ase', 'baki koto ase', 'kar baki ase'] },
  { id: 'supplier_due', examples: ['supplier ke koto dite hobe', 'supplier baki', 'mahajon ke koto dibo', 'ami koto dibo', 'supplier due', 'সাপ্লায়ারকে কত দিতে হবে', 'supplier der baki koto'] },
  { id: 'profit_today', examples: ['ajker labh koto', 'profit koto', 'ajke koto labh', 'লাভ কত', 'today profit', 'ajker profit', 'labh koto hoyeche'] },
  { id: 'payments_today', examples: ['ajker nogod koto', 'nagad koto ajke', 'নগদ কত', 'ajker nagad ar cash koto', 'cash koto ajke', 'bkash koto', 'kon payment method beshi', 'ajker cash', 'ajker taka koto ashche', 'payment koto ajke', 'ajker payment'] },
  { id: 'stock_summary', examples: ['stock dekhao', 'mot stock koto', 'মোট স্টক কত', 'stock er hisab dekhao', 'total stock', 'sob mal koto ase', 'stock value koto', 'amar stock dekhao', 'dokaner stock koto', 'stock e koto taka mal ase', 'স্টক দেখাও'] },
  { id: 'start_selling', examples: ['bikri korbo', 'sell korbo', 'bill korbo', 'new sale', 'বিক্রি করব', 'notun bill', 'sale suru'] },
];

type Doc = { intent: IntentId; text: string };
const corpus: Doc[] = INTENTS.flatMap((i) => i.examples.map((e) => ({ intent: i.id, text: normalizeBanglish(e) })));
const fuse = new Fuse(corpus, { keys: ['text'], includeScore: true, threshold: 0.4, ignoreLocation: true, minMatchCharLength: 2 });

/** Sure enough to answer without asking: the score is 0 for a perfect match, so this is 1 minus it. */
export const SURE = 0.6;

export type Match =
  | { kind: 'intent'; intent: IntentId; confidence: number; product?: string }
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

export function matchIntent(input: string): Match {
  if (asksAboutTomorrow(input)) return { kind: 'unsupported', confidence: 0 };
  const norm = normalizeBanglish(input);
  if (!norm) return { kind: 'unsupported', confidence: 0 };
  const bare = bareTopic(norm);
  if (bare) return { kind: 'intent', intent: bare, confidence: 1 };
  const words = tokens(norm);
  const name = nameWords(norm).join(' ');
  if (name) {
    if (words.has('price')) return { kind: 'intent', intent: 'product_price', confidence: 1, product: name };
    if (words.has('stock') || words.has('ase') || words.has('koyta')) return { kind: 'intent', intent: 'product_stock', confidence: 1, product: name };
  }
  const found = fuse.search(norm).slice(0, 12);
  const best = found[0];
  if (!best) return { kind: 'unsupported', confidence: 0 };
  const confidence = 1 - (best.score ?? 1);
  // A strong score alone can be a coincidence between short strings: it must also share a topic word (not just "ajker" or "koto") with the question it matched.
  const shares = topicShared(best.item.text, words);
  if (confidence >= SURE && shares) return { kind: 'intent', intent: best.item.intent, confidence };
  const suggestions = [...new Set(found.filter((f) => 1 - (f.score ?? 1) >= 0.45 && topicShared(f.item.text, words)).map((f) => f.item.intent))].slice(0, 3);
  return suggestions.length ? { kind: 'unsure', confidence, suggestions } : { kind: 'unsupported', confidence };
}

/** The item name left in a question once the question words are taken out ("coca cola dam koto" gives "coca cola"); empty when there is none. */
export const productNameIn = (input: string): string => nameWords(normalizeBanglish(input)).join(' ');
