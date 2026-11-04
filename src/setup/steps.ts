/**
 * The first-run checklist on Home. Pure logic (no React) so it can be unit-tested.
 *
 * A step is shown only to someone who can actually do it (the `do` permission), and counts as done
 * when the server already has the thing (a product, a sale, a second user). Permission codes are
 * the server's own registry (saas/server docs/reference/lookup-tables.md).
 */
export type StepId = 'product' | 'sale' | 'staff';

export type Counts = Partial<Record<StepId, number>>;

type StepDef = {
  id: StepId;
  title: string;
  hint: string;
  /** Needed to do the step: the step is hidden without it. */
  can: string;
  /** Any one of these lets the app read the count that proves it is done. */
  canCount: string[];
  /** Done once the count is above this (users: the owner always exists, so 1). */
  above: number;
};

export const STEP_DEFS: StepDef[] = [
  { id: 'product', title: 'Add your first product', hint: 'Scan its barcode or QR code to add it.', can: 'product.create', canCount: ['product.view'], above: 0 },
  { id: 'sale', title: 'Make a test sale', hint: 'Scan the item and take a payment.', can: 'sale.create', canCount: ['sale.view', 'sale.view_own'], above: 0 },
  { id: 'staff', title: 'Invite a staff member', hint: 'Add them in Access and choose what they may do.', can: 'user.create', canCount: ['user.view'], above: 1 },
];

export type ChecklistStep = { id: StepId; title: string; hint: string; done: boolean };

export type Checklist = { steps: ChecklistStep[]; doneCount: number; total: number; complete: boolean };

export function buildChecklist(permissions: readonly string[], counts: Counts): Checklist {
  const has = (code: string) => permissions.includes(code);
  const steps = STEP_DEFS.filter((d) => has(d.can)).map((d) => {
    const n = counts[d.id];
    return { id: d.id, title: d.title, hint: d.hint, done: d.canCount.some(has) && typeof n === 'number' && n > d.above };
  });
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, total: steps.length, complete: steps.length > 0 && doneCount === steps.length };
}

/** Which counts to ask the server for: only the ones this person may read. */
export function countsToFetch(permissions: readonly string[]): StepId[] {
  return STEP_DEFS.filter((d) => permissions.includes(d.can) && d.canCount.some((c) => permissions.includes(c))).map((d) => d.id);
}
