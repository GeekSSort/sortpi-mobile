import { editDistance, fold, normalizeText, skeleton } from './text.ts';

/**
 * Finds which of the shop's own names a typed word means, by how the names sound and not how they are spelt: "কোকাকোলা", "cocacola" and
 * "Coca Cola 250ml" meet on the same consonants. Meaning across languages ("pani" is "water") is not done here: the model or a short alias
 * list turns it into the word the shop uses, and this finds the shop's own name for it.
 */
export type Named = { id: string; name: string };
type Entry = { item: Named; tokens: string[]; skeletons: string[]; joined: string };
export type NameIndex = Entry[];
export type Found = { item: Named; score: number };

export function buildNameIndex(items: Named[]): NameIndex {
  return items.map((item) => {
    const tokens = normalizeText(item.name).split(' ').filter(Boolean).map(fold).filter(Boolean);
    return { item, tokens, skeletons: tokens.map(skeleton), joined: tokens.join('') };
  });
}

const sim = (a: string, b: string): number => (a === b ? 1 : b.startsWith(a) && a.length >= 3 ? 0.95 : 1 - editDistance(a, b) / Math.max(a.length, b.length));

/** The cheapest way to find `needle` inside `hay` allowing a few edits (Sellers' variant of edit distance). */
function bestSubstringDistance(needle: string, hay: string): number {
  if (!needle) return 0;
  let prev = Array.from({ length: needle.length + 1 }, (_, i) => i);
  let best = prev[needle.length];
  for (let j = 1; j <= hay.length; j += 1) {
    const cur = [0];
    for (let i = 1; i <= needle.length; i += 1) cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + (needle[i - 1] === hay[j - 1] ? 0 : 1));
    best = Math.min(best, cur[needle.length]);
    prev = cur;
  }
  return best;
}

/** The shop's names that the query most likely means, best first. Nothing below `min` is returned, so an unknown word finds nothing. */
export function resolveNames(index: NameIndex, query: string, limit = 5, min = 0.78): Found[] {
  const q = normalizeText(query).split(' ').filter(Boolean).map(fold).filter(Boolean);
  const qs = q.map(skeleton);
  const joinedQ = q.join('');
  if (joinedQ.length < 3) return [];
  const found: Found[] = [];
  for (const e of index) {
    // Each query word is matched on its sound first, then on its consonants alone (a little less sure, since vowels are lost).
    const each = q.map((t, k) => Math.max(0, ...e.tokens.map((c, m) => Math.max(sim(t, c), qs[k].length >= 2 ? 0.9 * sim(qs[k], e.skeletons[m]) : 0))));
    // Every word should match; but a long word that matches well is enough when the rest is a category word ("chinigura chal").
    const byToken = Math.max(each.reduce((a, b) => a + b, 0) / q.length, ...each.map((v, k) => (q[k].length >= 4 ? 0.85 * v : 0)));
    const byJoined = e.joined.length >= joinedQ.length - 1 ? 1 - bestSubstringDistance(joinedQ, e.joined) / joinedQ.length : 0;
    const score = Math.max(byToken, byJoined);
    if (score >= min) found.push({ item: e.item, score });
  }
  return found.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length).slice(0, limit);
}
