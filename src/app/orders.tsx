import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { compareMoney, formatBDT } from '@/lib/money';
import { countOrders, listOrders, type CustomerOrder } from '@/orders/api';
import { OrderPills, useOrderLook } from '@/orders/look';

type Chip = { id: string; label: string; status: 'OPEN' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'ALL'; due?: 'overdue' };
const CHIPS: Chip[] = [
  { id: 'open', label: 'Waiting', status: 'OPEN' },
  { id: 'ready', label: 'Ready to collect', status: 'READY' },
  { id: 'late', label: 'Late', status: 'ALL', due: 'overdue' },
  { id: 'done', label: 'Handed over', status: 'COLLECTED' },
  { id: 'off', label: 'Cancelled', status: 'CANCELLED' },
  { id: 'all', label: 'All', status: 'ALL' },
];

/** Things customers ordered and will collect later, with a deposit: what is waiting, what is ready, and what is late. */
export default function OrdersScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const [chip, setChip] = useState<Chip>(CHIPS[0]);
  const [search, setSearch] = useState('');
  const allowed = me?.permissions?.includes('sale.view') ?? false;
  const canAdd = me?.permissions?.includes('sale.create') ?? false;

  const waiting = useQuery({ queryKey: ['orders', 'count', 'OPEN'], queryFn: () => countOrders({ status: 'OPEN' }), enabled: allowed, staleTime: 30_000 });
  const ready = useQuery({ queryKey: ['orders', 'count', 'READY'], queryFn: () => countOrders({ status: 'READY' }), enabled: allowed, staleTime: 30_000 });
  const late = useQuery({ queryKey: ['orders', 'count', 'late'], queryFn: () => countOrders({ due: 'overdue' }), enabled: allowed, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['orders', 'list', chip.id, search.trim()],
    queryFn: ({ pageParam }) => listOrders({ status: chip.status, due: chip.due, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see orders. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <ToneTile label="Waiting" icon="Package" value={waiting.data === undefined ? '…' : String(waiting.data)} onPress={() => setChip(CHIPS[0])} selected={chip.id === 'open'} />
        <ToneTile label="Ready to collect" icon="CheckCircle" tone="good" value={ready.data === undefined ? '…' : String(ready.data)} onPress={() => setChip(CHIPS[1])} selected={chip.id === 'ready'} />
        <ToneTile label="Late" icon={late.data ? 'TriangleAlert' : 'CheckCircle'} tone={late.data ? 'bad' : 'good'} value={late.data === undefined ? '…' : String(late.data)} onPress={() => setChip(CHIPS[2])} selected={chip.id === 'late'} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {CHIPS.map((c) => {
          const on = chip.id === c.id;
          return (
            <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setChip(c)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {c.label}
              </ThemedText>
            </Tap>
          );
        })}
      </ScrollView>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, phone or order number" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load the orders.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Customer orders'), headerRight: canAdd ? () => <HeaderAction title="New" icon="Plus" onPress={() => router.push('/new-order')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <OrderRow order={item} onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() || chip.id !== 'all' ? (
            <EmptyState icon="Search" title="Nothing here" hint="No order matches this. Try another tab or search." action={{ title: 'Show all', onPress: () => { setSearch(''); setChip(CHIPS[5]); } }} />
          ) : (
            <EmptyState icon="Package" title="No orders yet" hint="Orders are for things a customer wants later, like a cake or a phone, with some money paid now." action={canAdd ? { title: 'Take an order', onPress: () => router.push('/new-order') } : undefined} />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), waiting.refetch(), ready.refetch(), late.refetch()])}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function OrderRow({ order, onPress }: { order: CustomerOrder; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const look = useOrderLook();
  const owes = compareMoney(order.balance, '0') > 0 && (order.status === 'OPEN' || order.status === 'READY');
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${order.customer_name}, ${order.reference_no}, ${formatBDT(order.grand_total, { dp: 0 })}`} onPress={onPress} style={{ flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: look.bar(order), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {order.customer_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {`${order.reference_no}${order.items[0] ? ` · ${order.items[0].product_name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}` : ''}`}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <OrderPills order={order} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2, justifyContent: 'center', flexShrink: 0 }}>
        <ThemedText type="bodyMedium" literal>
          {formatBDT(order.grand_total, { dp: 0 })}
        </ThemedText>
        {owes ? (
          <ThemedText type="caption" style={{ color: theme.danger }} numberOfLines={1} literal>
            {t('{amount} to pay', { amount: formatBDT(order.balance, { dp: 0 }) })}
          </ThemedText>
        ) : null}
        <Icon name="ChevronRight" size={16} color={theme.textMuted} />
      </View>
    </Tap>
  );
}
