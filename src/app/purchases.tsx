import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

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
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { formatBDT, compareMoney } from '@/lib/money';
import { dayWord } from '@/money/logic';
import { listPurchases, purchaseTotals, type Purchase } from '@/purchases/api';
import { STATUS_WORDS, type StatusFilter } from '@/purchases/logic';
import { useStatusColor } from '@/purchases/status-pill';

const FILTERS: StatusFilter[] = ['ALL', 'DRAFT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

/** Every order to a supplier: what was bought, what has arrived, what is still owed. */
export default function PurchasesScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const bigText = useTextFactor() > BIG_TEXT;
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const allowed = me?.permissions?.includes('purchase.view') ?? false;
  const canAdd = me?.permissions?.includes('purchase.create') ?? false;

  const totals = useQuery({ queryKey: ['purchases', 'totals', status, search.trim()], queryFn: () => purchaseTotals(status, search), enabled: allowed, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['purchases', 'list', status, search.trim()],
    queryFn: ({ pageParam }) => listPurchases({ status, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = totals.data;

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see purchases. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Bought" icon="Package" value={s ? formatBDT(s.total, { dp: 0, symbol: false }) : '…'} note={s ? (s.count === 1 ? t('1 order') : t('{n} orders', { n: s.count })) : undefined} />
        <Tile label="Paid" icon="Cash" tone="good" value={s ? formatBDT(s.paid, { dp: 0, symbol: false }) : '…'} />
        <Tile label="You owe" icon="Users" tone={s && compareMoney(s.due, '0') > 0 ? 'bad' : undefined} value={s ? formatBDT(s.due, { dp: 0, symbol: false }) : '…'} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {FILTERS.map((f) => {
          const on = status === f;
          return (
            <Tap key={f} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setStatus(f)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {f === 'ALL' ? 'All' : STATUS_WORDS[f]}
              </ThemedText>
            </Tap>
          );
        })}
      </ScrollView>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Order number, invoice or supplier" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load the orders.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="New" icon="Plus" onPress={() => router.push('/new-purchase')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <PurchaseRow p={item} lang={lang} onPress={() => router.push({ pathname: '/purchase/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() || status !== 'ALL' ? (
            <EmptyState icon="Search" title="No orders match that" hint="Try another word, or show all orders." action={{ title: 'Show all', onPress: () => { setSearch(''); setStatus('ALL'); } }} />
          ) : (
            <EmptyState icon="Package" title="No orders yet" hint="When you buy goods from a supplier, write the order here." action={canAdd ? { title: 'New purchase', onPress: () => router.push('/new-purchase') } : undefined} />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), totals.refetch()])}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function PurchaseRow({ p, lang, onPress }: { p: Purchase; lang: 'en' | 'bn'; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const color = useStatusColor(p.status).ink;
  const edge = { DRAFT: theme.border, CONFIRMED: theme.brand, PARTIAL: theme.warning, RECEIVED: theme.positive, CANCELLED: theme.textMuted }[p.status];
  const w = dayWord(p.purchase_date);
  const day = w === 'today' ? t('Today') : w === 'yesterday' ? t('Yesterday') : `${w.date} ${MONTHS[lang][w.month]}`;
  const due = compareMoney(p.due_amount, '0') > 0 && p.status !== 'CANCELLED' && p.status !== 'DRAFT';
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${p.supplier_name}, ${p.reference_no}, ${formatBDT(p.grand_total, { dp: 0 })}, ${t(STATUS_WORDS[p.status])}${due ? `, ${t('Due {amount}', { amount: formatBDT(p.due_amount, { dp: 0 }) })}` : ''}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: edge, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {p.supplier_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {p.reference_no} · {day}
        </ThemedText>
        <ThemedText type="caption" style={{ color }}>
          {STATUS_WORDS[p.status]}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <ThemedText type="bodyMedium" style={p.status === 'CANCELLED' ? { textDecorationLine: 'line-through', color: theme.textMuted } : undefined}>
          {formatBDT(p.grand_total, { dp: 0 })}
        </ThemedText>
        {due ? (
          <ThemedText type="caption" style={{ color: theme.danger }}>
            {t('Due {amount}', { amount: formatBDT(p.due_amount, { dp: 0 }) })}
          </ThemedText>
        ) : null}
      </View>
    </Tap>
  );
}
