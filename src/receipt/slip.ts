// The 58/80 mm till receipt as HTML, drawn the way the web app draws it (saas/client/src/components/shared/Receipt.tsx): the same blocks in the
// same order, monospace, dashed rules, centred except the details and the money column. The shop's Settings -> Invoice layout decides the
// blocks, the words and the labels, so a phone prints the same paper as the computer.

import { barcodeSvg } from './barcode.ts';
import {
  BLOCKS,
  FIXED_LABELS,
  fillText,
  metaLabelId,
  totalLabelId,
  type ReceiptBlock,
  type ReceiptBlockType,
  type ReceiptLabels,
} from './blocks.ts';

export interface ReceiptLine {
  name: string;
  price: string;
  qty: string;
  total: string;
  /** A line under the item (serial numbers, warranty). */
  note?: string;
  /** The item's own code and the unit it is sold in: the A4 sheet rules a column for each; the roll has no room. */
  code?: string;
  unit?: string;
}

export interface ReceiptTotal {
  label: string;
  value: string;
  strong?: boolean;
  ruleAbove?: boolean;
}

export interface ReceiptData {
  business: { name: string; tagline?: string; address?: string; bin?: string; phone?: string };
  title: string;
  meta: { label: string; value: string }[];
  customer?: { name: string; phone?: string };
  itemsHeading?: string;
  items: ReceiptLine[];
  totals: ReceiptTotal[];
  system?: { name: string; url?: string };
  blocks: ReceiptBlock[];
  labels?: ReceiptLabels;
  vars: { shop: string; days: number; phone: string };
  logoUrl?: string;
  barcode?: string;
  paper?: '80mm' | '58mm';
  zoom?: number;
  /** The A4 sheet's headings: the shop's main language, and a second one in brackets ('' for one language only). */
  primary?: 'en' | 'bn' | 'ar';
  secondary?: 'en' | 'bn' | 'ar' | '';
}

const MONO = `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace`;

/** Which run of the slip a block belongs to: a dashed rule separates two runs. */
const GROUP: Record<ReceiptBlockType, string> = {
  logo: 'top', name: 'top', tagline: 'top', phone: 'top', address: 'top', bin: 'top',
  text: '', line: '',
  title: 'details', meta: 'details', customer: 'customer', note: 'note', items: 'items', totals: 'totals',
  footer: 'notes', thanks: 'notes', returnPolicy: 'notes', phoneLine: 'notes', terms: 'notes',
  barcode: 'end', system: 'end',
};

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RULE = '<div class="rule"></div>';

