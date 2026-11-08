import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listSupplierReturns, supplierReturnSummary } from '@/purchases/api';

/** Goods sent back to suppliers, newest first. To send goods back, open the purchase and choose "Return to supplier". Needs `purchase.view`. */
export default function SupplierReturnsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('purchase.view') ?? false;
  const list = useInfiniteQuery({ queryKey: ['supplier-returns'], queryFn: ({ pageParam }) => listSupplierReturns(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const sum = useQuery({ queryKey: ['supplier-returns', 'summary'], queryFn: supplierReturnSummary, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see supplier returns. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {sum.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Returns" icon="Undo" value={String(sum.data.count)} />
          <ToneTile label="Worth" icon="Cash" value={formatBDT(sum.data.value, { dp: 0 })} />
        </View>
      ) : null}
      {list.isError ? <ErrorState message={t('Could not load the supplier returns.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Supplier Returns') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" onPress={() => router.push({ pathname: '/purchase/[id]', params: { id: item.purchase } })} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.supplier_name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                {[item.reference_no, item.purchase_reference, item.return_date, item.reason].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
            <ThemedText type="bodyMedium" literal>
              {formatBDT(item.grand_total, { dp: 0 })}
            </ThemedText>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </Tap>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Undo" title="No returns yet" hint="Open a purchase and choose Return to supplier." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), sum.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}
