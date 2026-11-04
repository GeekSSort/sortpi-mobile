import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { expirySummary, listBatches } from '@/expiry/api';
import { dateWords, DEFAULT_WINDOW, daysWords, itemName, LOOK, notTracked, STATE_CHIPS, WINDOWS, type Batch } from '@/expiry/logic';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { useDebounced } from '@/lib/use-debounced';
import { Pill } from '@/products/variant-card';
import { formatQuantity } from '@/stock/status';

/** Stock with an expiry date, soonest first: what has expired, what runs out of time soon, and how soon "soon" is. For shops that sell medicine or food. */
export default function ExpiryScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('inventory.view') ?? false;
  const [chip, setChip] = useState(STATE_CHIPS[0]);
  const [days, setDays] = useState<number>(DEFAULT_WINDOW);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const state = chip.state ?? 'expiring';
  const summary = useQuery({ queryKey: ['expiry-summary', days], queryFn: () => expirySummary(days), enabled: allowed, retry: false });
  const list = useInfiniteQuery({ queryKey: ['expiry', state, days, q], queryFn: ({ pageParam }) => listBatches({ state, withinDays: days, search: q, page: pageParam }), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed, retry: false });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const untracked = list.error instanceof ApiError && notTracked(list.error.status);

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  if (untracked) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.canvas }}>
        <Stack.Screen options={{ title: t('Expiry dates') }} />
        <EmptyState icon="CheckCircle" title="Your shop does not track expiry dates" hint="Only shops that sell medicine or food use this page." />
      </View>
    );
  }
  const s = summary.data;
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {s ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Already expired" icon={s.expired_batches ? 'Cancel' : 'CheckCircle'} tone={s.expired_batches ? 'bad' : 'good'} value={String(s.expired_batches)} onPress={() => setChip(STATE_CHIPS[1])} selected={chip.id === 'expired'} />
          <ToneTile label={t('Expiring in {n} days', { n: days })} icon={s.expiring_batches ? 'TriangleAlert' : 'CheckCircle'} tone={s.expiring_batches ? 'warn' : 'good'} value={String(s.expiring_batches)} onPress={() => setChip(STATE_CHIPS[0])} selected={chip.id === 'expiring'} />
        </View>
      ) : null}
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Item name or code" autoCapitalize="none" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {STATE_CHIPS.map((c) => {
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
      {chip.id === 'expiring' ? (
        <View style={{ gap: 8 }}>
          <ThemedText type="caption" themeColor="textMuted">
            How soon is soon?
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {WINDOWS.map((w) => {
              const on = days === w;
              return (
                <Tap key={w} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={t('{n} days', { n: w })} onPress={() => setDays(w)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: on ? theme.warningSoft : theme.card, borderWidth: 1.5, borderColor: on ? theme.warning : theme.border }}>
                  <ThemedText type="smallMedium" literal style={{ color: on ? theme.warning : theme.textSecondary }}>
                    {w}
                  </ThemedText>
                </Tap>
              );
            })}
          </View>
        </View>
      ) : null}
      {list.isError && !untracked ? <ErrorState message={t('Could not load the expiry list.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Expiry dates') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(b, i) => `${b.variant}|${b.warehouse_name}|${b.batch_no}|${i}`}
        renderItem={({ item }) => <BatchRow b={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : <EmptyState icon="CheckCircle" title={chip.id === 'expiring' ? 'Nothing is about to expire' : 'Nothing here'} hint={chip.id === 'expiring' ? 'Try a longer time, or look at what is fine for now.' : 'No stock in this group.'} />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function BatchRow({ b }: { b: Batch }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const look = LOOK[b.state];
  const c = { bad: { fg: theme.danger, soft: theme.dangerSoft, line: theme.dangerBorder }, warn: { fg: theme.warning, soft: theme.warningSoft, line: `${theme.warning}55` }, good: { fg: theme.success, soft: theme.successSoft, line: theme.successBorder }, plain: { fg: theme.textSecondary, soft: theme.canvas, line: theme.border } }[look.tone];
  const dw = daysWords(b.days_left);
  return (
    <View style={{ gap: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: c.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="bodyMedium" numberOfLines={2} literal>
            {itemName(b)}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
            {[b.warehouse_name, b.batch_no ? t('Batch {no}', { no: b.batch_no }) : ''].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        <ThemedText type="bodyMedium" literal style={{ fontVariant: ['tabular-nums'] }}>
          {`${formatQuantity(b.quantity, b.allow_decimal)}${b.unit ? ` ${b.unit}` : ''}`}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Pill icon={look.icon} text={dw.n === undefined ? t(dw.key) : t(dw.key, { n: dw.n })} fg={c.fg} soft={c.soft} line={c.line} />
        {b.expiry_date ? <Pill icon="Receipt" text={dateWords(b.expiry_date, MONTHS[lang])} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} /> : null}
        {b.value ? <Pill icon="Cash" text={formatBDT(b.value, { dp: 0 })} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} /> : null}
      </View>
    </View>
  );
}
