import { ApiError } from '../api/client.ts';

export type Kind = 'category' | 'brand';
/** What the lists show: checked live. `parent` is null for a top-level kind; `product_count` is how many items use it. */
export type Row = { id: string; name: string; parent: string | null; product_count: number };
export type TreeRow = Row & { depth: number; children: number };

/** Kinds of item can sit three levels deep (kind, inside kind, inside that). */
export const MAX_DEPTH = 2;

/** The kinds in reading order: each parent, then its children under it, each level by name. An orphan (parent missing from the list) is shown at the top level. */
export function categoryTree(rows: Row[]): TreeRow[] {
  const ids = new Set(rows.map((r) => r.id));
  const kids = new Map<string | null, Row[]>();
  for (const r of rows) {
    const key = r.parent && ids.has(r.parent) ? r.parent : null;
    kids.set(key, [...(kids.get(key) ?? []), r]);
  }
  const out: TreeRow[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const r of [...(kids.get(parent) ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ ...r, depth, children: kids.get(r.id)?.length ?? 0 });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** A kind may hold another only while it is above the third level. */
export const canNest = (depth: number): boolean => depth < MAX_DEPTH;

/** Items that use nothing: the ones worth a look. A kind that holds other kinds is not "empty". */
export const emptyOnes = (rows: TreeRow[]): TreeRow[] => rows.filter((r) => r.product_count === 0 && r.children === 0);

/**
 * Why a name cannot be saved, in plain words. The server only refuses an exact repeat, so a name differing by capital letters would be
 * accepted there and show twice: this refuses it here. Categories compare within the same parent; brands within the shop.
 */
export function nameProblem(kind: Kind, name: string, siblings: { id: string; name: string }[], selfId?: string): string | null {
  const n = name.trim();
  if (!n) return kind === 'brand' ? 'Enter the brand name.' : 'Enter a name.';
  if (siblings.some((s) => s.id !== selfId && s.name.trim().toLowerCase() === n.toLowerCase())) return kind === 'brand' ? 'You already have a brand with that name.' : 'You already have one with that name here.';
  return null;
}

export const createBody = (name: string, parent?: string | null) => ({ name: name.trim(), ...(parent ? { parent } : {}) });
export const renameBody = (name: string) => ({ name: name.trim() });

/** Words for the ways a change can be refused (codes from the server's registry). English keys; `{n}` is filled in on screen from `errors.products`. */
export function describeCatalogError(e: unknown): { text: string; n?: number } {
  if (!(e instanceof ApiError)) return { text: 'Something went wrong. Try again.' };
  const n = typeof e.errors?.products === 'number' ? e.errors.products : undefined;
  switch (e.code) {
    case 'CATEGORY_IN_USE':
    case 'BRAND_IN_USE':
      return { text: n === undefined ? 'Some items still use this. Move them to another one first.' : '{n} items still use this. Move them to another one first.', n };
    case 'CATEGORY_HAS_CHILDREN':
      return { text: 'There are kinds inside this. Remove or move those first.' };
    case 'CATEGORY_TOO_DEEP':
      return { text: 'Kinds can only go three levels deep.' };
    case 'CATEGORY_CYCLE':
      return { text: 'A kind cannot go inside itself.' };
    case 'DUPLICATE_CATEGORY':
    case 'DUPLICATE_BRAND':
      return { text: 'You already have one with that name.' };
    case 'PERMISSION_DENIED':
      return { text: 'You do not have permission to do that.' };
    case 'NOT_FOUND':
      return { text: 'This was not found. It may already be removed.' };
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return { text: 'No connection. Check it and try again.' };
    default:
      return { text: e.message || 'Could not save this.' };
  }
}
