/** The colour tokens on their own, so plain logic and its tests (contrast checks) can read them without loading React Native. */
export const Colors = {
  light: {
    // Scaffold keys (kept so template components keep working)
    text: '#0f172a',
    background: '#ffffff',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#475569',

    // Surfaces
    canvas: '#f8fafc', // screen behind cards
    card: '#ffffff',
    border: '#e2e8f0',
    inputBorder: '#cbd5e1',
    textMuted: '#586679',

    // Brand
    brand: '#2563eb',
    brandHover: '#1d4ed8',
    brandSoft: '#eff6ff',
    brandSoftBorder: '#bfdbfe',
    brandText: '#1d4ed8',
    onBrand: '#ffffff',
    focusRing: 'rgba(37, 99, 235, 0.15)', // halo round a focused input
    accentOnInverse: '#93c5fd', // links on the dark toast

    // "Money goes through": the green of the main money buttons (Take payment, Confirm, Save payment)
    go: '#15803d',
    goHover: '#166534',

    // Status (success / warning / danger) as foreground, tint and border
    success: '#166534',
    successSoft: '#f0fdf4',
    successBorder: '#bbf7d0',
    positive: '#15803d', // dots and trend arrows
    warning: '#92400e',
    warningSoft: '#fef3c7',
    danger: '#b91c1c',
    dangerSoft: '#fef2f2',
    dangerBorder: '#fecaca',
  },
  dark: {
    text: '#e6ebf3',
    background: '#0b111d',
    backgroundElement: '#172133',
    backgroundSelected: '#233046',
    textSecondary: '#b8c2d3',

    canvas: '#070b14',
    card: '#0f1624',
    border: '#233046',
    inputBorder: '#3b4a63',
    textMuted: '#8592a8',

    brand: '#2563eb',
    brandHover: '#3b82f6',
    brandSoft: 'rgba(37, 99, 235, 0.16)',
    brandSoftBorder: '#1e3a8a',
    brandText: '#93c5fd',
    onBrand: '#ffffff',
    focusRing: 'rgba(96, 165, 250, 0.35)',
    accentOnInverse: '#1d4ed8', // the toast is light in the dark theme

    go: '#15803d',
    goHover: '#166534',

    success: '#6ee7b7',
    successSoft: 'rgba(16, 185, 129, 0.14)',
    successBorder: '#065f46',
    positive: '#4ade80',
    warning: '#fdba74',
    warningSoft: 'rgba(234, 88, 12, 0.16)',
    danger: '#fca5a5',
    dangerSoft: 'rgba(239, 68, 68, 0.14)',
    dangerBorder: '#7f1d1d',
  },
} as const;

/**
 * One colour per way of being paid, so a shopkeeper knows the tile by colour before reading it. `fill` is the solid tile (white text on it
 * passes in both themes); `ink` is the same colour as text and border on the card, lightened in the dark theme where the fill is too dim to read. The four dark inks share one perceived lightness (OKLCH L 76), so no method looks louder than another.
 */
export const PayColors = {
  CASH: { fill: '#15803d', ink: { light: '#15803d', dark: '#38d173' } },
  MOBILE: { fill: '#d6176a', ink: { light: '#d6176a', dark: '#ff7fc1' } },
  CARD: { fill: '#2563eb', ink: { light: '#2563eb', dark: '#79b4fe' } },
  BANK: { fill: '#0f766e', ink: { light: '#0f766e', dark: '#1bccb7' } },
} as const;
