export type Lang = 'en' | 'bn';
export type Vars = Record<string, string | number>;

/** Fill `{name}` slots. A slot with no value is left as written, so a missing value shows up instead of vanishing. */
export function interpolate(text: string, vars?: Vars): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (vars && name in vars ? String(vars[name]) : whole));
}

/**
 * English text is the key. In Bangla the dictionary answers; an English line with no Bangla yet shows in English
 * (and is reported, so it can be found while testing) rather than as a blank or a code.
 */
export function translate(dict: Record<string, string>, lang: Lang, text: string, vars?: Vars, onMissing?: (text: string) => void): string {
  if (lang === 'bn') {
    const hit = dict[text];
    if (hit !== undefined) return interpolate(hit, vars);
    onMissing?.(text);
  }
  return interpolate(text, vars);
}

/** Bangla phones start in Bangla; everyone else in English. The person can change it on the first screen and in More. */
export const defaultLang = (locale: string | undefined): Lang => (locale?.toLowerCase().startsWith('bn') ? 'bn' : 'en');

import { UbuntuFonts } from '../constants/theme-fonts.ts';

/**
 * Ubuntu has no Bangla letters, and Android then measures a line narrower than it draws, so words wrap too early.
 * In Bangla the phone's own font is used instead, with the same weight, plain spacing and a little more line height.
 */
/** Bangla keeps the old generous line (1.5 times the size, plus 12%) however tight the Latin line is, because its marks sit above and below the letters. */
function bengaliLine(style: { fontSize?: number; lineHeight?: number }): number | undefined {
  if (style.fontSize) return Math.round(style.fontSize * 1.5 * 1.12 * 100) / 100;
  return style.lineHeight ? Math.round(style.lineHeight * 1.12 * 100) / 100 : style.lineHeight;
}

export function bengaliText<T extends { fontFamily?: string; fontSize?: number; letterSpacing?: number; lineHeight?: number }>(style: T): T & { fontWeight?: '300' | '400' | '500' | '700' } {
  const f = style.fontFamily;
  if (f !== UbuntuFonts.medium && f !== UbuntuFonts.regular && f !== UbuntuFonts.light) return style;
  return { ...style, fontFamily: undefined, fontWeight: f === UbuntuFonts.medium ? '700' : f === UbuntuFonts.light ? '300' : '400', letterSpacing: 0, lineHeight: bengaliLine(style) };
}

export type TextSize = 'normal' | 'large' | 'xlarge';
export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.2, xlarge: 1.4 };
export const scaled = (px: number, size: TextSize): number => Math.round(px * TEXT_SCALE[size] * 100) / 100;
