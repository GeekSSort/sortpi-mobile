/**
 * One spelling key for Bangla script and Banglish. People write the same word as "কত", "koto", "kto", "kata" or "KOTOOO", and the same shop item as
 * "Coca Cola", "cocacola" or "কোকাকোলা". Everything is turned into a short Latin form so those spellings meet in the middle:
 *   normalizeText  cleans the text (Unicode, digits, punctuation, case)
 *   fold           one Latin form per word, sounds merged (sh/s, ph/f, v/b, z/j, a/o ...), vowels kept
 *   skeleton       the consonants of that form, for words whose vowels people drop or change
 * These are heuristics tested against spelling families written down in docs/research; they are not a dictionary.
 */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Text as one clean line: Unicode composed, joiners removed, Bangla digits as 0-9, Bangla full stop and punctuation as spaces. */
export function normalizeText(input: string): string {
  let s = input.normalize('NFC').replace(/[‌‍]/g, '');
  // The nukta letters can arrive as one code point or as base + nukta; make them one form.
  s = s.replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়').replace(/য়/g, 'য়');
  s = s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  return s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const CONS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n', 'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n', 'প': 'p', 'ফ': 'f',
  'ব': 'b', 'ভ': 'bh', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h',
};
const INDEPENDENT: Record<string, string> = { 'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou' };
const SIGN: Record<string, string> = { 'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou' };
const HASANTA = '্';
const CHANDRABINDU = 'ঁ';

const hasBangla = (w: string) => /[ঀ-৿]/.test(w);

/**
 * Bangla script to Latin letters, the way people type it. The inherent vowel is spoken only in the first syllable and at a few word ends,
 * so it is kept on the first consonant and dropped elsewhere; the consonant skeleton makes up for the rest.
 */
export function bnToLatin(word: string): string {
  const chars = [...word];
  let out = '';
  let seenConsonant = false;
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    if (INDEPENDENT[c]) {
      out += INDEPENDENT[c];
      seenConsonant = true; // a word that starts with a vowel has had its first syllable
    }
    else if (CONS[c]) {
      out += CONS[c];
      const next = chars[i + 1];
      if (next && SIGN[next]) {
        out += SIGN[next];
        i += 1;
      } else if (next === HASANTA) i += 1;
      else if (!seenConsonant && next && CONS[next]) out += 'o'; // "কত" -> "kot": the first syllable keeps its vowel
      seenConsonant = true;
    } else if (c === CHANDRABINDU || c === HASANTA) continue;
    else if (/[ঀ-৿]/.test(c)) continue;
    else out += c;
  }
  return out;
}

/** One Latin form for a word in any script and any common spelling. */
export function fold(word: string): string {
  let s = normalizeText(word).replace(/\s/g, '');
  if (hasBangla(s)) s = bnToLatin(s);
  s = s.replace(/[^a-z0-9]/g, '');
  s = s
    .replace(/([ao])\1+$/, '$1') // "kotooo": stretched for emphasis, not a long vowel
    .replace(/ck/g, 'k')
    .replace(/chh?/g, 'C') // keep ch apart from a plain c, which sounds like k
    .replace(/c/g, 'k')
    .replace(/C/g, 'c')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/ph/g, 'f')
    .replace(/sh/g, 's')
    .replace(/(k|g|t|d|b|j|r)h/g, '$1')
    .replace(/z/g, 'j')
    .replace(/v/g, 'b')
    .replace(/w/g, 'o')
    .replace(/aa+/g, 'a') // a long a (paani, daam) is the same sound
    .replace(/a/g, 'o')
    .replace(/oo|uu/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/([^aeiou])y$/, '$1i') // a closing y is the same sound as i (bikry, bikri)
    .replace(/(.)\1+/g, '$1');
  return s.length > 2 ? s.replace(/o$/, '') : s; // a closing "o" is written in "koto" and not in "কত"
}

/** The consonants of a word's folded form: the part that survives dropped and swapped vowels ("kto", "kata", "koto" all give "kt"). */
export const skeleton = (word: string): string => fold(word).replace(/[aeiou]/g, '');

/** Edit distance between two short strings. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
