/**
 * Does what was typed look like a product CODE (a barcode, a SKU, a printed label) rather than words to search for? A hardware scanner types
 * the code and Enter within milliseconds, before the search on screen has caught up, so a code is looked up exactly and at once instead of
 * being judged from the older list. Words such as "tea" or "blue shirt" are not codes: they have no digit, or they have a space.
 */
export const looksLikeCode = (text: string): boolean => {
  const q = text.trim();
  return /^\S{4,}$/.test(q) && /\d/.test(q);
};
