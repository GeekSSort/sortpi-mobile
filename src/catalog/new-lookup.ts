/**
 * Making a category or a unit on the spot from the product form, as the web's New Items sheet does.
 * Pure logic, unit-tested.
 */
export type NewUnitDraft = { name: string; shortName: string; allowDecimal: boolean };

/** What prints beside quantities. The web takes the first 10 characters of the name; so does this. */
export const defaultShortName = (name: string): string => name.trim().slice(0, 10);

export function categoryProblem(name: string): string | null {
  return name.trim() ? null : 'Enter a name for the category.';
}

export function unitProblem(d: NewUnitDraft): string | null {
  if (!d.name.trim()) return 'Enter a name for the unit.';
  if (!d.shortName.trim()) return 'Enter the short name that prints beside quantities, like kg.';
  if (d.shortName.trim().length > 10) return 'The short name can be at most 10 characters.';
  return null;
}

export const buildCategoryRequest = (name: string) => ({ name: name.trim() });
export const buildUnitRequest = (d: NewUnitDraft) => ({ name: d.name.trim(), short_name: d.shortName.trim(), allow_decimal: d.allowDecimal });

/** True when the list already has this name, ignoring case, so "create" is not offered for a duplicate. */
export const hasExactName = (options: { name: string }[], name: string): boolean => options.some((o) => o.name.trim().toLowerCase() === name.trim().toLowerCase());