/** A block's own style as inline CSS: its alignment, size, weight and slant. */
export function blockCss(b: ReceiptBlock): string {
  const s = b.style ?? {};
  return [`text-align:${s.align ?? BLOCKS[b.type].align}`, s.size && s.size !== 1 ? `zoom:${s.size}` : '', s.bold ? 'font-weight:700' : '', s.italic ? 'font-style:italic' : ''].filter(Boolean).join(';');
}

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
.slip{margin:0 auto;width:100%;color:#1e1e1e;font-size:11px;line-height:1.6;font-family:${MONO};font-variant-numeric:tabular-nums}
.slip p{margin:0;overflow-wrap:anywhere}
.rule{margin:6px 0;width:100%;border-top:1px dashed #9a9a9a}
.name{font-size:19px;line-height:1.25;font-weight:700;letter-spacing:-0.5px}
.small{font-size:11px}.note{padding:0 8px;color:#525252}
.fine{padding:0 4px;font-size:10.5px;color:#525252}
.title{font-weight:700;letter-spacing:.08em}
.grid{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;column-gap:8px;align-items:center}
.rows{align-items:start;row-gap:3px}
.grid span{min-width:0;overflow-wrap:anywhere}
.r{text-align:right;white-space:nowrap}.c{text-align:center;white-space:nowrap;padding:0 4px}.b{font-weight:700}
.sub{grid-column:span 4;margin-top:-2px;padding-left:14px;font-size:.85em}
.empty{grid-column:span 4;padding:6px 0;text-align:center;color:#525252}
.tot{display:flex;flex-direction:column;gap:2px}
.trow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.trow.strong{font-size:12px;font-weight:700}.trow .v{flex-shrink:0;text-align:right;white-space:nowrap}
.logo{display:block;margin:0 auto 4px;max-height:56px;max-width:70%;object-fit:contain;filter:grayscale(1)}
@media print{html,body{background:#fff}}
`;

/** The receipt as a full HTML page, ready for the system print screen. */
export function renderSlipHtml(d: ReceiptData): string {
  const labels = d.labels ?? {};
  const lbl = (id: string, fallback: string) => esc(labels[id] ?? fallback);
  const paper = d.paper ?? '80mm';
  const zoom = d.zoom ?? 1;
  const width = (paper === '58mm' ? 214 : 300) / zoom;
  const itemsHeading = d.itemsHeading ?? 'Item Description';
  const own = (b: ReceiptBlock, builtIn: string) => b.text ?? builtIn;

  /** A free line: the built-in words until typed over, then only the shop's own. */
  const free = (b: ReceiptBlock, builtIn: string, cls: string, style = ''): string | null => {
    const text = own(b, builtIn);
    return text ? `<p class="${cls}"${style ? ` style="${style}"` : ''}>${esc(text)}</p>` : null;
  };

  const draw = (b: ReceiptBlock, prev: ReceiptBlockType | null): string | null => {
    switch (b.type) {
      case 'logo':
        return d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : null;
      case 'name':
        return `<p class="name">${esc(own(b, d.business.name))}</p>`;
      case 'tagline':
        return free(b, d.business.tagline ?? '', 'small', `color:#525252;${prev === 'name' ? 'margin-top:2px' : ''}`);
      case 'address':
        return free(b, d.business.address ? `${FIXED_LABELS.address} ${d.business.address}` : '', 'addr');
      case 'bin':
        return free(b, d.business.bin ? `${FIXED_LABELS.bin} ${d.business.bin}` : '', 'bin', prev === 'address' ? 'margin-top:6px' : '');
      case 'phone':
        return free(b, d.business.phone ? `Phone: ${d.business.phone}` : '', 'small');
      case 'text':
        return b.text ? `<p class="small">${esc(fillText(b.text, d.vars))}</p>` : null;
      case 'line':
        return RULE;
      case 'title':
        return `<p class="title">${esc(own(b, BLOCKS.title.defaultText ?? d.title))}</p>`;
      case 'meta':
        return d.meta.length
          ? `<div style="${prev === 'title' ? 'margin-top:6px;' : ''}display:flex;flex-direction:column">${d.meta.map((m) => `<p>${lbl(metaLabelId(m.label), m.label)}: ${esc(m.value)}</p>`).join('')}</div>`
          : null;
      case 'customer':
        return d.customer
          ? `<p class="title" style="text-align:center">${lbl('customerHeading', FIXED_LABELS.customerHeading)}</p><div style="margin-top:6px;display:flex;flex-direction:column"><p>${lbl('customerName', FIXED_LABELS.customerName)} ${esc(d.customer.name)}</p>${d.customer.phone ? `<p>${lbl('customerPhone', FIXED_LABELS.customerPhone)} ${esc(d.customer.phone)}</p>` : ''}</div>`
          : null;
      case 'note': {
        const raw = own(b, BLOCKS.note.defaultText ?? '');
        return raw ? `<p class="note">${esc(fillText(raw, d.vars))}</p>` : null;
      }
      case 'items': {
        const head = `<div class="grid"><span class="b">${lbl('itemsSl', FIXED_LABELS.itemsSl)} ${lbl(`items:${itemsHeading.toLowerCase()}`, itemsHeading)}</span><span class="r b">${lbl('price', FIXED_LABELS.price)}</span><span class="c b">${lbl('qty', FIXED_LABELS.qty)}</span><span class="r b">${lbl('total', FIXED_LABELS.total)}</span></div>`;
        const rows = d.items.length
          ? d.items.map((it, i) => `<span>${i + 1}. ${esc(it.name)}</span><span class="r">${esc(it.price)}</span><span class="c">${esc(it.qty)}</span><span class="r" style="font-weight:500">${esc(it.total)}</span>${it.note ? `<span class="sub">${esc(it.note)}</span>` : ''}`).join('')
          : `<span class="empty">${lbl('noItems', FIXED_LABELS.noItems)}</span>`;
        return `${head}${RULE}<div class="grid rows">${rows}</div>`;
      }
      case 'totals':
        return `<div class="tot">${d.totals.map((t) => `${t.ruleAbove ? RULE : ''}<div class="trow${t.strong ? ' strong' : ''}"><span>${lbl(totalLabelId(t.label), t.label)}</span><span class="v">${esc(t.value)}</span></div>`).join('')}</div>`;
      case 'footer':
        return null; // a sale prints its closing lines from the blocks below; the document-notes block is for vouchers
      case 'thanks':
      case 'returnPolicy':
      case 'phoneLine':
      case 'terms': {
        if (b.type === 'returnPolicy' && d.vars.days <= 0) return null;
        if (b.type === 'phoneLine' && !d.vars.phone) return null;
        const raw = own(b, BLOCKS[b.type].defaultText ?? '');
        if (!raw) return null;
        const gap = prev && GROUP[prev] === 'notes' ? 'margin-top:6px;' : '';
        return `<p class="fine" style="${gap}">${esc(fillText(raw, d.vars))}</p>`;
      }
      case 'barcode': {
        const svg = d.barcode ? barcodeSvg(d.barcode, 34, paper === '58mm' ? 1 : 1.2) : null;
        return svg ? `<div style="margin-top:8px;display:flex;justify-content:center">${svg}</div>` : null;
      }
      case 'system':
        return d.system
          ? `<div style="margin-top:10px"><p class="b">${lbl('systemBy', FIXED_LABELS.systemBy)} ${esc(d.system.name)}</p>${d.system.url ? `<p class="fine" style="padding:0">${esc(d.system.url)}</p>` : ''}</div>`
          : null;
    }
  };

  // Lay the blocks out, a dashed rule between two runs: the slip as it has always looked when the blocks are in their built-in order.
  const out: string[] = [];
  let prevType: ReceiptBlockType | null = null;
  let prevGroup: string | null = null;
  for (const b of d.blocks) {
    const node = draw(b, prevType);
    if (node === null) continue;
    const group: string = GROUP[b.type] || (b.type === 'line' ? '' : prevGroup ?? 'top');
    if (prevGroup !== null && group && group !== prevGroup && group !== 'end' && prevType !== 'line' && b.type !== 'line') out.push(RULE);
    out.push(`<div style="${blockCss(b)}">${node}</div>`);
    prevType = b.type;
    prevGroup = b.type === 'line' ? null : group;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}.slip{max-width:${width}px;${zoom !== 1 ? `zoom:${zoom};` : ''}}</style></head><body><div class="slip">${out.join('')}</div></body></html>`;
}
