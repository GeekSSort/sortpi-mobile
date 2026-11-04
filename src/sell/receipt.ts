import { formatBDT } from '../lib/money.ts';

type Line = { name: string; unitLabel?: string | null; quantity: string; unitPrice: string; total: string };

/** A plain-text receipt for the phone's share sheet (WhatsApp, SMS, email). The web only prints; the phone can send. */
export function receiptText(o: { shop: string; invoice: string; lines: Line[]; total: string; paid: string; due: string; customer?: string | null }): string {
  const rows = o.lines.map((l) => `${l.name}${l.unitLabel ? ` (${l.unitLabel})` : ''}\n  ${Number(l.quantity)} × ${formatBDT(l.unitPrice)} = ${formatBDT(l.total)}`);
  return [
    o.shop,
    `Invoice ${o.invoice}`,
    ...(o.customer ? [`Customer: ${o.customer}`] : []),
    '',
    ...rows,
    '',
    `Total: ${formatBDT(o.total)}`,
    `Paid: ${formatBDT(o.paid)}`,
    ...(Number(o.due) > 0 ? [`Due: ${formatBDT(o.due)}`] : []),
    '',
    'Thank you!',
  ].join('\n');
}
