import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { useLocalShop } from '@/local/provider';
import { minutesOld, SYNC_TEXT, syncLevel } from '@/local/sync-status';
import { useDrawer } from '@/menu/drawer';
import { useOffline } from '@/ui/connection';

import { Icon } from './icons/icon';
import { NotificationBell } from './notification-bell';
import { Tap } from './tap';

/**
 * The state of the shop copy on this phone, small enough for the right end of a header: a spinner while it downloads, a green tick when it
 * is up to date, an amber warning when it is old or missing, a red one when the last download failed or there is no connection.
 * A tap opens Profile & quick settings, where "Update now" is. It is hidden for someone the server gives no copy.
 */
export function SyncStatus() {
  const theme = useTheme();
  const t = useT();
  const shop = useLocalShop();
  const offline = useOffline();
  const { openProfile } = useDrawer();
  // "Old" is a matter of the clock, so look again once a minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const level = syncLevel({ allowed: shop.allowed, syncing: shop.syncing, error: shop.error, offline, syncedAt: shop.syncedAt, now });
  if (level === 'off') return null;
  const label = t(SYNC_TEXT[level], { n: String(minutesOld(shop.syncedAt, now) ?? 0) });

  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('Opens Profile & quick settings')} onPress={openProfile} hitSlop={6} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      {level === 'syncing' ? <ActivityIndicator size="small" color={theme.brand} /> : null}
      {level === 'fresh' ? <Icon name="CheckCircle" size={20} color={theme.success} /> : null}
      {level === 'stale' || level === 'none' ? <Icon name="TriangleAlert" size={20} color={theme.warning} /> : null}
      {level === 'failed' ? <Icon name="TriangleAlert" size={20} color={theme.danger} /> : null}
      {level === 'offline' ? <Icon name="WifiOff" size={20} color={theme.danger} /> : null}
    </Tap>
  );
}

/** Whatever button a page already puts at the right end of its header, then the notification bell and the sync status. */
export function HeaderEnd({ children }: { children?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {children}
      <NotificationBell />
      <SyncStatus />
    </View>
  );
}

/** For `headerRight`: keeps the page's own button (or none) and adds the sync status. */
export function withSyncStatus(right?: () => ReactNode) {
  return function HeaderRightWithSyncStatus() {
    return <HeaderEnd>{right?.()}</HeaderEnd>;
  };
}
