import { Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium, useFonts } from '@expo-google-fonts/ubuntu';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { SessionProvider, useSession } from '@/auth/session-provider';
import { LocalProvider } from '@/local/provider';
import { PrefsProvider, usePrefs } from '@/i18n/prefs';
import { AskFab } from '@/ask/ask-fab';
import { ConnectionBanner } from '@/components/connection-banner';
import { useHeaderOptions } from '@/components/header-options';
import { BackWithMenu, DrawerProvider } from '@/menu/drawer';
import { ToastHost } from '@/components/toast-host';
import { Colors } from '@/constants/theme';
import { initAnalytics, useScreenTracking } from '@/lib/analytics';
import { initPerformance } from '@/lib/perf';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function RootLayout() {
  // Not at module level: the build also loads this file in Node (to list the routes), where there is no Firebase app.
  useEffect(() => {
    initPerformance();
    initAnalytics();
  }, []);
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const [fontsLoaded] = useFonts({ Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium });
  if (!fontsLoaded) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardProvider>
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.brand, background: c.canvas, card: c.card, text: c.text, border: c.border } }}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <PrefsProvider>
          <SessionProvider>
            <LocalProvider>
              <DrawerProvider>
                <Gate />
              </DrawerProvider>
            </LocalProvider>
          </SessionProvider>
        </PrefsProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/** Which screens exist depends on the session: the router cannot reach a screen its guard hides. */
