import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icons/icon';
import { ThemedText } from './themed-text';
import { useT } from '@/i18n/prefs';

/** A text-and-icon action for the right end of a native header (Add, End shift). */
export function HeaderAction({ title, icon, onPress }: { title: string; icon?: IconName; onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t(title)} onPress={onPress} android_ripple={{ color: theme.brandSoft, borderless: true, radius: 28 }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
      {icon ? <Icon name={icon} size={18} color={theme.brandText} /> : null}
      <ThemedText type="bodyMedium" maxScale={1.15} numberOfLines={1} style={{ color: theme.brandText }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}
