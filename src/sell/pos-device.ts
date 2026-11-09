import type { ReceiptWidth } from './paper.ts';

const brands = [
  { name: 'SUNMI', match: /\bsunmi\b/ },
  { name: 'iMin', match: /\bimin\b/ },
  { name: 'Telpo', match: /\b(telpo|telepower)\b/ },
  { name: 'Urovo', match: /\burovo\b/ },
  { name: 'PAX', match: /\bpax\b/ },
  { name: 'Newland', match: /\bnewland\b/ },
  { name: 'Elo', match: /\belo\b/ },
  { name: 'Zebra', match: /\bzebra\b/ },
] as const;

type Brand = (typeof brands)[number]['name'];

export function posDevice(android: boolean, manufacturer?: string | null, brand?: string | null, model?: string | null) {
  if (!android) return null;
  const name = brands.find((entry) => [manufacturer, brand].some((value) => entry.match.test(value?.toLowerCase() ?? '')))?.name;
  if (!name) return null;
  const id = (model ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fixedRoll: Partial<Record<Brand, RegExp>> = {
    iMin: /swift2/,
    Telpo: /tps900/,
    Urovo: /i9100/,
    PAX: /a920pro/,
    Newland: /n950/,
  };
  const suggestedPaper: ReceiptWidth | undefined = fixedRoll[name]?.test(id) ? '58mm' : undefined;
  return { name, model: model?.trim(), suggestedPaper };
}
