import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** Shared shell for sign-in screens: brand mark, title, one short form (desktop onboarding layout, one column). */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.card }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
            <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 64, height: 64, borderRadius: Radius.lg }} />
            <ThemedText type="heading">SortPi</ThemedText>
          </View>
          <View style={{ gap: 6 }}>
            <ThemedText type="heading">{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textMuted">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
