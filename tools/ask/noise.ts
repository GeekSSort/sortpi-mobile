// Ways real people write the same thing badly. Applied to Banglish only; Bangla script is left as it is (apart from whole-word swaps).
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const chance = (r: Rng, p: number) => r() < p;

/** Sounds people swap when they type Bangla in Latin letters. */
const SWAPS: [string, string][] = [['sh', 's'], ['s', 'sh'], ['ph', 'f'], ['f', 'ph'], ['v', 'b'], ['b', 'v'], ['z', 'j'], ['j', 'z'], ['ee', 'i'], ['i', 'ee'], ['oo', 'u'], ['o', 'a'], ['a', 'o'], ['ck', 'k'], ['ch', 'c'], ['kh', 'k'], ['dh', 'd'], ['th', 't']];
const NEAR: Record<string, string> = { a: 's', s: 'a', o: 'p', p: 'o', i: 'o', k: 'l', l: 'k', e: 'r', r: 'e', t: 'y', y: 't', n: 'm', m: 'n', b: 'v', v: 'b', d: 's', u: 'y' };

const BN: Record<string, string> = {
  koto: 'কত', ajker: 'আজকের', aj: 'আজ', bikri: 'বিক্রি', bill: 'বিল', baki: 'বাকি', stock: 'স্টক', dekhao: 'দেখাও', kom: 'কম', sesh: 'শেষ', dam: 'দাম', er: 'এর', labh: 'লাভ', mal: 'মাল', ase: 'আছে', ki: 'কী', kon: 'কোন',
  gotokal: 'গতকাল', supplier: 'সাপ্লায়ার', customer: 'কাস্টমার', mot: 'মোট', ache: 'আছে', cash: 'ক্যাশ', hoyeche: 'হয়েছে', holo: 'হলো', beshi: 'বেশি', sob: 'সব', ei: 'এই',
};

function editWord(r: Rng, w: string): string {
  let s = w;
  if (s.length > 3 && chance(r, 0.3)) {
    const [from, to] = pick(r, SWAPS);
    const at = [...s.matchAll(new RegExp(from, 'g'))].map((m) => m.index ?? 0);
    if (at.length) {
      const i = pick(r, at);
      s = s.slice(0, i) + to + s.slice(i + from.length);
    }
  }
  if (s.length > 3 && chance(r, 0.18)) s = s[0] + s.slice(1).replace(/[aeiou]/g, (v) => (chance(r, 0.7) ? '' : v)); // "kto", "bil", "stk"
  if (chance(r, 0.07)) s += s[s.length - 1].repeat(1 + Math.floor(r() * 2)); // "kotoo"
  if (s.length > 3 && chance(r, 0.06)) {
    const i = 1 + Math.floor(r() * (s.length - 2));
    const kind = Math.floor(r() * 4);
    if (kind === 0) s = s.slice(0, i) + s.slice(i + 1); // a key missed
    else if (kind === 1) s = s.slice(0, i) + s[i] + s.slice(i); // a key twice
    else if (kind === 2) s = s.slice(0, i) + (NEAR[s[i]] ?? s[i]) + s.slice(i + 1); // a neighbouring key
    else s = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); // two keys swapped
  }
  return s;
}

const OPEN = ['bhai ', 'vai ', 'please ', 'ektu ', 'assalamu alaikum vai ', 'apa ', 'bhaiya ', 'dada '];
const CLOSE = [' bhai', ' vai', ' ektu bolen', ' please', ' 😊', ' ?', ' bolo', ' dekhi'];

/** One question written the way a person might: spelling swaps, typos, Bangla-script words mixed in, greetings, punctuation. */
export function noisy(r: Rng, clean: string, level: number): string {
  const wholeBangla = chance(r, 0.12);
  const words = clean.split(' ').map((w) => {
    if (/[^\x00-\x7f]/.test(w)) return w; // already Bangla script
    if ((wholeBangla || chance(r, 0.08)) && BN[w]) return BN[w];
    return chance(r, level) ? editWord(r, w) : w;
  });
  let s = words.join(' ');
  if (chance(r, 0.2 * level * 2)) s = pick(r, OPEN) + s;
  if (chance(r, 0.2 * level * 2)) s += pick(r, CLOSE);
  if (chance(r, 0.3)) s += chance(r, 0.3) ? '??' : '?';
  if (chance(r, 0.08)) s = s.toUpperCase();
  else if (chance(r, 0.2)) s = s[0].toUpperCase() + s.slice(1);
  if (chance(r, 0.05)) s = s.replace(/ /, '  ');
  return s;
}
