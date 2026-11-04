import { useState } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ControlHeight, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import { useT } from '@/i18n/prefs';

const SpringPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  /** primary = blue, to go somewhere; success = green, for money going through; secondary = outlined. */
  variant?: 'primary' | 'secondary' | 'success';
  size?: keyof typeof ControlHeight;
  loading?: boolean;
  disabled?: boolean;
  /** Glyph drawn after the title (desktop's "Get started →"). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = 'primary', size = 'md', loading, disabled, trailing, onPress, style }: Props) {
  const theme = useTheme();
  const t = useT();
  const primary = variant !== 'secondary';
  const fill = variant === 'success' ? theme.go : theme.brand;
  const fillPressed = variant === 'success' ? theme.goHover : theme.brandHover;
  const off = disabled || loading;
  const grey = !!disabled && !loading && variant !== 'secondary';
  // A press shrinks the button a touch and springs back, so a tap is felt before anything else happens.
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const spring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
      }}
      onPressOut={() => {
        setPressed(false);
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        {
          minHeight: ControlHeight[size],
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          // Disabled is drained of colour (grey, no glow) so it cannot be mistaken for a button that works; busy keeps its colour, dimmed.
          backgroundColor: grey ? theme.backgroundSelected : primary ? (pressed ? fillPressed : fill) : theme.card,
          borderWidth: 1,
          borderColor: grey ? theme.backgroundSelected : primary ? (pressed ? fillPressed : fill) : theme.inputBorder,
          boxShadow: primary && !grey ? Shadows.brand : undefined,
          opacity: loading ? 0.75 : disabled && !primary ? 0.5 : 1,
        },
        style,
        spring,
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.onBrand : theme.brand} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText type={size === 'lg' ? 'lead' : 'smallMedium'} style={{ color: grey ? theme.textMuted : primary ? theme.onBrand : theme.textSecondary }}>
            {title}
          </ThemedText>
          {trailing}
        </View>
      )}
    </SpringPressable>
  );
}
