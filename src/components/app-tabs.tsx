import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { visibleTabs } from '@/auth/roles';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { useDesktopShell, useShellAvailable } from '@/hooks/use-desktop-shell';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';
import { useT } from '@/i18n/prefs';
import { setTillFocus, useTillFocus } from '@/ui/till-focus';

const COMPACT_BAR_HEIGHT = 49;

const TABS = [
  { name: 'index', title: 'Home', href: '/', icon: 'Dashboard', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  { name: 'sell', title: 'Sell', href: '/sell', icon: 'ScanLine', sf: 'qrcode.viewfinder', md: 'qr_code_scanner' },
  { name: 'stock', title: 'Stock', href: '/stock', icon: 'Package', sf: 'shippingbox', md: 'inventory_2' },
  { name: 'customers', title: 'Customers', href: '/customers', icon: 'Users', sf: 'person.2', md: 'group' },
] as const;

export default function AppTabs() {
  const router = useRouter();
  const segments: readonly string[] = useSegments();
  const active = segments[1] ?? 'index';
  const { width, height } = useWindowDimensions();
  const tillFocus = useTillFocus();
  const shell = useDesktopShell(); // the open side menu replaces the bottom bar
  const wideTill = useShellAvailable() && active === 'sell'; // the wide till has its own toolbar, so no bottom bar either
  useEffect(() => { if (active !== 'sell') setTillFocus(false); }, [active]);
  const { bottom } = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { me } = useSession();
  const t = useT();
  const shown = visibleTabs(me?.permissions ?? []);
  const compact = Platform.OS === 'android' && width >= 720;
  const visible = TABS.filter((tab) => shown.includes(tab.name));
  const showCompactBar = compact && !shell && !wideTill && !keyboardVisible && !(tillFocus && active === 'sell' && width > height) && visible.length > 0;

  return (
    // NativeTabs still reserves the system bottom inset when its own bar is hidden.
    <View style={{ flex: 1, paddingBottom: showCompactBar ? COMPACT_BAR_HEIGHT : 0 }}>
      <NativeTabs
        hidden={compact}
        backgroundColor={c.card}
        tintColor={c.brandText}
        iconColor={{ default: c.textMuted, selected: c.brandText }}
        indicatorColor={c.brandSoft}
        labelStyle={{ default: { color: c.textMuted }, selected: { color: c.brandText } }}>
        {TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name} hidden={!shown.includes(tab.name)}>
            <NativeTabs.Trigger.Label>{t(tab.title)}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
          </NativeTabs.Trigger>
        ))}
        {/* The route stays for roles that have no other tab to land on. */}
        <NativeTabs.Trigger name="more" hidden>
          <NativeTabs.Trigger.Label>{t('More')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
        </NativeTabs.Trigger>
      </NativeTabs>
      {showCompactBar ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: COMPACT_BAR_HEIGHT + bottom, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: bottom, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
          {visible.map((tab) => {
            const selected = active === tab.name;
            const color = selected ? c.brandText : c.textMuted;
            return (
              <Tap
                key={tab.name}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => router.navigate(tab.href)}
                style={{ minHeight: 48, flex: 1, maxWidth: 148, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: selected ? c.brandSoft : 'transparent' }}>
                  <Icon name={tab.icon} size={20} color={color} />
                  <ThemedText type="smallMedium" style={{ color }} numberOfLines={1}>{tab.title}</ThemedText>
                </View>
              </Tap>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
