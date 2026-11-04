import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Type, type ThemeColor, type TypeVariant } from '@/constants/theme';
import { usePrefs } from '@/i18n/prefs';
import { useTextFactor } from '@/i18n/text-factor';
import { bengaliText } from '@/i18n/translate';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /** A step on the SortPi type scale. */
  type?: TypeVariant;
  themeColor?: ThemeColor;
  /** Upper limit for this text's total growth (size setting times the phone's size). For bars and headers that share a row with other things. */
  maxScale?: number;
  /** The shop's own words (a name or a note somebody typed): shown as written, never looked up in the dictionary. */
  literal?: boolean;
};

/**
 * Every line of text in the app. A plain string is shown in the chosen language and at the chosen text size.
 * In Bangla a no-break space follows the line: Android can clip the last glyph of a short Bangla word (…করুন) without it.
 */
export function ThemedText({ style, type = 'body', themeColor, maxScale, literal, children, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const own: TextStyle = StyleSheet.flatten([Type[type], { color: theme[themeColor ?? 'text'] }, style]) ?? {};
  const base: TextStyle = lang === 'bn' ? bengaliText(own) : own;
  // One size rule: the person's SortPi text size, times the phone's own font size capped at 1.3 so the two together never run away.
  // The phone's automatic scaling is switched off below, otherwise it would be applied a second time.
  const factor = Math.min(useTextFactor(), maxScale ?? Infinity);
  const grown = (n: number | undefined) => (typeof n === 'number' ? Math.round(n * factor * 100) / 100 : n);
  const flat: TextStyle = { ...base, fontSize: grown(base.fontSize), lineHeight: grown(base.lineHeight), letterSpacing: grown(base.letterSpacing) };
  return (
    <Text allowFontScaling={false} style={flat} {...rest}>
      {typeof children === 'string' && !literal ? (lang === 'bn' ? `${t(children)}\u00A0` : t(children)) : children}
    </Text>
  );
}
