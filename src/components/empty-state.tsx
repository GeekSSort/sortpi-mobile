import { useEffect } from 'react';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon, type IconName } from './icons/icon';
import { ThemedText } from './themed-text';

/** A list with nothing to show: say what is true, what to try, and give one button to get out of it. */
export function EmptyState({ icon, title, hint, action }: { icon: IconName; title: string; hint?: string; action?: { title: string; onPress: () => void } }) {
  const theme = useTheme();
  // The picture floats up and down very slowly so an empty page still feels alive. The system's reduce-motion setting stops it.
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(withSequence(withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })), -1);
  }, [lift]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <Animated.View entering={FadeInDown.duration(240)} style={{ alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.five }}>
      <Animated.View style={[{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }, bob]}>
        <Icon name={icon} size={32} color={theme.brand} />
      </Animated.View>
      <ThemedText type="heading" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {hint}
        </ThemedText>
      ) : null}
      {action ? <Button title={action.title} onPress={action.onPress} style={{ alignSelf: 'stretch' }} /> : null}
    </Animated.View>
  );
}
