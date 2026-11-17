import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { badgeText } from '@/notices/badge';
import { unreadCount } from '@/notices/api';

import { Icon } from './icons/icon';
import { Tap } from './tap';
import { ThemedText } from './themed-text';

/**
 * The bell at the right end of a header: it opens the notifications and shows how many are unread. Hidden for someone who may not read
 * them. The count is asked for at most once a minute and refreshed every five; opening the list and marking messages read refreshes it
 * (they share the `notices` query key).
 */
export function NotificationBell() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('notification.view') ?? false;
  const unread = useQuery({ queryKey: ['notices', 'unread'], queryFn: unreadCount, enabled: allowed, staleTime: 60_000, refetchInterval: 5 * 60_000 });
  if (!allowed) return null;
  const badge = badgeText(unread.data);
  const label = badge ? `${t('Notifications')}, ${t('{n} unread', { n: String(unread.data) })}` : t('Notifications');

  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push('/notifications')} hitSlop={6} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="Bell" size={20} color={theme.text} />
      {badge ? (
        <View style={{ position: 'absolute', top: 6, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.danger }}>
          <ThemedText type="caption" literal maxScale={1} style={{ color: theme.onBrand, fontSize: 10, lineHeight: 13 }}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
    </Tap>
  );
}
