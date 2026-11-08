import type { Line } from './logic.ts';

export type OldForm = { supplierId: string; billDate: string; billNo: string; note: string; addsStock: boolean; settledBefore: boolean; lines: Line[] };

/** What is missing before the bill is sent. The date is the bill's own, and a bill cannot be dated in the future. */
export function validateOld(f: OldForm, today: string): { supplierId?: string; billDate?: string; lines?: string } {
  const e: { supplierId?: string; billDate?: string; lines?: string } = {};
  if (!f.supplierId) e.supplierId = 'Choose the supplier.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.billDate.trim()) || f.billDate.trim() > today) e.billDate = 'Enter the bill date as 2026-11-08, not in the future.';
  if (f.lines.length === 0) e.lines = 'Add at least one item.';
  else if (f.lines.some((l) => !(Number(l.quantity) > 0) || !(Number(l.unitCost) > 0))) e.lines = 'Every item needs an amount and a price per piece.';
  return e;
}

export const oldBody = (f: OldForm, ctx: { branchId: string; warehouseId: string }) => ({
  supplier: f.supplierId,
  branch: ctx.branchId,
  warehouse: ctx.warehouseId,
  purchase_date: f.billDate.trim(),
  adds_stock: f.addsStock,
  settled_before: f.settledBefore,
  ...(f.billNo.trim() ? { supplier_invoice_no: f.billNo.trim() } : {}),
  ...(f.note.trim() ? { note: f.note.trim() } : {}),
  items: f.lines.map((l) => ({ variant: l.variantId, quantity: l.quantity.trim(), unit_cost: l.unitCost.trim() })),
});
