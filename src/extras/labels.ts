import { barcodeSvg } from '../receipt/barcode.ts';

export type LabelItem = { name: string; price: string; code: string; copies: number };
export type LabelSize = 'small' | 'medium' | 'large';
/** Label stock sizes in millimetres, as sold for shelf and price labels. */
export const SIZES: Record<LabelSize, { w: number; h: number; label: string }> = {
  small: { w: 38, h: 25, label: 'Small 38×25 mm' },
  medium: { w: 50, h: 30, label: 'Medium 50×30 mm' },
  large: { w: 70, h: 40, label: 'Large 70×40 mm' },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
export const clampCopies = (n: number): number => (Number.isFinite(n) ? Math.min(200, Math.max(0, Math.floor(n))) : 0);

/** One label per copy: the name, the price and the barcode of the item's code. A code that cannot be drawn is printed as plain text. Shop words are escaped, never run as markup. */
export function labelsHtml(items: LabelItem[], size: LabelSize): string {
  const { w, h } = SIZES[size];
  const one = (it: LabelItem) => {
    const svg = barcodeSvg(it.code, Math.max(18, h - 17), 1);
    return `<div class="l"><div class="n">${esc(it.name)}</div><div class="p">৳ ${esc(Number(it.price).toLocaleString('en-US', { maximumFractionDigits: 2 }))}</div><div class="b">${svg ?? esc(it.code)}</div></div>`;
  };
  const body = items.flatMap((it) => Array.from({ length: clampCopies(it.copies) }, () => one(it))).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}body{margin:0}.l{box-sizing:border-box;width:${w}mm;height:${h}mm;padding:1.5mm;overflow:hidden;page-break-inside:avoid;display:inline-block;vertical-align:top;font-family:sans-serif;text-align:center}.n{font-size:8pt;font-weight:600;line-height:1.1;max-height:2.3em;overflow:hidden}.p{font-size:10pt;font-weight:700}.b svg{max-width:100%;height:auto}</style></head><body>${body}</body></html>`;
}
