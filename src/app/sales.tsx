import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile as Tile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { formatBDT } from '@/lib/money';
import { listSales, salesTotals, type Sale } from '@/sales/api';
import { isWalkIn, saleState, type SalesRange } from '@/sales/logic';

const RANGES: { key: SalesRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'all', label: 'All time' },
];

/** Every sale, newest first: pick a period, search an invoice or a customer, open one to see what was sold and how it was paid. */
export default function SalesScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const bigText = useTextFactor() > BIG_TEXT;
  const [range, setRange] = useState<SalesRange>('today');
  const [search, setSearch] = useState('');
  const allowed = ['sale.view', 'sale.view_own'].some((p) => me?.permissions?.includes(p));
  const canSell = ['pos.access', 'sale.create'].every((p) => me?.permissions?.includes(p));

  const totals = useQuery({ queryKey: ['sales', 'totals', range], queryFn: () => salesTotals(range), enabled: allowed, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['sales', 'list', range, search.trim()],
    queryFn: ({ pageParam }) => listSales({ range, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = totals.data;

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see sales. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Sold" icon="Cash" tone="good" value={s ? formatBDT(s.total, { dp: 0 }) : '…'} note={s ? (s.count === 1 ? t('1 sale') : t('{n} sales', { n: s.count })) : undefined} />
        <Tile label="Still owed" icon="Users" tone={s && Number(s.amount_due) > 0 ? 'bad' : undefined} value={s ? formatBDT(s.amount_due, { dp: 0 }) : '…'} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {RANGES.map((r) => {
          const on = range === r.key;
          return (
            <Tap key={r.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setRange(r.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {r.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Invoice, name or phone" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load sales.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <SaleListRow sale={item} lang={lang} onPress={() => router.push({ pathname: '/sale/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() ? (
            <EmptyState icon="Search" title="Nothing matches that" hint="Check the spelling, or search by phone number." action={{ title: 'Clear search', onPress: () => setSearch('') }} />
          ) : (
            <EmptyState icon="Cash" title="No sales here yet" hint={range === 'today' ? 'Sales you make today will show up here.' : 'Sales will show up here as you sell.'} action={canSell ? { title: 'Start selling', onPress: () => router.navigate('/sell') } : undefined} />
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

function SaleListRow({ sale, lang, onPress }: { sale: Sale; lang: 'en' | 'bn'; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const state = saleState(sale);
  const when = saleWhen(sale.sale_date);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const edge = { paid: theme.positive, due: theme.danger, returned: theme.warning, cancelled: theme.textMuted }[state];
  const note =
    state === 'due' ? t('Owes {amount}', { amount: formatBDT(sale.due_amount, { dp: 0 }) }) : state === 'returned' ? t('Goods sent back') : state === 'cancelled' ? t('Cancelled') : t('Paid');
  const noteColor = { paid: theme.success, due: theme.danger, returned: theme.warning, cancelled: theme.textMuted }[state];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${sale.invoice_number}, ${isWalkIn(sale.customer_name) ? t('Walk-in customer') : sale.customer_name}, ${formatBDT(sale.grand_total)}, ${note}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: edge, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {isWalkIn(sale.customer_name) ? t('Walk-in customer') : sale.customer_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {sale.invoice_number} · {day} · {when.time}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <ThemedText type="bodyMedium" style={state === 'cancelled' ? { textDecorationLine: 'line-through', color: theme.textMuted } : undefined}>
          {formatBDT(sale.grand_total)}
        </ThemedText>
        <ThemedText type="caption" style={{ color: noteColor }}>
          {note}
        </ThemedText>
      </View>
    </Tap>
  );
}
