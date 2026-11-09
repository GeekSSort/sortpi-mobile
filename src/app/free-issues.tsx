import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { freeSummary, listFreeIssues } from '@/extras/api';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

/** Goods given away free: who got what, and what it cost the shop. Needs `inventory.adjust`. */
export default function FreeIssuesScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('inventory.adjust') ?? false;
  const list = useInfiniteQuery({ queryKey: ['free-issues'], queryFn: ({ pageParam }) => listFreeIssues(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const sum = useQuery({ queryKey: ['free-issues', 'summary'], queryFn: freeSummary, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see free issues. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {sum.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Given free" icon="Gift" value={String(Number(sum.data.quantity))} />
          <ToneTile label="Cost to you" icon="Cash" tone={Number(sum.data.value) > 0 ? 'warn' : undefined} value={formatBDT(sum.data.value, { dp: 0 })} />
        </View>
      ) : null}
      {list.isError ? <ErrorState message={t('Could not load the free issues.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Free Issues'), headerRight: () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/give-free')} /> }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const w = saleWhen(item.created_at);
          const day = w.day === 'today' ? t('Today') : w.day === 'yesterday' ? t('Yesterday') : `${w.day.date} ${MONTHS[lang][w.day.month]}`;
          return (
            <View style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
                <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={2} literal>
                  {`${item.product_name}${item.variant_name && item.variant_name !== item.product_name ? ` ${item.variant_name}` : ''}`}
                </ThemedText>
                <ThemedText type="bodyMedium" literal>
                  {`${Number(item.quantity)} ${item.unit_short_name}`}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                {[item.recipient, `${day}, ${w.time}`, item.reference_no].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Gift" title="Nothing given free" hint="Goods you give away, like samples, show here." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), sum.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
    </View>
  );
}
