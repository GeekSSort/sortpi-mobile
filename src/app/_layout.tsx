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
        <Stack.Screen name="add-product" options={{ ...header, presentation: 'modal', title: t('Add an item') }} />
        <Stack.Screen name="add-customer" options={{ ...header, presentation: 'modal', title: t('New customer') }} />
        <Stack.Screen name="end-shift" options={{ ...header, presentation: 'modal', title: t('Close the day') }} />
        <Stack.Screen name="customer/[id]" options={{ ...header, title: t('Customer') }} />
        <Stack.Screen name="sales" options={{ ...header, title: t('Sales') }} />
        <Stack.Screen name="sale/[id]" options={{ ...header, title: t('Sale') }} />
        <Stack.Screen name="suppliers" options={{ ...header, title: t('Suppliers') }} />
        <Stack.Screen name="supplier/[id]" options={{ ...header, title: t('Supplier') }} />
        <Stack.Screen name="add-supplier" options={{ ...header, presentation: 'modal', title: t('New supplier') }} />
        <Stack.Screen name="purchases" options={{ ...header, title: t('Purchases') }} />
        <Stack.Screen name="purchase/[id]" options={{ ...header, title: t('Order') }} />
        <Stack.Screen name="send-back/[id]" options={{ ...header, title: t('Return to supplier') }} />
        <Stack.Screen name="kinds-brands" options={{ ...header, title: t('Kinds and brands') }} />
        <Stack.Screen name="orders" options={{ ...header, title: t('Customer orders') }} />
        <Stack.Screen name="order/[id]" options={{ ...header, title: t('Order') }} />
        <Stack.Screen name="new-order" options={{ ...header, title: t('New order') }} />
        <Stack.Screen name="quotations" options={{ ...header, title: t('Quotations') }} />
        <Stack.Screen name="quotation/[id]" options={{ ...header, title: t('Quotation') }} />
        <Stack.Screen name="new-quotation" options={{ ...header, title: t('New quotation') }} />
        <Stack.Screen name="movements" options={{ ...header, title: t('Stock history') }} />
        <Stack.Screen name="expiry" options={{ ...header, title: t('Expiry dates') }} />
        <Stack.Screen name="transfers" options={{ ...header, title: t('Transfers') }} />
        <Stack.Screen name="new-transfer" options={{ ...header, title: t('New transfer') }} />
        <Stack.Screen name="transfer/[id]" options={{ ...header, title: t('Transfer') }} />
        <Stack.Screen name="price-check" options={{ ...header, title: t('Check a price') }} />
        <Stack.Screen name="team" options={{ ...header, title: t('Your team') }} />
        <Stack.Screen name="access" options={{ ...header, title: t('Access') }} />
        <Stack.Screen name="reports" options={{ ...header, title: t('Reports') }} />
        <Stack.Screen name="day-report" options={{ ...header, title: t('Day report') }} />
        <Stack.Screen name="products" options={{ ...header, title: t('Your items') }} />
        <Stack.Screen name="product/[id]" options={{ ...header, title: t('Item') }} />
        <Stack.Screen name="edit-product/[id]" options={{ ...header, title: t('Edit item') }} />
        <Stack.Screen name="stock-count" options={{ ...header, title: t('Count your stock') }} />
        <Stack.Screen name="new-purchase" options={{ ...header, title: t('New purchase') }} />
        <Stack.Screen name="money" options={{ ...header, title: t('Money in and out') }} />
        <Stack.Screen name="add-money" options={{ ...header, presentation: 'modal', title: t('Add money') }} />
        <Stack.Screen name="return/[id]" options={{ ...header, title: t('Return to supplier') }} />
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
