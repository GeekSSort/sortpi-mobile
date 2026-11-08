import type { WarehouseType } from './api.ts';

/** The four kinds of place the server knows, in the words a shopkeeper uses. */
export const TYPE_WORDS: { key: WarehouseType; label: string }[] = [
  { key: 'MAIN', label: 'Main store' },
  { key: 'TRANSIT', label: 'On the way' },
  { key: 'DAMAGED', label: 'Damaged goods' },
  { key: 'RETURN', label: 'Returned goods' },
];
export const typeWord = (t: string): string => TYPE_WORDS.find((x) => x.key === t)?.label ?? t;

/** A short code for a new place: letters and digits only, upper case. */
export const cleanCode = (v: string): string => v.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
