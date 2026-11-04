/** WCAG contrast between two #rrggbb colours: 4.5 is the minimum for normal text, 3 for large text and icons. */
const channels = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const luminance = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(channels(a)), luminance(channels(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** A translucent tint (like the dark theme's soft backgrounds) as the solid colour it looks like over a base. */
export function over(rgba: string, base: string): string {
  const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) return rgba;
  const [r, g, b] = channels(base);
  const a = Number(m[4]);
  const mix = (top: number, under: number) => Math.round(top * a + under * (1 - a)).toString(16).padStart(2, '0');
  return `#${mix(Number(m[1]), r)}${mix(Number(m[2]), g)}${mix(Number(m[3]), b)}`;
}
