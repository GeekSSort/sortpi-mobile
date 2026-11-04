import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Canvas background, safe area, 16px side margin, scrolls. Every tab screen starts here. */
export function Screen({ children, topInset = true }: { children: React.ReactNode; topInset?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView style={{ flex: 1 }} edges={topInset ? ['top'] : []}>
        <ScrollView
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
