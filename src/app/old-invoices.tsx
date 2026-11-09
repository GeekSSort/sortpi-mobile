import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listOldInvoices } from '@/purchases/api';

/** Supplier bills from before the shop used SortPi. Needs `purchase.view`; adding needs `purchase.create`. */
export default function OldInvoicesScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('purchase.view');
  const list = useInfiniteQuery({ queryKey: ['purchases', 'old'], queryFn: ({ pageParam }) => listOldInvoices(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see old invoices. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Old Invoices'), headerRight: perms.includes('purchase.create') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/new-old-invoice')} /> : undefined }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" onPress={() => router.push({ pathname: '/purchase/[id]', params: { id: item.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.supplier_name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                {[item.reference_no, item.supplier_invoice_no, item.purchase_date, item.status === 'CANCELLED' ? t('Voided') : ''].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
            <ThemedText type="bodyMedium" literal>
              {formatBDT(item.grand_total, { dp: 0 })}
            </ThemedText>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the old invoices.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Receipt" title="No old invoices" hint="Write down supplier bills from before you used SortPi." />}
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
