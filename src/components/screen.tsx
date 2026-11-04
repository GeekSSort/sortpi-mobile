import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Canvas background, safe area, 16px side margin, scrolls. Every tab screen starts here. */
/** `keyboardGap` is how much room to leave under a box being typed in, for example a bar that stays on screen above the keyboard. */
export function Screen({ children, topInset = true, keyboardGap = 24 }: { children: React.ReactNode; topInset?: boolean; keyboardGap?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView style={{ flex: 1 }} edges={topInset ? ['top'] : []}>
        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={keyboardGap}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: Spacing.three,
            paddingBottom: BottomTabInset + Spacing.four,
            gap: Spacing.three,
            maxWidth: MaxContentWidth,
            width: '100%',
            alignSelf: 'center',
          }}>
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
