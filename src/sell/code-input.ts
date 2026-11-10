/**
 * Does what was typed look like a product CODE (a barcode, a SKU, a printed label) rather than words to search for? A hardware scanner types
 * the code and Enter within milliseconds, before the search on screen has caught up, so a code is looked up exactly and at once instead of
 * being judged from the older list. Words such as "tea" or "blue shirt" are not codes: they have no digit, or they have a space.
 */
export const looksLikeCode = (text: string): boolean => {
  const q = text.trim();
  return /^\S{4,}$/.test(q) && /\d/.test(q);
};

/**
 * The web till's quantity shortcut: "3*milk" or "milk*3" (a code or words) adds 3. A plain 2*2 or a lone number is not a shortcut.
 * Returns the quantity and what is left to look for; with no shortcut the quantity is 1 and the text is unchanged.
 */
export function splitQuantity(typed: string): { quantity: number; text: string } {
  const t = typed.trim();
  const before = t.match(/^(\d+(?:\.\d{1,3})?)\s*\*\s*(\S.*)$/);
  const after = t.match(/^(\S.*?)\s*\*\s*(\d+(?:\.\d{1,3})?)$/);
  const hit = before ? { n: before[1]!, text: before[2]! } : after ? { n: after[2]!, text: after[1]! } : null;
  if (!hit || /^\d+(?:\.\d+)?$/.test(hit.text) && hit.text.length < 4) return { quantity: 1, text: typed };
  const quantity = Number(hit.n);
  return Number.isFinite(quantity) && quantity > 0 && quantity <= 9999 ? { quantity, text: hit.text.trim() } : { quantity: 1, text: typed };
}
