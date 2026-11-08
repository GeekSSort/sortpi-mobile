import type { Metal } from './api.ts';

export const METALS: { key: Metal; label: string; purities: string[] }[] = [
  { key: 'Gold', label: 'Gold', purities: ['24K', '22K', '21K', '18K', '14K'] },
  { key: 'Silver', label: 'Silver', purities: ['999', '958', '925'] },
  { key: 'Platinum', label: 'Platinum', purities: ['950'] },
];
export const purities = (m: Metal): string[] => METALS.find((x) => x.key === m)?.purities ?? [];

export function validateRate(f: { metal: Metal; purity: string; rate: string }): { purity?: string; rate?: string } {
  const e: { purity?: string; rate?: string } = {};
  if (!purities(f.metal).includes(f.purity)) e.purity = 'Choose the purity.';
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(f.rate.trim()) || Number(f.rate) <= 0) e.rate = 'Enter the price for one gram.';
  return e;
}

/** Serial numbers typed or pasted, one per line or separated by commas or spaces: trimmed, no blanks, no repeats. */
export function parseSerials(text: string): string[] {
  return [...new Set(text.split(/[\n,;\t ]+/).map((s) => s.trim()).filter(Boolean))];
}

export function validateMarkdown(f: { season: string; percent: string }): { percent?: string } {
  const n = Number(f.percent);
  return /^\d{1,3}(\.\d{1,2})?$/.test(f.percent.trim()) && n > 0 && n <= 100 ? {} : { percent: 'Enter a percentage from 1 to 100.' };
}

type L = { variantId: string; quantity: string; unitCost?: string };
const qty = (q: string) => Number(q) > 0;
/** Giving free: at least one item, each with an amount above zero. */
export const giveProblem = (lines: L[]): string | null => (lines.length === 0 ? 'Add at least one item.' : lines.some((l) => !qty(l.quantity)) ? 'Every item needs an amount above zero.' : null);

/**
 * What is wrong with a production run or a combo pack, or null. Without ingredients, each thing made needs its own cost (the server costs
 * it from what was used otherwise). A combo pack needs contents, and one pack at a time.
 */
export function productionProblem(o: { made: L[]; used: L[]; combo: boolean }): string | null {
  if (o.made.length === 0) return o.combo ? 'Pick the pack and say how many were made up.' : 'Add what was made, with how many.';
  if ([...o.made, ...o.used].some((l) => !qty(l.quantity))) return 'Every item needs an amount above zero.';
  if (o.combo && o.used.length === 0) return 'Add what is in each pack.';
  if (!o.combo && o.used.length === 0 && o.made.some((l) => !(Number(l.unitCost) > 0))) return 'With no ingredients, type what each one made cost.';
  return null;
}
/** A combo pack's contents are given per pack; the shelf gives up that many times the packs made. */
export const productionBody = (o: { warehouseId: string; date: string; note: string; combo: boolean; made: L[]; used: L[] }) => {
  const packs = o.combo ? Number(o.made[0]?.quantity ?? 1) : 1;
  return {
    warehouse_id: o.warehouseId,
    production_date: o.date,
    note: o.note.trim(),
    made: o.made.map((l) => ({ variant_id: l.variantId, quantity: l.quantity.trim(), ...(Number(l.unitCost) > 0 && !o.combo ? { unit_cost: l.unitCost!.trim() } : {}) })),
    used: o.used.map((l) => ({ variant_id: l.variantId, quantity: String(Math.round(Number(l.quantity) * packs * 1000) / 1000) })),
  };
};
