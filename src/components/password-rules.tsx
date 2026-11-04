import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

/** One password rule: a green tick when it holds, an empty circle until then (never colour alone). */
export function Rule({ ok, text }: { ok: boolean; text: string }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <View accessible accessibilityLabel={`${t(text)}${ok ? t(', done') : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={ok ? 'CheckCircle' : 'Circle'} size={18} color={ok ? theme.success : theme.textMuted} />
      <ThemedText type="small" style={{ color: ok ? theme.success : theme.textSecondary }}>
        {text}
      </ThemedText>
    </View>
  );
}
