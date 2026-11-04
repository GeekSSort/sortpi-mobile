import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { useDebounced } from '@/lib/use-debounced';
import { listMovements, movementTotals } from '@/movements/api';
import { describeMovement, direction, itemName, signedQuantity, sourceOf, TYPE_CHIPS, type Movement } from '@/movements/logic';
import { formatQuantity } from '@/stock/status';

/** Every time the shelf changed: what moved, which way, who did it and what is left. Newest first. Tap a sale or a purchase to open it. */
export default function MovementsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('inventory.view_movements') ?? false;
  const [chip, setChip] = useState(TYPE_CHIPS[0]);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const list = useInfiniteQuery({ queryKey: ['movements', chip.type, q], queryFn: ({ pageParam }) => listMovements({ type: chip.type, search: q, page: pageParam }), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const totals = useQuery({ queryKey: ['movements-totals', chip.type, q], queryFn: () => movementTotals({ type: chip.type, search: q }), enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see the stock history. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {totals.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Times it moved" icon="Package" value={String(totals.data.movements)} />
          <ToneTile label="Came in" icon="ArrowDownLeft" tone="good" value={formatQuantity(totals.data.units_in, null)} />
          <ToneTile label="Went out" icon="ArrowUpRight" value={formatQuantity(totals.data.units_out, null)} />
        </View>
      ) : null}
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Item name or code" autoCapitalize="none" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {TYPE_CHIPS.map((c) => {
          const on = chip.id === c.id;
          return (
            <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setChip(c)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {c.label}
              </ThemedText>
            </Tap>
          );
        })}
      </ScrollView>
      {list.isError ? <ErrorState message={t('Could not load the stock history.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Stock history') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Row m={item} perms={me?.permissions} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : <EmptyState icon="Search" title="Nothing here" hint="No stock movement matches this." action={search || chip.type ? { title: 'Show everything', onPress: () => { setSearch(''); setChip(TYPE_CHIPS[0]); } } : undefined} />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), totals.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function Row({ m, perms }: { m: Movement; perms: string[] | undefined }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, lang } = usePrefs();
  const look = describeMovement(m.movement_type);
  const dir = direction(m.quantity);
  const palette = { good: theme.success, out: theme.textSecondary, warn: theme.warning, bad: theme.danger, info: theme.brandText };
  const softs = { good: theme.successSoft, out: theme.canvas, warn: theme.warningSoft, bad: theme.dangerSoft, info: theme.brandSoft };
  const fg = palette[look.tone];
  const src = sourceOf(m, perms);
  const when = saleWhen(m.created_at);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: softs[look.tone] }}>
        <Icon name={look.icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={2} literal>
          {itemName(m)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" literal={!look.known}>
          {look.words}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {`${day}, ${when.time} · ${m.warehouse_code}${m.created_by_email ? ` · ${m.created_by_email}` : ''}`}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <ThemedText type="bodyMedium" literal style={{ color: dir === 'in' ? theme.success : theme.text, fontVariant: ['tabular-nums'] }}>
          {signedQuantity(m)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>
          {t('Now {n}', { n: formatQuantity(m.balance_after, m.unit_allow_decimal) })}
        </ThemedText>
      </View>
      {src ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
    </View>
  );
  return src ? (
    <Tap accessibilityRole="button" accessibilityLabel={`${itemName(m)}, ${t(look.words)}`} onPress={() => router.push({ pathname: src.route, params: { id: src.id } })}>
      {body}
    </Tap>
  ) : (
    body
  );
}
