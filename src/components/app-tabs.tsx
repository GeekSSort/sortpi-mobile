import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { useT } from '@/i18n/prefs';
import { visibleTabs } from '@/auth/roles';
import { Colors } from '@/constants/theme';

/**
 * Home / Sell / Stock / Customers / More, each shown only to roles that can use it (see auth/roles.ts).
 * SF Symbols on iOS, Material on Android: the bar itself stays native.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { me } = useSession();
  const t = useT();
  const shown = visibleTabs(me?.permissions ?? []);

  return (
    <NativeTabs
      backgroundColor={c.card}
      tintColor={c.brandText}
      iconColor={{ default: c.textMuted, selected: c.brandText }}
      indicatorColor={c.brandSoft}
      labelStyle={{ default: { color: c.textMuted }, selected: { color: c.brandText } }}>
      <NativeTabs.Trigger name="index" hidden={!shown.includes('index')}>
        <NativeTabs.Trigger.Label>{t('Home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sell" hidden={!shown.includes('sell')}>
        <NativeTabs.Trigger.Label>{t('Sell')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stock" hidden={!shown.includes('stock')}>
        <NativeTabs.Trigger.Label>{t('Stock')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox" md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers" hidden={!shown.includes('customers')}>
        <NativeTabs.Trigger.Label>{t('Customers')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>{t('More')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
