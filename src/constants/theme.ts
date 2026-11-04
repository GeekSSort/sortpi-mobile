/**
 * SortPi design tokens for the phone app.
 *
 * Every value is taken from the other SortPi apps so the products read as one:
 *   - brand blue, slate neutrals, 8px radius, 44px controls: desktop/apps/till (onboarding.css, desktop.css)
 *   - Ubuntu type face (light 300 / regular 400 / medium 500, never bolder), the 12–32 type scale with
 *     its letter-spacing, and the e50/e100/e200 shadows: saas/client globals.css (Figma variables)
 *   - dark palette: saas/client `html.sheet-dark` values
 *
 * One entry point. Components import from here; screens import components.
 */

import '@/global.css';

import { Platform } from 'react-native';

export { Colors } from './palette';
import { Colors } from './palette';

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Ubuntu, loaded in the root layout (see `UbuntuFonts`). The web app never sets anything heavier than Medium. */
export { UbuntuFonts } from './theme-fonts';
import { UbuntuFonts } from './theme-fonts';

export const Fonts = Platform.select({
  ios: {
    sans: UbuntuFonts.regular,
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: UbuntuFonts.regular,
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
});

/** 4-point grid (scaffold names kept). */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Radius: cards, buttons, inputs and chips are 8 across web and desktop. */
export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/** Interactive controls. 48 is the Android touch-target minimum, comfortable for thumbs that are not used to touchscreens; 56 for the main button. */
export const ControlHeight = { md: 48, lg: 56 } as const;

/**
 * Type scale from the web design system (Figma 76:9437): size, line-height, letter-spacing in em turned into px.
 * Body text keeps 1.5; larger text is tightened (1.4 down to 1.2) because loose big text looks unfinished. Ubuntu medium stands in for semibold and bold.
 */
const scale = (size: number, em: number, line = 1.5) => ({
  fontSize: size,
  lineHeight: size * line,
  letterSpacing: size * em,
});
export const Type = {
  caption: { ...scale(12, -0.01), fontFamily: UbuntuFonts.regular },
  small: { ...scale(14, -0.02), fontFamily: UbuntuFonts.regular },
  smallMedium: { ...scale(14, -0.02), fontFamily: UbuntuFonts.medium },
  body: { ...scale(16, -0.02), fontFamily: UbuntuFonts.regular },
  bodyMedium: { ...scale(16, -0.02), fontFamily: UbuntuFonts.medium },
  lead: { ...scale(18, -0.02, 1.4), fontFamily: UbuntuFonts.medium },
  title: { ...scale(20, -0.02, 1.3), fontFamily: UbuntuFonts.medium },
  heading: { ...scale(24, -0.02, 1.25), fontFamily: UbuntuFonts.medium },
  display: { ...scale(28, -0.02, 1.2), fontFamily: UbuntuFonts.medium },
  hero: { ...scale(32, -0.02, 1.2), fontFamily: UbuntuFonts.medium },
} as const;
export type TypeVariant = keyof typeof Type;

/** Elevation, web tokens e50 / e100 / e200 as RN `boxShadow`. */
export const Shadows = {
  e50: '0 0 1px 0 rgba(0, 0, 0, 0.1)',
  e100: '0 6px 30px 0 rgba(0, 0, 0, 0.1)',
  e200: '0 3px 8px 0 rgba(0, 0, 0, 0.1)',
  /** Primary button glow from desktop onboarding. */
  brand: '0 6px 16px 0 rgba(37, 99, 235, 0.22)',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
