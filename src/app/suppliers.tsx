import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile as Tile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { formatBDT } from '@/lib/money';
import { listSuppliers, supplierSummary, type SupplierRow } from '@/suppliers/api';
import { weOwe } from '@/suppliers/logic';

/** Every supplier with what the shop owes them: search, open one to see its account and pay it. */
export default function SuppliersScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const bigText = useTextFactor() > BIG_TEXT;
  const [search, setSearch] = useState('');
  const allowed = me?.permissions?.includes('supplier.view') ?? false;
  const canAdd = me?.permissions?.includes('supplier.create') ?? false;

  const summary = useQuery({ queryKey: ['suppliers', 'summary', search.trim()], queryFn: () => supplierSummary(search), enabled: allowed, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['suppliers', 'list', search.trim()],
    queryFn: ({ pageParam }) => listSuppliers({ search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = summary.data;

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see suppliers. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Paid" icon="Cash" tone="good" value={s ? formatBDT(s.total_paid, { dp: 0 }) : '…'} />
        <Tile label="You owe" icon="Users" tone={s && weOwe(s.total_due) !== '0.00' ? 'bad' : undefined} value={s ? formatBDT(s.total_due, { dp: 0 }) : '…'} note={s ? (s.total_suppliers === 1 ? t('1 supplier') : t('{n} suppliers', { n: s.total_suppliers })) : undefined} />
      </View>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, code or phone" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load suppliers.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-supplier')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <SupplierListRow row={item} onPress={() => router.push({ pathname: '/supplier/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() ? (
            <EmptyState icon="Search" title="Nobody matches that" hint="Check the spelling, or search by phone number." action={{ title: 'Clear search', onPress: () => setSearch('') }} />
          ) : (
            <EmptyState icon="Package" title="No suppliers yet" hint="Add the people you buy goods from, to keep track of what you owe them." action={canAdd ? { title: 'New supplier', onPress: () => router.push('/add-supplier') } : undefined} />
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
    </View>
  );
}

function SupplierListRow({ row, onPress }: { row: SupplierRow; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const owed = weOwe(row.current_balance);
  const owe = owed !== '0.00';
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${row.code}${row.phone ? ` ${row.phone}` : ''}, ${owe ? t('You owe {amount}', { amount: formatBDT(owed, { dp: 0 }) }) : t('Nothing owed')}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: owe ? theme.danger : theme.positive, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {row.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {row.code}
          {row.phone ? ` · ${row.phone}` : ''}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="bodyMedium" style={{ color: owe ? theme.danger : theme.textMuted }}>
          {owe ? formatBDT(owed, { dp: 0 }) : t('Nothing owed')}
        </ThemedText>
        {owe ? (
          <ThemedText type="caption" themeColor="textMuted">
            You owe
          </ThemedText>
        ) : null}
      </View>
    </Tap>
  );
}
