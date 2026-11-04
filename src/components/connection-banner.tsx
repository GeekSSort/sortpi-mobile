import { useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useOffline } from '@/ui/connection';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

/** Appears the moment the server stops answering and goes away when it answers again. "Try again" reloads what is on screen. */
export function ConnectionBanner() {
  const offline = useOffline();
  const theme = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  if (!offline) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: theme.warning }}>
      <Icon name="WifiOff" size={20} color={theme.card} />
      <ThemedText type="smallMedium" style={{ flex: 1, color: theme.card }}>
        No connection. Check your internet.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={() => void qc.refetchQueries({ type: 'active' })} style={{ minHeight: 48, paddingHorizontal: 8, justifyContent: 'center', marginVertical: -12 }}>
        <ThemedText type="smallMedium" style={{ color: theme.card, textDecorationLine: 'underline' }}>
          Try again
        </ThemedText>
      </Pressable>
    </View>
  );
}
