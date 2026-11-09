export const TABLET_LAYOUTS = [
  { id: 'wall', title: 'Product wall', description: 'Browse product tiles beside the order.' },
  { id: 'express', title: 'Express checkout', description: 'Scan first, with quick product keys and the last item shown large.' },
  { id: 'touch', title: 'Touch POS', description: 'Browse categories down the side and adjust quantities on the tiles.' },
  { id: 'sheet', title: 'Spreadsheet till', description: 'Enter products and edit quantities in an invoice table.' },
] as const;

export type TabletLayout = (typeof TABLET_LAYOUTS)[number]['id'];

export function tabletLayout(value: unknown): TabletLayout | undefined {
  if (value === 'grid') return 'express';
  return TABLET_LAYOUTS.find((layout) => layout.id === value)?.id;
}

export function validTillQuantity(value: string, decimal: boolean): boolean {
  return (decimal ? /^\d+(\.\d{1,3})?$/.test(value) : /^\d+$/.test(value)) && Number.isFinite(Number(value)) && Number(value) > 0;
}
