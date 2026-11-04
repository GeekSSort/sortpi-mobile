import { Pressable, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { BottomSheet } from './bottom-sheet';
import { Icon, type IconName } from './icons/icon';
import { ThemedText } from './themed-text';

export type SheetAction = { title: string; icon: IconName; onPress: () => void };

/** What a long press on a row opens: a few big, plain choices about that one row, and Cancel. */
export function ActionSheet({ title, actions, onClose }: { title: string | null; actions: SheetAction[]; onClose: () => void }) {
  const theme = useTheme();
  const row = (a: { title: string; icon: IconName; onPress: () => void }, quiet?: boolean) => (
    <Pressable key={a.title} accessibilityRole="button" onPress={a.onPress} android_ripple={{ color: theme.backgroundSelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingHorizontal: Spacing.three }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: quiet ? theme.backgroundElement : theme.brandSoft }}>
        <Icon name={a.icon} size={20} color={quiet ? theme.textSecondary : theme.brand} />
      </View>
      <ThemedText type="bodyMedium" style={quiet ? { color: theme.textSecondary } : undefined}>
        {a.title}
      </ThemedText>
    </Pressable>
  );
  return (
    <BottomSheet visible={title !== null} onClose={onClose} title={title ?? ''}>
      {actions.map((a) => row({ ...a, onPress: () => { onClose(); a.onPress(); } }))}
      {row({ title: 'Cancel', icon: 'X', onPress: onClose }, true)}
    </BottomSheet>
  );
}