function Gate() {
  useScreenTracking();
  const { status } = useSession();
  const { ready, langChosen, t } = usePrefs();
  const header = useHeaderOptions();
  // Pages carry the back arrow and the menu button together at the top left, where the drawer comes from; the pop-up forms do not.
  const page = { ...header, headerLeft: () => <BackWithMenu /> };

  useEffect(() => {
    if (status !== 'booting') void SplashScreen.hideAsync();
  }, [status]);
  if (status === 'booting' || !ready) return null;

  return (
    <View style={{ flex: 1 }}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-product" options={{ ...header, presentation: 'modal', title: t('Add Products') }} />
        <Stack.Screen name="add-customer" options={{ ...header, presentation: 'modal', title: t('New customer') }} />
        <Stack.Screen name="end-shift" options={{ ...header, presentation: 'modal', title: t('Day Close') }} />
        <Stack.Screen name="customer/[id]" options={{ ...page, title: t('Customer') }} />
        <Stack.Screen name="sales" options={{ ...page, title: t('Invoice') }} />
        <Stack.Screen name="sale/[id]" options={{ ...page, title: t('Sale') }} />
        <Stack.Screen name="suppliers" options={{ ...page, title: t('Suppliers') }} />
        <Stack.Screen name="supplier/[id]" options={{ ...page, title: t('Supplier') }} />
        <Stack.Screen name="add-employee" options={{ ...header, presentation: 'modal', title: t('Add a person') }} />
        <Stack.Screen name="add-branch" options={{ ...header, presentation: 'modal', title: t('Add Branch') }} />
        <Stack.Screen name="add-warehouse" options={{ ...header, presentation: 'modal', title: t('Add Warehouse') }} />
        <Stack.Screen name="edit-purchase" options={{ ...header, presentation: 'modal', title: t('Change purchase') }} />
        <Stack.Screen name="add-counter" options={{ ...header, presentation: 'modal', title: t('Add Counter') }} />
        <Stack.Screen name="add-role" options={{ ...header, presentation: 'modal', title: t('Add Role') }} />
        <Stack.Screen name="add-user" options={{ ...header, presentation: 'modal', title: t('Add a person') }} />
        <Stack.Screen name="add-account" options={{ ...header, presentation: 'modal', title: t('Add Account') }} />
        <Stack.Screen name="add-transfer" options={{ ...header, presentation: 'modal', title: t('Move money') }} />
        <Stack.Screen name="add-regular-payment" options={{ ...header, presentation: 'modal', title: t('Add Regular Payment') }} />
        <Stack.Screen name="new-old-invoice" options={{ ...header, presentation: 'modal', title: t('Old Invoice') }} />
        <Stack.Screen name="give-free" options={{ ...header, presentation: 'modal', title: t('Give goods free') }} />
        <Stack.Screen name="record-production" options={{ ...header, presentation: 'modal', title: t('Record production') }} />
        <Stack.Screen name="add-supplier" options={{ ...header, presentation: 'modal', title: t('New supplier') }} />
        <Stack.Screen name="purchases" options={{ ...page, title: t('Purchase History') }} />
        <Stack.Screen name="purchase/[id]" options={{ ...page, title: t('Order') }} />
        <Stack.Screen name="send-back/[id]" options={{ ...page, title: t('Return to supplier') }} />
        <Stack.Screen name="kinds-brands" options={{ ...page, title: t('Categories & Brands') }} />
        <Stack.Screen name="orders" options={{ ...page, title: t('Customer Orders') }} />
        <Stack.Screen name="order/[id]" options={{ ...page, title: t('Order') }} />
        <Stack.Screen name="new-order" options={{ ...page, title: t('New order') }} />
        <Stack.Screen name="quotations" options={{ ...page, title: t('Quotations') }} />
        <Stack.Screen name="quotation/[id]" options={{ ...page, title: t('Quotation') }} />
        <Stack.Screen name="new-quotation" options={{ ...page, title: t('New quotation') }} />
        <Stack.Screen name="movements" options={{ ...page, title: t('Stock Movements') }} />
        <Stack.Screen name="expiry" options={{ ...page, title: t('Expiry') }} />
        <Stack.Screen name="transfers" options={{ ...page, title: t('Transfers') }} />
        <Stack.Screen name="new-transfer" options={{ ...page, title: t('New transfer') }} />
        <Stack.Screen name="transfer/[id]" options={{ ...page, title: t('Transfer') }} />
        <Stack.Screen name="price-check" options={{ ...page, title: t('Price Check') }} />
        <Stack.Screen name="shop-settings" options={{ ...page, title: t('Settings') }} />
        <Stack.Screen name="payment-methods" options={{ ...page, title: t('Ways to pay') }} />
        <Stack.Screen name="stock-types" options={{ ...page, title: t('Stock types') }} />
        <Stack.Screen name="company" options={{ ...page, title: t('Shop details') }} />
        <Stack.Screen name="coupons" options={{ ...page, title: t('Coupons') }} />
        <Stack.Screen name="points" options={{ ...page, title: t('Customer points') }} />
        <Stack.Screen name="plan" options={{ ...page, title: t('Plan & billing') }} />
        <Stack.Screen name="team" options={{ ...page, title: t('Employees') }} />
        <Stack.Screen name="access" options={{ ...page, title: t('Users & Roles') }} />
        <Stack.Screen name="activity" options={{ ...page, title: t('Activity Log') }} />
        <Stack.Screen name="warehouses" options={{ ...page, title: t('Warehouses') }} />
        <Stack.Screen name="counters" options={{ ...page, title: t('Counters') }} />
        <Stack.Screen name="accounts" options={{ ...page, title: t('Accounts') }} />
        <Stack.Screen name="account/[id]" options={{ ...page, title: t('Account') }} />
        <Stack.Screen name="account-transfers" options={{ ...page, title: t('Account Transfers') }} />
        <Stack.Screen name="regular-payments" options={{ ...page, title: t('Regular Payments') }} />
        <Stack.Screen name="price-groups" options={{ ...page, title: t('Price Groups') }} />
        <Stack.Screen name="refills" options={{ ...page, title: t('Refills') }} />
        <Stack.Screen name="discounts" options={{ ...page, title: t('Discount') }} />
        <Stack.Screen name="supplier-returns" options={{ ...page, title: t('Supplier Returns') }} />
        <Stack.Screen name="old-invoices" options={{ ...page, title: t('Old Invoices') }} />
        <Stack.Screen name="free-issues" options={{ ...page, title: t('Free Issues') }} />
        <Stack.Screen name="production" options={{ ...page, title: t('Production') }} />
        <Stack.Screen name="seasons" options={{ ...page, title: t('Seasons') }} />
        <Stack.Screen name="metal-rates" options={{ ...page, title: t('Metal Rates') }} />
        <Stack.Screen name="serials" options={{ ...page, title: t('Serial Numbers') }} />
        <Stack.Screen name="barcode-labels" options={{ ...page, title: t('Barcode Labels') }} />
        <Stack.Screen name="notifications" options={{ ...page, title: t('Notifications') }} />
        <Stack.Screen name="gift-cards" options={{ ...page, title: t('Gift Cards') }} />
        <Stack.Screen name="instalments" options={{ ...page, title: t('Instalments') }} />
        <Stack.Screen name="deliveries" options={{ ...page, title: t('Deliveries') }} />
        <Stack.Screen name="trade-ins" options={{ ...page, title: t('Trade-ins') }} />
        <Stack.Screen name="commission" options={{ ...page, title: t('Commission') }} />
        <Stack.Screen name="shifts" options={{ ...page, title: t('Shifts') }} />
        <Stack.Screen name="payroll" options={{ ...page, title: t('Payroll') }} />
        <Stack.Screen name="reports" options={{ ...page, title: t('Reports') }} />
        <Stack.Screen name="day-report" options={{ ...page, title: t('Day report') }} />
        <Stack.Screen name="ask" options={{ ...header, presentation: 'modal', title: t('Ask your shop') }} />
        <Stack.Screen name="ask-model" options={{ ...page, title: t('Smarter answers') }} />
        <Stack.Screen name="products" options={{ ...page, title: t('Products List') }} />
        <Stack.Screen name="product/[id]" options={{ ...page, title: t('Item') }} />
        <Stack.Screen name="edit-product/[id]" options={{ ...page, title: t('Edit item') }} />
        <Stack.Screen name="stock-count" options={{ ...page, title: t('Stock Count') }} />
        <Stack.Screen name="new-purchase" options={{ ...page, title: t('New Purchase') }} />
        <Stack.Screen name="money" options={{ ...page, title: t('Income & Expense') }} />
        <Stack.Screen name="add-money" options={{ ...header, presentation: 'modal', title: t('Add money') }} />
        <Stack.Screen name="return/[id]" options={{ ...page, title: t('Return & Refunds') }} />
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
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'locked'}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unreachable'}>
        <Stack.Screen name="unreachable" />
      </Stack.Protected>
    </Stack>
    {status === 'signedIn' ? <AskFab /> : null}
    <ConnectionBanner />
    <ToastHost />
    </View>
  );
}
