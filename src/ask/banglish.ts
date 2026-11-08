/**
 * Shop owners type Bangla in English letters ("Banglish") and spell it however it sounds, or write it in Bangla script. Before matching,
 * every word is turned into one agreed spelling, so "ajkr bil kto", "আজকের বিল কত" and "ajker bill koto" all become the same text.
 */
const WORDS: Record<string, string[]> = {
  ajker: ['ajkr', 'ajke', 'aj', 'ajk', 'aajker', 'ajkerr', 'আজকের', 'আজ', 'today', 'todays', "today's"],
  gotokal: ['gotokal', 'gotokaler', 'kal', 'kalker', 'kaler', 'গতকাল', 'গতকালের', 'কাল', 'কালকের', 'yesterday', 'yesterdays'],
  week: ['soptah', 'soptahe', 'soptaher', 'shoptah', 'saptah', 'saptaher', 'সপ্তাহ', 'সপ্তাহে', 'সপ্তাহের', 'weekly', 'week'],
  bill: ['bil', 'bills', 'bils', 'invoice', 'invoices', 'hisab', 'hishab', 'hisaab', 'বিল', 'হিসাব', 'ইনভয়েস'],
  sale: ['sales', 'sell', 'selling', 'bikri', 'bikry', 'bikkri', 'bikrir', 'বিক্রি', 'বিক্রয়', 'বিক্রির'],
  koto: ['kto', 'kata', 'kt', 'koto', 'kotto', 'how', 'কত', 'কতো', 'কি পরিমাণ'],
  koyta: ['koita', 'koyta', 'koyti', 'kotogulo', 'কয়টা', 'কয়টি', 'কতটি', 'কতগুলো'],
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
for (const [canonical, variants] of Object.entries(WORDS)) {
  for (const v of variants) LOOKUP[v.toLowerCase()] = canonical;
  LOOKUP[canonical] = canonical;
}

/** Lower case, drop punctuation (keeping Bangla letters and marks), fold each word to its agreed spelling. */
export function normalizeBanglish(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) => LOOKUP[w] ?? w)
    .join(' ');
}

/** Words that say what is being asked but are not a thing's name. What is left over in a question is the item the person means. */
const NOT_A_NAME = new Set(['ajker', 'gotokal', 'week', 'bill', 'sale', 'koto', 'koyta', 'stock', 'low', 'out', 'price', 'product', 'baki', 'customer', 'supplier', 'profit', 'top', 'ase', 'ki', 'dekhao', 'taka', 'er', 'ta', 'te', 'ke', 'tar', 'dite', 'hobe', 'hoy', 'hoyeche', 'ache', 'a', 'the', 'is', 'of', 'me', 'amar', 'ekta', 'ek']);

/** The words of a question that name an item ("coca cola"), after the question words are taken away. */
export function nameWords(normalized: string): string[] {
  return normalized.split(' ').filter((w) => w.length >= 2 && !NOT_A_NAME.has(w));
}
