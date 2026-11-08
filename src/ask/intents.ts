import Fuse from 'fuse.js';

import { nameWords, normalizeBanglish } from './banglish.ts';

export type IntentId =
  | 'sales_today' | 'sales_yesterday' | 'sales_week' | 'low_stock' | 'out_of_stock' | 'top_products' | 'bills_today'
  | 'due_amount' | 'supplier_due' | 'profit_today' | 'payments_today' | 'product_price' | 'product_stock' | 'start_selling';

export type Intent = { id: IntentId; examples: string[] };

/** What a person can ask, with a dozen ways to ask it: Banglish, misspelt, Bangla script and English. The matcher learns nothing; this list is the knowledge. */
export const INTENTS: Intent[] = [
  { id: 'sales_today', examples: ['ajker bill koto', 'ajker sale koto', 'ajke koto bikri', 'ajkr bil kto', 'aj koto bikri hoyeche', 'ajker hisab koto', 'today sales', 'আজকের বিক্রি কত', 'ajker total sale', 'ajker bikri', 'aj koto taka sale', 'ajker bikri koto taka', 'sales today', 'ajker sale'] },
  { id: 'sales_yesterday', examples: ['gotokal koto bikri', 'kal koto sale hoyechilo', 'gotokaler bill koto', 'yesterday sales', 'গতকালের বিক্রি কত', 'kalker hisab koto', 'gotokal er sale', 'gotokaler bikri'] },
  { id: 'sales_week', examples: ['ei soptaher bikri koto', 'week sale koto', '7 diner bikri', 'soptahe koto sale', 'last 7 days sales', 'এই সপ্তাহে বিক্রি কত', 'soptaher sale koto', 'weekly sales'] },
  { id: 'low_stock', examples: ['stock kom ki ase', 'kon kon mal kom', 'stock kom', 'kon product kom hoye ashche', 'low stock', 'কোন মাল কম', 'ki ki kinte hobe', 'kom stock ki ki', 'reorder lagbe ki', 'kon mal kom ase'] },
  { id: 'out_of_stock', examples: ['kon mal sesh', 'sesh hoye geche ki ki', 'stock nai ki', 'out of stock', 'মাল শেষ', 'finished items', 'kon mal nai', 'ki ki sesh', 'ki ki sesh hoyeche', 'kon kon mal sesh hoyeche'] },
  { id: 'top_products', examples: ['kon mal beshi bikri', 'top selling product', 'sera bikrir mal', 'best seller', 'সবচেয়ে বেশি বিক্রি', 'ki beshi bikri hocche', 'top product', 'beshi bikri hoy kon mal', 'sobcheye beshi bikri', 'sobcheye beshi bikri hoy ki'] },
  { id: 'bills_today', examples: ['ajker bill gulo dekhao', 'ajker bill list', 'today bills', 'ajker invoice dekhao', 'ajker bill koyta', 'কয়টা বিল', 'ajker koyta bill', 'ajker bill dekhi', 'koyta bill hoyeche ajke', 'ajke koyta bill hoyeche'] },
  { id: 'due_amount', examples: ['customer der baki koto', 'kar kache koto baki', 'baki koto', 'who owes', 'বাকি কত', 'customer baki', 'kon customer baki', 'baki ase ki', 'koto baki ase', 'baki koto ase', 'kar baki ase'] },
  { id: 'supplier_due', examples: ['supplier ke koto dite hobe', 'supplier baki', 'mahajon ke koto dibo', 'ami koto dibo', 'supplier due', 'সাপ্লায়ারকে কত দিতে হবে', 'supplier der baki koto'] },
  { id: 'profit_today', examples: ['ajker labh koto', 'profit koto', 'ajke koto labh', 'লাভ কত', 'today profit', 'ajker profit', 'labh koto hoyeche'] },
  { id: 'payments_today', examples: ['cash koto ajke', 'bkash koto', 'kon payment method beshi', 'ajker cash', 'ajker taka koto ashche', 'payment koto ajke', 'ajker payment'] },
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
export function matchIntent(input: string): Match {
  const norm = normalizeBanglish(input);
  if (!norm) return { kind: 'unsupported', confidence: 0 };
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
