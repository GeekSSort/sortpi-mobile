import { compareMoney } from '../lib/money.ts';

export type StockLevel = 'negative' | 'out' | 'low' | 'in';

/**
 * The web's four stock pills. `available` is on-hand minus reserved; `reorderLevel` of 0 means no alert is set,
 * so such a line is never "low", only in stock or out.
 */
export function stockLevel(available: string, reorderLevel: string): StockLevel {
  if (compareMoney(available, '0') < 0) return 'negative';
  if (compareMoney(available, '0') === 0) return 'out';
  if (compareMoney(reorderLevel, '0') > 0 && compareMoney(available, reorderLevel) <= 0) return 'low';
  return 'in';
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = { negative: 'Negative stock', out: 'Out of stock', low: 'Low stock', in: 'In stock' };

/** Quantity as the shelf counts it: whole numbers when the unit is known to be whole-only, otherwise any fraction is kept (the unit is unknown for never-stocked rows). */
export function formatQuantity(quantity: string, allowDecimal: boolean | null): string {
  const n = Number(quantity);
  if (!Number.isFinite(n)) return quantity;
  return (allowDecimal !== false ? n.toFixed(3).replace(/\.?0+$/, '') : String(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
