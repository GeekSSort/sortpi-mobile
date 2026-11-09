import { Image } from 'expo-image';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useWideLandscape } from '@/hooks/use-wide-landscape';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** Shared shell for sign-in screens: brand mark, title, one short form. Landscape places the brand beside the form. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const theme = useTheme();
  const { wideLandscape } = useWideLandscape();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.card }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ flexGrow: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: wideLandscape ? 'row' : 'column', alignItems: wideLandscape ? 'center' : 'stretch', gap: wideLandscape ? Spacing.six : Spacing.four, width: '100%', maxWidth: wideLandscape ? 960 : undefined, alignSelf: 'center' }}>
            <View style={{ flex: wideLandscape ? 1 : undefined, alignItems: 'center', gap: Spacing.two, marginBottom: wideLandscape ? 0 : Spacing.two }}>
              <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 64, height: 64, borderRadius: Radius.lg }} />
              <ThemedText type="heading">SortPi</ThemedText>
            </View>
            <View style={{ flex: wideLandscape ? 2 : undefined, minWidth: 0, gap: Spacing.four }}>
              <View style={{ gap: 6 }}>
                <ThemedText type="heading">{title}</ThemedText>
                {subtitle ? (
                  <ThemedText type="small" themeColor="textMuted">
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              {children}
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
