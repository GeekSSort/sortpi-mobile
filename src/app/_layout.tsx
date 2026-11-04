import { Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium, useFonts } from '@expo-google-fonts/ubuntu';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider, useSession } from '@/auth/session-provider';
import { PrefsProvider, usePrefs } from '@/i18n/prefs';
import { ConnectionBanner } from '@/components/connection-banner';
import { useHeaderOptions } from '@/components/header-options';
import { ToastHost } from '@/components/toast-host';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const [fontsLoaded] = useFonts({ Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium });
  if (!fontsLoaded) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.brand, background: c.canvas, card: c.card, text: c.text, border: c.border } }}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <PrefsProvider>
          <SessionProvider>
            <Gate />
          </SessionProvider>
        </PrefsProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Which screens exist depends on the session: the router cannot reach a screen its guard hides. */
function Gate() {
  const { status } = useSession();
  const { ready, langChosen, t } = usePrefs();
  const header = useHeaderOptions();

  useEffect(() => {
    if (status !== 'booting') void SplashScreen.hideAsync();
  }, [status]);
  if (status === 'booting' || !ready) return null;

  return (
    <View style={{ flex: 1 }}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="end-shift" options={{ ...header, presentation: 'modal', title: t('Close the day') }} />
        <Stack.Screen name="sales" options={{ ...header, title: t('Sales') }} />
        <Stack.Screen name="sale/[id]" options={{ ...header, title: t('Sale') }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut' && !langChosen}>
        <Stack.Screen name="language" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut' && langChosen}>
        {/* First entry is where the router lands when signed out: login sends you to workspace if none is saved. */}
        <Stack.Screen name="login" />
        <Stack.Screen name="join" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="workspace" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'locked'}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unreachable'}>
        <Stack.Screen name="unreachable" />
      </Stack.Protected>
    </Stack>
    <ConnectionBanner />
    <ToastHost />
    </View>
  );
}
