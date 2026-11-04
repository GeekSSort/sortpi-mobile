import { useState, type ComponentRef, type Ref } from 'react';

import { usePrefs } from '@/i18n/prefs';
import { bengaliText, scaled } from '@/i18n/translate';
import { Pressable, TextInput, useWindowDimensions, View, type TextInputProps } from 'react-native';

import { ControlHeight, Radius, Type, UbuntuFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

type Props = Omit<TextInputProps, 'style'> & { label: string; hint?: string; error?: string; secret?: boolean; required?: boolean; prefix?: string; ref?: Ref<ComponentRef<typeof TextInput>> };

/** Label above a 48px input: 1px border, 8px radius, brand focus ring (desktop onboarding form). */
export function Field({ label, hint, error, secret, required, prefix, onFocus, onBlur, ref, ...input }: Props) {
  const theme = useTheme();
  const { t, size, lang } = usePrefs();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText type="caption" style={{ fontFamily: UbuntuFonts.medium, color: theme.textSecondary }}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText type="caption" themeColor="textMuted">
            Required
          </ThemedText>
        ) : null}
      </View>
      <View
        style={{
          minHeight: ControlHeight.md,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? theme.danger : focused ? theme.brand : theme.inputBorder,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          backgroundColor: theme.card,
          boxShadow: focused ? `0 0 0 3px ${theme.focusRing}` : undefined,
        }}>
        {prefix ? (
          <ThemedText type="body" themeColor="textMuted" style={{ paddingLeft: 12 }}>
            {prefix}
          </ThemedText>
        ) : null}
        <TextInput
          {...input}
          ref={ref}
          secureTextEntry={secret && !shown}
          placeholderTextColor={theme.textMuted}
          placeholder={typeof input.placeholder === 'string' ? t(input.placeholder) : input.placeholder}
          accessibilityLabel={t(label)}
          allowFontScaling={false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[lang === 'bn' ? bengaliText(Type.body) : Type.body, { fontSize: scaled(Type.body.fontSize, size) * Math.min(Math.max(fontScale, 1), 1.3), lineHeight: scaled(Type.body.fontSize, size) * Math.min(Math.max(fontScale, 1), 1.3) * (lang === 'bn' ? 1.68 : 1.5), flex: 1, color: theme.text, paddingLeft: prefix ? 6 : 12, paddingRight: 12, paddingVertical: 10 }]}
        />
        {secret ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t(shown ? 'Hide password' : 'Show password')} onPress={() => setShown((s) => !s)} hitSlop={8} style={{ paddingHorizontal: 12 }}>
            <Icon name={shown ? 'EyeOff' : 'Eye'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="caption" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}
