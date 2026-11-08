// The A4 ledger invoice as HTML, drawn the way the web app draws it (saas/client/src/components/shared/InvoiceSheet.tsx): a boxed masthead,
// the invoice's particulars in grey cards, a fully ruled item table with code and unit columns, totals under the money columns, and
// headings in the shop's language with a second one in brackets. It takes the same data as the roll receipt, so switching paper changes
// the page and nothing else.

import { barcodeSvg } from './barcode.ts';
import { BLOCKS, fillText, metaLabelId, totalLabelId, type ReceiptBlock, type ReceiptBlockType } from './blocks.ts';
import { isRtl, receiptLabel, type ReceiptLabelKey, type ReceiptLanguage } from './i18n.ts';
import { blockCss, esc, type ReceiptData, type ReceiptTotal } from './slip.ts';

/** Which label a details row's text corresponds to, when one does. */
const META_KEYS: Record<string, ReceiptLabelKey> = { 'invoice no': 'invoiceNo', 'order no': 'invoiceNo', 'return no': 'invoiceNo', 'voucher no': 'invoiceNo', date: 'date', payment: 'payMode', 'pay mode': 'payMode', 'refund by': 'payMode', supplier: 'supplierName', 'their invoice': 'supplierInvoiceNo' };

/** Which label a totals row is, when one is recognisable. */
const TOTAL_KEYS: Record<string, ReceiptLabelKey> = {
  'sub total': 'subtotal', subtotal: 'subtotal', discount: 'discount', vat: 'vat', tax: 'vat', shipping: 'shipping', 'total amount': 'grandTotal', 'grand total': 'grandTotal', total: 'grandTotal',
  'net payable': 'netPayable', paid: 'paid', due: 'due', 'paid by': 'paidBy', status: 'status', rounding: 'rounding', 'returned value': 'returnedValue', refunded: 'refunded', 'applied to due': 'appliedToDue', 'total received': 'totalReceived', 'total paid': 'totalPaid',
};

