// The receipt as a list of blocks, in the order they print. Ported from the web app (saas/client/src/lib/receiptBlocks.ts): the shop edits
// the list in Settings -> Invoice layout and a phone prints the same one. A shop that never saved a list prints the built-in one, made
// from the older single settings, so its paper does not change.

import type { ReceiptStyle } from './style.ts';

export type ReceiptBlockType = 'logo' | 'name' | 'tagline' | 'address' | 'bin' | 'phone' | 'text' | 'line' | 'title' | 'meta' | 'customer' | 'note' | 'items' | 'totals' | 'footer' | 'thanks' | 'returnPolicy' | 'phoneLine' | 'terms' | 'barcode' | 'system';
export type BlockAlign = 'left' | 'center' | 'right';
export interface BlockStyle {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  align?: BlockAlign;
}
export interface ReceiptBlock {
  id: string;
  type: ReceiptBlockType;
  text?: string;
  style?: BlockStyle;
}
export interface BlockInfo {
  required?: boolean;
  defaultText?: string;
  align: BlockAlign;
}

export const BLOCKS: Record<ReceiptBlockType, BlockInfo> = {
  logo: { align: 'center' },
  name: { required: true, align: 'center' },
  tagline: { align: 'center' },
  address: { align: 'left' },
  bin: { align: 'left' },
  phone: { align: 'center' },
  text: { defaultText: 'Your text here', align: 'center' },
  line: { align: 'center' },
  title: { defaultText: 'SALES INVOICE', align: 'center' },
  meta: { required: true, align: 'left' },
  customer: { align: 'left' },
  note: { defaultText: 'To enjoy special discount, please register as a VIP Member.', align: 'center' },
  items: { required: true, align: 'left' },
  totals: { required: true, align: 'left' },
  footer: { align: 'center' },
  thanks: { defaultText: 'Thank you for shopping with {shop}', align: 'center' },
  returnPolicy: { defaultText: 'Goods once sold are exchangeable within {days} days with this receipt.', align: 'center' },
  phoneLine: { defaultText: 'Any queries or complaints, please call {phone}', align: 'center' },
  terms: { defaultText: 'Terms and conditions apply.', align: 'center' },
  barcode: { align: 'center' },
  system: { required: true, align: 'center' },
};

export const BLOCK_ORDER = Object.keys(BLOCKS) as ReceiptBlockType[];

let seq = 0;
export const newBlockId = (): string => `b${(seq += 1).toString(36)}`;
export const makeBlock = (type: ReceiptBlockType, text?: string): ReceiptBlock => ({ id: newBlockId(), type, ...(text !== undefined ? { text } : {}) });

/** The built-in list, from the shop's older single settings. */
export function defaultBlocks(kind: 'slip' | 'sheet', s: ReceiptStyle): ReceiptBlock[] {
  const out: ReceiptBlock[] = [];
  const add = (on: boolean, type: ReceiptBlockType, text?: string) => {
    if (on) out.push(makeBlock(type, text));
  };
  add(s.showLogo, 'logo');
  add(true, 'name');
  if (kind === 'slip') {
    add(s.showTagline, 'tagline');
    add(!!s.headerText.trim(), 'text', s.headerText.trim());
    add(s.showAddress || s.showBin, 'line');
    add(s.showAddress, 'address');
    add(s.showBin, 'bin');
  } else {
    add(s.showAddress, 'address');
    add(s.showTagline, 'tagline');
    add(true, 'phone');
    add(s.showBin, 'bin');
    add(!!s.headerText.trim(), 'text', s.headerText.trim());
  }
  add(true, 'title', s.saleTitle);
  add(true, 'meta');
  add(s.showCustomer, 'customer');
  add(!!s.noteText.trim(), 'note', s.noteText.trim());
  add(true, 'items');
  add(true, 'totals');
  add(true, 'footer');
  add(!!s.thankYou.trim(), 'thanks', s.thankYou.trim());
  add(s.showReturnPolicy, 'returnPolicy');
  add(s.showPhoneLine, 'phoneLine');
  add(!!s.footerText.trim(), 'terms', s.footerText.trim());
  add(s.showBarcode, 'barcode');
  add(true, 'system');
  return out;
}

/** A saved list, keeping only what this version can draw. `null`: none saved. */
export function parseBlocks(raw: unknown): ReceiptBlock[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const blocks = list
    .filter((b): b is ReceiptBlock => !!b && typeof b === 'object' && typeof (b as ReceiptBlock).type === 'string' && (b as ReceiptBlock).type in BLOCKS)
    .map((b) => {
      const style = b.style && typeof b.style === 'object' ? b.style : undefined;
      return { id: typeof b.id === 'string' && b.id ? b.id : newBlockId(), type: b.type, ...(typeof b.text === 'string' ? { text: b.text } : {}), ...(style ? { style } : {}) };
    });
  return blocks.length ? withRequired(blocks) : null;
}

/** A list always has the blocks a receipt cannot be without. */
export function withRequired(blocks: ReceiptBlock[]): ReceiptBlock[] {
  const out = [...blocks];
  for (const type of BLOCK_ORDER) {
    if (BLOCKS[type].required && !out.some((b) => b.type === type)) out.splice(insertIndex(out, type), 0, makeBlock(type));
  }
  return out;
}

export function insertIndex(blocks: ReceiptBlock[], type: ReceiptBlockType): number {
  const rank = BLOCK_ORDER.indexOf(type);
  let at = 0;
  blocks.forEach((b, i) => {
    if (BLOCK_ORDER.indexOf(b.type) <= rank) at = i + 1;
  });
  return at;
}

/** The words a block prints, with its placeholders filled in. */
export function fillText(text: string, vars: { shop: string; days: number; phone: string }): string {
  return text.replace(/\{shop\}/g, vars.shop || 'us').replace(/\{days\}/g, String(vars.days)).replace(/\{phone\}/g, vars.phone || '');
}

/** The software credit at the foot of every printed document. */
export const SYSTEM_CREDIT = { name: 'Geekssort', url: 'www.geekssort.com' } as const;

export type ReceiptLabels = Record<string, string>;

/** The receipt's fixed words, as they print until the shop rewords them. */
export const FIXED_LABELS = {
  address: 'Address:',
  bin: 'BIN No:',
  customerHeading: "CUSTOMER'S INFO",
  customerName: 'Name:',
  customerPhone: 'Phone:',
  itemsSl: 'SL',
  price: 'Price',
  qty: 'Qty',
  total: 'Total',
  noItems: 'No items',
  systemBy: 'System by',
} as const;

export const metaLabelId = (label: string) => `meta:${label.trim().replace(/:$/, '').trim().toLowerCase()}`;
export const totalLabelId = (label: string) => `total:${label.trim().replace(/:$/, '').trim().toLowerCase()}`;

export function parseLabels(raw: unknown): ReceiptLabels {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
}
