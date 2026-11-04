type Option = { id: string; name: string };

/**
 * The category and unit of the last product added, kept for the session. The web's New Items form carries them
 * to the next item "as on a delivery note"; this does the same so a run of products costs one choice, not many.
 */
let last: { category: Option | null; unit: Option | null } = { category: null, unit: null };
export const getLastChoice = () => last;
export const setLastChoice = (next: { category: Option | null; unit: Option | null }) => void (last = next);