/** Which box of the sheet a block goes in. Blocks of one kind in a row share it. */
const KIND: Record<ReceiptBlockType, string> = {
  logo: 'mast', name: 'mast', tagline: 'mast', address: 'mast', bin: 'mast', phone: 'mast', text: '', line: 'line', title: 'title', meta: 'cards', customer: 'cards', note: 'note', items: 'items', totals: 'totals',
  footer: 'foot', thanks: 'foot', returnPolicy: 'foot', phoneLine: 'foot', terms: 'foot', barcode: 'foot', system: 'foot',
};
const MERGE = ['mast', 'cards', 'foot'];
/** The kinds that are a ruled box of their own; the items table, the totals and a dividing line draw themselves. */
const BOXED = new Set(['mast', 'title', 'cards', 'note', 'foot', 'text']);

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
@page{size:A4;margin:10mm}
.sheet{margin:0 auto;width:100%;max-width:190mm;border:1px solid #1e1e1e;background:#fff;color:#1e1e1e;font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;font-family:"Noto Sans","Noto Sans Bengali",system-ui,sans-serif}
.sheet p{margin:0;overflow-wrap:anywhere}
.mast{border-bottom:1px solid #1e1e1e;padding:10px}
.title{border-bottom:1px solid #1e1e1e;padding:6px 0}
.cards{display:flex;flex-direction:column;gap:6px;border-bottom:1px solid #1e1e1e;padding:8px}
.note{border-bottom:1px solid #1e1e1e;padding:5px 10px}
.foot{border-top:1px solid #1e1e1e;padding:8px 10px}
.text{border-bottom:1px solid #1e1e1e;padding:5px 10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.card{display:flex;align-items:center;gap:8px;border:1px solid #1e1e1e;border-radius:4px;background:#ececec;padding:4px 8px}
.card.wide{grid-column:span 2}
.card .l{flex-shrink:0;font-size:10px;font-weight:700}
.card .v{min-width:0;flex:1;overflow-wrap:anywhere;font-size:11px;font-weight:600}
.bi{line-height:1.3}.bi .o{font-weight:400}
table{border-collapse:collapse}
.items{width:100%;text-align:left}
th,td{border:1px solid #1e1e1e}
th{padding:5px 6px;font-size:10px;font-weight:700}
td{padding:4px 6px;font-size:11px}
thead{display:table-header-group}
thead tr{background:#ececec}
.tc{text-align:center}.tr{text-align:right}.tl{text-align:left}
.sub{font-size:.85em;color:#4a4a4a}
.totbox{display:flex;justify-content:flex-end;padding:8px;text-align:left}
.totbox table{width:92mm}
tr.strong{background:#ececec}.b{font-weight:700}
.line{height:6px;border-bottom:1px solid #1e1e1e}
.logo{display:block;margin:0 auto 6px;max-height:64px;max-width:200px;object-fit:contain}
`;

/** The A4 invoice as a full HTML page, ready for the system print screen. */
export function renderSheetHtml(d: ReceiptData): string {
  const labels = d.labels ?? {};
  const primary: ReceiptLanguage = d.primary ?? 'en';
  const secondary = d.secondary ?? '';
  const other = secondary && secondary !== primary ? secondary : null;
  const hasCode = d.items.some((i) => i.code);
  const hasUnit = d.items.some((i) => i.unit);
  const own = (b: ReceiptBlock, builtIn: string) => b.text ?? builtIn;
  const lbl = (id: string, fallback: string) => esc(labels[id] ?? fallback);

  /** A heading in both languages: the shop's own first, the other in brackets. */
  const bi = (k: ReceiptLabelKey): string =>
    `<span class="bi"><bdi>${lbl(`sheet:${k}`, receiptLabel(k, primary))}</bdi>${other ? ` <bdi dir="${isRtl(other) ? 'rtl' : 'ltr'}" class="o">(${esc(receiptLabel(k, other))})</bdi>` : ''}</span>`;

  const card = (label: string, value: string, wide = false) => `<div class="card${wide ? ' wide' : ''}"><span class="l">${label} :</span><bdi class="v">${esc(value || '—')}</bdi></div>`;

  /** A free line: the built-in words until typed over, then only the shop's own. */
  const free = (b: ReceiptBlock, builtIn: string, style: string): string | null => {
    const text = own(b, builtIn);
    return text ? `<p style="${style}">${esc(text)}</p>` : null;
  };

  const glossTotal = (label: string): { text: string; gloss: string | null; rtl: boolean } => {
    if (!other) return { text: label, gloss: null, rtl: false };
    const trailing = label.trimEnd().endsWith(':');
    const bare = label.trim().replace(/:$/, '').trim();
    const key = TOTAL_KEYS[bare.replace(/^\([-+]\)\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()];
    if (!key) return { text: label, gloss: null, rtl: false };
    return { text: bare + (trailing ? ':' : ''), gloss: receiptLabel(key, other), rtl: isRtl(other) };
  };

  const totalRow = (t: ReceiptTotal): string => {
    const g = glossTotal(t.label);
    const id = totalLabelId(t.label);
    const name = esc(labels[id] ?? (g.gloss ? g.text.replace(/:$/, '') : g.text));
    const gloss = g.gloss ? ` <bdi dir="${g.rtl ? 'rtl' : 'ltr'}" style="font-weight:400">(${esc(g.gloss)})</bdi>${g.text.endsWith(':') ? ':' : ''}` : '';
    return `<tr class="${t.strong ? 'strong' : ''}"><td class="${t.strong ? 'b' : ''}"><bdi>${name}</bdi>${gloss}</td><td class="tr ${t.strong ? 'b' : ''}" style="${t.strong ? '' : 'font-weight:500'}">${esc(t.value)}</td></tr>`;
  };

  const draw = (b: ReceiptBlock): string | null => {
    switch (b.type) {
      case 'logo':
        return d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : null;
      case 'name':
        return `<p style="font-size:20px;line-height:1.2;font-weight:700">${esc(own(b, d.business.name))}</p>`;
      case 'address':
        return free(b, d.business.address ?? '', 'margin-top:2px;font-size:12px;font-weight:600');
      case 'tagline':
        return free(b, d.business.tagline ?? '', 'margin-top:1px;font-size:10px;color:#4a4a4a');
      case 'phone':
        return free(b, d.business.phone ? `${receiptLabel('phone', primary)} ${d.business.phone}` : '', 'margin-top:1px;font-size:11px;font-weight:600');
      case 'bin':
        return free(b, d.business.bin ? `VAT / BIN: ${d.business.bin}` : '', 'margin-top:1px;font-size:10px');
      case 'text':
        return b.text ? `<p style="margin-top:3px;font-size:10px;color:#4a4a4a">${esc(fillText(b.text, d.vars))}</p>` : null;
      case 'line':
        return '<div class="line"></div>';
      case 'title':
        return `<p style="font-size:13px;font-weight:700">${esc(own(b, BLOCKS.title.defaultText ?? d.title))}</p>`;
      case 'meta':
        return d.meta.length
          ? `<div class="grid2">${d.meta.map((m) => { const k = META_KEYS[m.label.trim().toLowerCase()]; return card(k ? bi(k) : lbl(metaLabelId(m.label), m.label), m.value); }).join('')}</div>`
          : null;
      case 'customer':
        return d.customer ? `<div class="grid2">${card(bi('customerName'), d.customer.phone ? `${d.customer.name} — ${d.customer.phone}` : d.customer.name, true)}</div>` : null;
      case 'note': {
        const text = fillText(own(b, BLOCKS.note.defaultText ?? ''), d.vars);
        return text ? `<p style="font-size:10px;color:#4a4a4a">${esc(text)}</p>` : null;
      }
      case 'items': {
        const head = `<thead><tr><th class="tc" style="width:28px">${bi('serialNo')}</th>${hasCode ? `<th class="tl" style="width:86px">${bi('itemCode')}</th>` : ''}<th class="tl">${bi('description')}</th>${hasUnit ? `<th class="tc" style="width:54px">${bi('unit')}</th>` : ''}<th class="tr" style="width:62px">${bi('quantity')}</th><th class="tr" style="width:76px">${bi('price')}</th><th class="tr" style="width:94px">${bi('lineTotal')}</th></tr></thead>`;
        const rows = d.items.length
          ? d.items.map((it, i) => `<tr><td class="tc">${i + 1}</td>${hasCode ? `<td style="white-space:nowrap">${esc(it.code ?? '')}</td>` : ''}<td>${esc(it.name)}${it.note ? `<div class="sub">${esc(it.note)}</div>` : ''}</td>${hasUnit ? `<td class="tc">${esc(it.unit ?? '')}</td>` : ''}<td class="tr">${esc(it.qty)}</td><td class="tr">${esc(it.price)}</td><td class="tr" style="font-weight:600">${esc(it.total)}</td></tr>`).join('')
          : `<tr><td colspan="${5 + (hasCode ? 1 : 0) + (hasUnit ? 1 : 0)}" class="tc" style="padding:14px 6px;color:#4a4a4a">${esc(receiptLabel('noItems', primary))}</td></tr>`;
        return `<table class="items">${head}<tbody>${rows}</tbody></table>`;
      }
      case 'totals':
        return `<div class="totbox"><table><tbody>${d.totals.map(totalRow).join('')}</tbody></table></div>`;
      case 'footer':
        return null;
      case 'thanks':
      case 'returnPolicy':
      case 'phoneLine':
      case 'terms': {
        if (b.type === 'returnPolicy' && d.vars.days <= 0) return null;
        if (b.type === 'phoneLine' && !d.vars.phone) return null;
        const raw = own(b, BLOCKS[b.type].defaultText ?? '');
        return raw ? `<p style="font-size:10px;color:#4a4a4a">${esc(fillText(raw, d.vars))}</p>` : null;
      }
      case 'barcode': {
        const svg = d.barcode ? barcodeSvg(d.barcode, 32, 1.2) : null;
        return svg ? `<div style="margin:4px 0;display:flex;justify-content:center">${svg}</div>` : null;
      }
      case 'system':
        return d.system ? `<div style="margin-top:4px;font-size:9px;color:#6a6a6a"><p style="font-weight:600">${lbl('systemBy', 'System by')} ${esc(d.system.name)}</p>${d.system.url ? `<p>${esc(d.system.url)}</p>` : ''}</div>` : null;
    }
  };

  // Runs of blocks that share a box: the masthead, the cards, the foot.
  const runs: { kind: string; nodes: string[] }[] = [];
  for (const b of d.blocks) {
    const node = draw(b);
    if (node === null) continue;
    const last = runs[runs.length - 1];
    let kind = KIND[b.type];
    if (!kind) kind = last && ['mast', 'foot', 'note'].includes(last.kind) ? last.kind : 'text';
    const framed = `<div style="${blockCss(b)}">${node}</div>`;
    if (last && last.kind === kind && MERGE.includes(kind)) last.nodes.push(framed);
    else runs.push({ kind, nodes: [framed] });
  }

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body><div class="sheet">${runs.map((r) => `<div${BOXED.has(r.kind) ? ` class="${r.kind}"` : ''}>${r.nodes.join('')}</div>`).join('')}</div></body></html>`;
}
