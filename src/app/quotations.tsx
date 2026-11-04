import { useInfiniteQuery } from '@tanstack/react-query';
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
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listQuotes, type Quotation } from '@/orders/api';
import { useOrderLook } from '@/orders/look';
import { Pill } from '@/products/variant-card';

type Chip = { id: string; label: string; status: 'ALL' | 'OPEN' | 'SENT' | 'CANCELLED' };
const CHIPS: Chip[] = [
  { id: 'open', label: 'Still open', status: 'OPEN' },
  { id: 'sent', label: 'Sent to the till', status: 'SENT' },
  { id: 'off', label: 'Cancelled', status: 'CANCELLED' },
  { id: 'all', label: 'All', status: 'ALL' },
];

/** Prices written down for customers before they buy: which are still open, which went to the till, which ran out. */
export default function QuotationsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const [chip, setChip] = useState<Chip>(CHIPS[0]);
  const [search, setSearch] = useState('');
  const allowed = me?.permissions?.includes('sale.view') ?? false;
  const canAdd = me?.permissions?.includes('sale.create') ?? false;
  const list = useInfiniteQuery({
    queryKey: ['quotes', 'list', chip.id, search.trim()],
    queryFn: ({ pageParam }) => listQuotes({ status: chip.status, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see quotations. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
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
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, phone or number" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load the quotations.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Quotations'), headerRight: canAdd ? () => <HeaderAction title="New" icon="Plus" onPress={() => router.push('/new-quotation')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <QuoteRow q={item} onPress={() => router.push({ pathname: '/quotation/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() || chip.id !== 'all' ? (
            <EmptyState icon="Search" title="Nothing here" hint="No quotation matches this. Try another tab or search." action={{ title: 'Show all', onPress: () => { setSearch(''); setChip(CHIPS[3]); } }} />
          ) : (
            <EmptyState icon="Receipt" title="No quotations yet" hint="A quotation is a price you give a customer before they buy." action={canAdd ? { title: 'Write a quotation', onPress: () => router.push('/new-quotation') } : undefined} />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function QuoteRow({ q, onPress }: { q: Quotation; onPress: () => void }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const look = useOrderLook().quote(q);
  const [, m, d] = q.valid_until.split('-').map(Number);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${q.customer_name}, ${q.reference_no}, ${formatBDT(q.grand_total, { dp: 0 })}`} onPress={onPress} style={{ flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: look.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {q.customer_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {`${q.reference_no} · ${t('Good until {date}', { date: `${d} ${MONTHS[lang][m - 1]}` })}`}
        </ThemedText>
        <Pill icon={look.icon} text={look.word} fg={look.fg} soft={look.soft} line={look.line} />
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
        <ThemedText type="bodyMedium" literal>
          {formatBDT(q.grand_total, { dp: 0 })}
        </ThemedText>
        <Icon name="ChevronRight" size={16} color={theme.textMuted} />
      </View>
    </Tap>
  );
}
