// Pure paper facts, kept apart from the printing code so they can be tested without the app's modules.
export type ReceiptWidth = '58mm' | '80mm' | 'a4';

/** Real paper sizes in mm: what the web's slip, the desktop's roll page and the server's receipt all use. Height is a typical receipt's length. */
export const PAPERS: { width: ReceiptWidth; label: string; mm: [number, number] }[] = [
  { width: '58mm', label: 'Small roll', mm: [58, 120] },
  { width: '80mm', label: 'Roll', mm: [80, 120] },
  { width: 'a4', label: 'A4 page', mm: [210, 297] },
];

/**
 * Android's print screen picks the paper itself and ignores the receipt's own page size, so a roll receipt would spread over a
 * whole A4 sheet. Holding the slip to its real 58 or 80 mm column, centred, is what the web does too: on a roll it fills the
 * paper, on a sheet it prints at its true size. An A4 receipt is left alone.
 */
export function fitToPaper(html: string, width: ReceiptWidth): string {
  if (width === 'a4') return html;
  const mm = width === '58mm' ? 58 : 80;
  return `<style>html,body{width:${mm}mm !important;max-width:${mm}mm !important;margin-left:auto !important;margin-right:auto !important}</style>${html}`;
}
