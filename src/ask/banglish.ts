/**
 * Shop owners type Bangla in English letters ("Banglish") and spell it however it sounds, or write it in Bangla script. Before matching,
 * every word is turned into one agreed spelling, so "ajkr bil kto", "আজকের বিল কত" and "ajker bill koto" all become the same text.
 */
import { fold, normalizeText, skeleton } from './text.ts';

const WORDS: Record<string, string[]> = {
  ajker: ['ajkr', 'ajke', 'aj', 'ajk', 'aajker', 'ajkerr', 'আজকের', 'আজ', 'today', 'todays', "today's"],
  gotokal: ['gotokal', 'gotokaler', 'kal', 'kalker', 'kaler', 'গতকাল', 'গতকালের', 'কাল', 'কালকের', 'yesterday', 'yesterdays'],
  week: ['soptah', 'soptahe', 'soptaher', 'shoptah', 'saptah', 'saptaher', 'সপ্তাহ', 'সপ্তাহে', 'সপ্তাহের', 'weekly', 'week'],
  bill: ['bil', 'bills', 'bils', 'invoice', 'invoices', 'hisab', 'hishab', 'hisaab', 'বিল', 'হিসাব', 'ইনভয়েস'],
  sale: ['sales', 'sell', 'selling', 'bikri', 'bikry', 'bikkri', 'bikrir', 'বিক্রি', 'বিক্রয়', 'বিক্রির'],
  koto: ['kto', 'kata', 'kt', 'koto', 'kotto', 'how', 'কত', 'কতো', 'কি পরিমাণ'],
  koyta: ['koita', 'koyta', 'koyti', 'kotogulo', 'koy', 'koi', 'koyti', 'কয়টা', 'কয়টি', 'কতটি', 'কতগুলো', 'কয়', 'কয়টাই', 'how many'],
  unit: ['botol', 'botte', 'botoll', 'botl', 'bottle', 'bottles', 'bottel', 'pcs', 'pc', 'piece', 'pieces', 'pis', 'pic', 'packet', 'packets', 'pkt', 'carton', 'ctn', 'dozen', 'dojon', 'বোতল', 'পিস', 'প্যাকেট', 'কার্টন', 'ডজন', 'টা', 'টি'],
  stock: ['stk', 'stok', 'stoke', 'মজুত', 'স্টক', 'inventory'],
  low: ['kom', 'kam', 'komse', 'komche', 'low', 'কম', 'কমে'],
  out: ['sesh', 'shesh', 'nai', 'nei', 'finished', 'out', 'শেষ', 'নেই'],
  price: ['prs', 'dam', 'dom', 'daam', 'mullo', 'mulyo', 'rate', 'দাম', 'মূল্য', 'রেট'],
  product: ['mal', 'maal', 'item', 'items', 'products', 'পণ্য', 'মাল', 'আইটেম'],
  baki: ['due', 'dues', 'bakee', 'dhar', 'বাকি', 'বাকী', 'ধার', 'owes', 'owe'],
  customer: ['customers', 'cstmr', 'grahok', 'grahoker', 'কাস্টমার', 'ক্রেতা', 'গ্রাহক', 'কাস্টমারদের'],
  supplier: ['suppliers', 'mahajon', 'mohajon', 'সাপ্লায়ার', 'মহাজন'],
  profit: ['labh', 'lav', 'lob', 'munafa', 'income', 'লাভ', 'মুনাফা'],
  top: ['shera', 'sera', 'best', 'beshi', 'besi', 'sobcheye', 'sobchye', 'shobcheye', 'সেরা', 'বেশি', 'সবচেয়ে'],
  ase: ['ache', 'achhe', 'asey', 'আছে', 'আছে কি', 'available'],
  ki: ['kii', 'ke', 'কি', 'কী', 'what', 'which'],
  dekhao: ['dekhaw', 'dekhan', 'show', 'dekhi', 'দেখাও', 'দেখান', 'দেখি'],
  taka: ['tk', 'taka', 'টাকা', 'cash', 'ক্যাশ'],
};
const LOOKUP: Record<string, string> = {};
/** Spelling families: the folded form of every known variant, or null when two different words fold to the same thing (then it is not used). */
const FOLDED = new Map<string, string | null>();
const SKELETONS = new Map<string, string | null>();
const remember = (map: Map<string, string | null>, key: string, canonical: string) => {
  if (!map.has(key)) map.set(key, canonical);
  else if (map.get(key) !== canonical) map.set(key, null);
};
for (const [canonical, variants] of Object.entries(WORDS)) {
  for (const v of [canonical, ...variants]) {
    LOOKUP[normalizeText(v)] = canonical; // the same Unicode form the question is cleaned into
    if (v.includes(' ')) continue; // a phrase is not one word
    remember(FOLDED, fold(v), canonical);
    if (skeleton(v).length >= 3) remember(SKELETONS, skeleton(v), canonical);
  }
}

