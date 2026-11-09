import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice as NoticeBox } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { listNotices, markAllRead, markRead } from '@/notices/api';

/** Messages from your shop's system, newest first. Tap one to mark it read. Needs `notification.view`; marking read needs `notification.update`. */
export default function NotificationsScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('notification.view');
  const canMark = perms.includes('notification.update');
  const list = useInfiniteQuery({ queryKey: ['notices'], queryFn: ({ pageParam }) => listNotices(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey: ['notices'] });
  const one = useMutation({ mutationFn: (id: string) => markRead([id]), onSuccess: refresh });
  const all = useMutation({ mutationFn: markAllRead, onSuccess: refresh });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <NoticeBox>You are not allowed to see notifications. Ask the owner.</NoticeBox>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Notifications'), headerRight: canMark && rows.some((r) => !r.is_read) ? () => <HeaderAction title="Read all" icon="CheckCircle" onPress={() => all.mutate()} /> : undefined }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const w = saleWhen(item.created_at);
          const day = w.day === 'today' ? t('Today') : w.day === 'yesterday' ? t('Yesterday') : `${w.day.date} ${MONTHS[lang][w.day.month]}`;
          return (
            <Tap accessibilityRole="button" disabled={!canMark || item.is_read} onPress={() => one.mutate(item.id)} style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: item.is_read ? theme.border : theme.brand, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <ThemedText type={item.is_read ? 'body' : 'bodyMedium'} literal>
                {item.title}
              </ThemedText>
              {item.message ? (
                <ThemedText type="small" themeColor="textSecondary" literal>
                  {item.message}
                </ThemedText>
              ) : null}
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${day}, ${w.time}`}
              </ThemedText>
            </Tap>
          );
        }}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the notifications.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Bell" title="Nothing new" hint="Messages from your shop show here." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
    </View>
  );
}
