// A barcode drawn as vectors from its digits, as the web receipt does (saas/client/src/lib/barcode.ts): EAN-13 when the number is a valid
// one, Code 39 otherwise (an invoice number such as MAIN26-3). Bars are drawn, not an image, so they stay sharp at any printer's dpi.

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn',
  G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
  O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw',
  W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};
const WIDE = 3;

export function isValidEan13(code: string): boolean {
  const d = code.trim();
  if (!/^\d{13}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10) === d[12];
}

function encodeEan13(code: string): string {
  const parity = PARITY[Number(code[0])];
  let modules = '101';
  for (let i = 1; i <= 6; i += 1) modules += parity[i - 1] === 'L' ? L[Number(code[i])] : G[Number(code[i])];
  modules += '01010';
  for (let i = 7; i <= 12; i += 1) modules += R[Number(code[i])];
  return `${modules}101`;
}

function encodeCode39(value: string): string {
  const parts: string[] = [];
  for (const char of `*${value.toUpperCase()}*`) {
    const widths = CODE39[char];
    if (!widths) throw new Error(`Code 39 cannot carry "${char}".`);
    let symbol = '';
    for (let i = 0; i < widths.length; i += 1) symbol += (i % 2 === 0 ? '1' : '0').repeat(widths[i] === 'w' ? WIDE : 1);
    parts.push(symbol);
  }
  return parts.join('0');
}

/** The bars as a string of 1 (ink) and 0 (paper) modules, or null when the text cannot be a barcode. */
export function encodeBarcode(code: string): { modules: string; text: string } | null {
  const text = (code || '').trim();
  if (!text) return null;
  try {
    return { modules: isValidEan13(text) ? encodeEan13(text) : encodeCode39(text), text };
  } catch {
    return null;
  }
}

/** An SVG string of the barcode with its text under it, quiet zone included. */
export function barcodeSvg(value: string, height = 34, moduleWidth = 1.2): string | null {
  const enc = encodeBarcode(value);
  if (!enc) return null;
  const quiet = moduleWidth * 10;
  const textH = 14;
  const width = enc.modules.length * moduleWidth + quiet * 2;
  const total = height + textH + 4;
  const bars: string[] = [];
  let run = 0;
  for (let i = 0; i <= enc.modules.length; i += 1) {
    if (enc.modules[i] === '1') {
      run += 1;
      continue;
    }
    if (run > 0) {
      bars.push(`<rect x="${quiet + (i - run) * moduleWidth}" y="0" width="${run * moduleWidth}" height="${height}" fill="#000"/>`);
      run = 0;
    }
  }
  const text = enc.text.replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;height:auto" width="${width}" height="${total}" viewBox="0 0 ${width} ${total}" shape-rendering="crispEdges"><rect width="${width}" height="${total}" fill="#fff"/>${bars.join('')}<text x="${width / 2}" y="${height + textH}" text-anchor="middle" font-family="monospace" font-size="${textH}" letter-spacing="${moduleWidth}">${text}</text></svg>`;
}
