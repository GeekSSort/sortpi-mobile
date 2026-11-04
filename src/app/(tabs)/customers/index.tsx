import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { HeaderAction } from '@/components/header-action';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { ErrorState } from '@/components/error-state';
import { ToneTile as Tile } from '@/components/tone-tile';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { amountDue } from '@/customers/logic';
import { customerSummary, listCustomers, type CustomerRow } from '@/customers/api';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';

/** Who owes what: search, "owes money" filter, open one to take a payment, add a customer. */
export default function CustomersScreen() {
  const theme = useTheme();
  const t = useT();
  const bigText = useTextFactor() > BIG_TEXT;
  const router = useRouter();
  const { me } = useSession();
  const [search, setSearch] = useState('');
  const [owes, setOwes] = useState(false);
  const [picked, setPicked] = useState<CustomerRow | null>(null);
  // Home's "Customers owe you" tile lands here already filtered.
  const params = useLocalSearchParams<{ owes?: string; n?: string }>();
  useEffect(() => {
    if (params.owes === '1') setOwes(true);
  }, [params.owes, params.n]);
  const canAdd = me?.permissions?.includes('customer.create') ?? false;

  const summary = useQuery({ queryKey: ['customers', 'summary'], queryFn: customerSummary, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['customers', 'list', search.trim(), owes],
    queryFn: ({ pageParam }) => listCustomers({ search, owes, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = summary.data;

  const open = (c: CustomerRow) => router.push({ pathname: '/customer/[id]', params: { id: c.id } });

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Customers" icon="Users" value={s ? String(s.total_customers) : '…'} selected={!owes} onPress={() => setOwes(false)} />
        <Tile label="Owe money" icon="Users" tone={s && s.with_due > 0 ? 'bad' : undefined} value={s ? String(s.with_due) : '…'} selected={owes} onPress={() => setOwes((v) => !v)} />
        <Tile label="To collect" value={s ? formatBDT(s.total_receivable, { dp: 0, symbol: false }) : '…'} icon="Cash" tone={s && amountDue(s.total_receivable) !== '0.00' ? 'bad' : undefined} selected={owes} onPress={() => setOwes((v) => !v)} />
      </View>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, code or phone" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load customers.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-customer')} /> : undefined }} />
      <View style={{ flex: 1 }}>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <Row row={item} onPress={() => open(item)} onLongPress={() => { haptics.tap(); setPicked(item); }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.isPending ? (
              <SkeletonRows />
            ) : (
              search.trim() || owes ? (
                <EmptyState icon="Search" title="Nobody matches that" hint="Check the spelling, or search by phone number." action={{ title: 'Show everyone', onPress: () => { setSearch(''); setOwes(false); } }} />
              ) : (
                <EmptyState icon="Users" title="No customers yet" hint="Add a customer to sell on credit and keep track of what they owe." action={canAdd ? { title: 'New customer', onPress: () => router.push('/add-customer') } : undefined} />
              )
            )
          }
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
        />
        <ActionSheet
          title={picked?.name ?? null}
          actions={picked ? [{ title: 'Open', icon: 'ArrowRight', onPress: () => open(picked) }, ...(picked.phone ? [{ title: `${t('Call')} ${picked.phone}`, icon: 'Phone' as const, onPress: () => void Linking.openURL(`tel:${picked.phone}`) }] : [])] : []}
          onClose={() => setPicked(null)}
        />
      </View>
    </View>
  );
}


function Row({ row, onPress, onLongPress }: { row: CustomerRow; onPress: () => void; onLongPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  const due = amountDue(row.current_balance);
  const owes = due !== '0.00';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${row.name}, ${row.code}${row.phone ? ` ${row.phone}` : ''}, ${owes ? t('Owes {amount}', { amount: formatBDT(due) }) : t('No due')}, ${t('{n} orders', { n: row.order_count })}`} onPress={onPress} onLongPress={onLongPress} delayLongPress={350} android_ripple={{ color: theme.backgroundSelected }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: pressed && process.env.EXPO_OS === 'ios' ? theme.backgroundElement : theme.card, borderLeftWidth: 6, borderLeftColor: owes ? theme.danger : theme.positive, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border })}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {row.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {row.code}{row.phone ? ` · ${row.phone}` : ''}{row.customer_type === 'WHOLESALE' ? ' · Wholesale' : ''}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="bodyMedium" style={{ color: owes ? theme.danger : theme.textMuted }}>
          {owes ? formatBDT(due) : 'No due'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {t('{n} orders', { n: row.order_count })}
        </ThemedText>
      </View>
      <Icon name="ChevronRight" size={18} color={theme.textMuted} />
    </Pressable>
  );
}
