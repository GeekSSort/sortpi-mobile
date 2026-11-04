import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { hideToast, useToast } from '@/ui/toast';
import { useTheme } from '@/hooks/use-theme';

import { useBottomBar } from '@/ui/bottom-bar';

import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

/** Sits just above the tab bar. Says what just happened ("Saved: Rice 1 kg") and, where it can be taken back, offers Undo. */
export function ToastHost() {
  const toast = useToast();
  const theme = useTheme();
  const bar = useBottomBar();
  if (!toast) return null;
  return (
    <Animated.View key={toast.id} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} pointerEvents="box-none" style={{ position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: 104 + bar, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" style={{ width: '100%', maxWidth: 560, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.text, boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
        <Icon name="Check" size={20} color={theme.card} />
        <ThemedText type="smallMedium" style={{ flex: 1, color: theme.card }}>
          {toast.text}
        </ThemedText>
        {toast.actionLabel ? (
          <Pressable accessibilityRole="button" onPress={() => { toast.onAction?.(); hideToast(); }} style={{ minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText type="smallMedium" style={{ color: theme.accentOnInverse }}>
              {toast.actionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
