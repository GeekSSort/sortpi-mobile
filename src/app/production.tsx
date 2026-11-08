import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { listProduction } from '@/extras/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

/** What was made, and what it used. The same screen lists combo packs made up from stock (`?combo=1`). Reading needs `inventory.view`; recording `inventory.adjust`. */
export default function ProductionScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { combo } = useLocalSearchParams<{ combo?: string }>();
  const isCombo = combo === '1';
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('inventory.view');
  const list = useInfiniteQuery({ queryKey: ['production'], queryFn: ({ pageParam }) => listProduction(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t(isCombo ? 'Combo Packs' : 'Production'), headerRight: perms.includes('inventory.adjust') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push({ pathname: '/record-production', params: { combo: isCombo ? '1' : '0' } })} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const made = item.lines.filter((l) => l.made);
          const used = item.lines.filter((l) => !l.made);
          return (
            <View style={{ gap: 4, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText type="bodyMedium" literal>
                  {item.reference_no}
                </ThemedText>
                <ThemedText type="bodyMedium" literal>
                  {formatBDT(item.outputs_cost, { dp: 0 })}
                </ThemedText>
              </View>
              <ThemedText type="small" numberOfLines={2} literal>
                {made.map((l) => `${Number(l.quantity)} × ${l.product_name}`).join(', ')}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={2} literal>
                {[item.production_date, used.length ? `${t('Used')}: ${used.map((l) => `${Number(l.quantity)} ${l.product_name}`).join(', ')}` : '', item.note].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          );
        }}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load this list.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Package" title={isCombo ? 'No packs made up yet' : 'Nothing recorded yet'} hint={isCombo ? 'Pack stock into gift sets and combos.' : 'Record what you made and what it used.'} />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}