/** One word to its agreed spelling: as listed, else the same sound spelt another way, else the same consonants (only when that is unambiguous). */
function canonicalWord(word: string): string {
  const w = word.replace(/([aeiou])\1+$/, '$1'); // "kotoo", "bikrii": stretched for emphasis
  const exact = LOOKUP[w];
  if (exact) return exact;
  // Short words are only taken when listed: folded, "cola" would sound like "kal". Longer words are safe to match by sound.
  const f = fold(w);
  const folded = f.length >= 4 ? FOLDED.get(f) : undefined;
  if (folded) return folded;
  if (w.length >= 5) {
    const k = skeleton(w);
    const bySkeleton = k.length >= 3 ? SKELETONS.get(k) : undefined;
    if (bySkeleton) return bySkeleton;
  }
  return w;
}

/** Clean the text (Unicode, digits, punctuation, case) and fold each word to its agreed spelling. */
export function normalizeBanglish(text: string): string {
  const cleaned = normalizeText(text);
  if (!cleaned) return '';
  return cleaned.split(' ').map(canonicalWord).join(' ');
}

/** Words that say what is being asked but are not a thing's name. What is left over in a question is the item the person means. */
const NOT_A_NAME = new Set(['unit', 'ajker', 'gotokal', 'week', 'bill', 'sale', 'koto', 'koyta', 'stock', 'low', 'out', 'price', 'product', 'baki', 'customer', 'supplier', 'profit', 'top', 'ase', 'ki', 'dekhao', 'taka', 'er', 'ta', 'te', 'ke', 'tar', 'dite', 'hobe', 'hoy', 'hoyeche', 'ache', 'a', 'the', 'is', 'of', 'me', 'amar', 'ekta', 'ek']);

/** The words of a question that name an item ("coca cola"), after the question words are taken away. */
export function nameWords(normalized: string): string[] {
  return normalized.split(' ').filter((w) => w.length >= 2 && !NOT_A_NAME.has(w));
}

/**
 * What shopkeepers call common goods, mapped to the English name an item is usually stored under. A shop's catalogue is mostly English,
 * so "pani" is searched as "water" first and as typed second. Add a word here when a shop asks for it.
 */
const ITEM_WORDS: Record<string, string> = {
  pani: 'water', jol: 'water', পানি: 'water', জল: 'water',
  chini: 'sugar', cini: 'sugar', চিনি: 'sugar',
  chal: 'rice', cal: 'rice', চাল: 'rice',
  tel: 'oil', তেল: 'oil',
  dim: 'egg', ডিম: 'egg',
  dudh: 'milk', dud: 'milk', দুধ: 'milk',
  lobon: 'salt', nun: 'salt', লবণ: 'salt', নুন: 'salt',
  ata: 'flour', atta: 'flour', আটা: 'flour', moyda: 'flour', ময়দা: 'flour',
  dal: 'lentil', daal: 'lentil', ডাল: 'lentil',
  peyaj: 'onion', piyaj: 'onion', পেঁয়াজ: 'onion',
  alu: 'potato', aloo: 'potato', আলু: 'potato',
  sabon: 'soap', shabon: 'soap', সাবান: 'soap',
  cha: 'tea', chaa: 'tea', চা: 'tea',
  biscuit: 'biscuit', বিস্কুট: 'biscuit', biskut: 'biscuit',
  juice: 'juice', জুস: 'juice',
};

/** The searches to try for an item name, best first: the English words, then what was typed. */
export function itemSearchTerms(name: string): string[] {
  const typed = name.trim();
  if (!typed) return [];
  const english = typed.split(' ').map((w) => ITEM_WORDS[w] ?? w).join(' ');
  return english === typed ? [typed] : [english, typed];
}
