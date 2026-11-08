import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listShifts, shiftSummary, type ShiftRow } from '@/shifts/api';
import { shiftLook } from '@/shifts/logic';

const money = (v: string) => formatBDT(v, { dp: 0 });

/** The till shifts, newest first: who had the drawer, what it opened with, what it should hold and what was counted. A cashier sees only their own. */
export default function ShiftsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('pos.access') ?? false;
  const list = useInfiniteQuery({ queryKey: ['shifts'], queryFn: ({ pageParam }) => listShifts(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see shifts. Ask the owner or manager.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Shifts') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Shift row={item} />}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the shifts.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Lock" title="No shifts yet" hint="A shift starts when someone opens the till." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ gap: Spacing.two, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function when(iso: string, today: string, yesterday: string, lang: 'bn' | 'en') {
  const w = saleWhen(iso);
  const day = w.day === 'today' ? today : w.day === 'yesterday' ? yesterday : `${w.day.date} ${MONTHS[lang][w.day.month]}`;
  return `${day}, ${w.time}`;
}

function Shift({ row }: { row: ShiftRow }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const [open, setOpen] = useState(false);
  const look = shiftLook(row);
  const summary = useQuery({ queryKey: ['shift-summary', row.id], queryFn: () => shiftSummary(row.id), enabled: open });
  const tone: Record<typeof look, { fg: string; soft: string; icon: IconName; words: string }> = {
    open: { fg: theme.brandText, soft: theme.brandSoft, icon: 'Lock', words: t('Open now') },
    even: { fg: theme.success, soft: theme.successSoft, icon: 'CheckCircle', words: t('Cash matches') },
    short: { fg: theme.danger, soft: theme.dangerSoft, icon: 'TriangleAlert', words: t('Short by {amount}', { amount: money((row.variance ?? '0').replace('-', '')) }) },
    over: { fg: theme.warning, soft: theme.warningSoft, icon: 'TriangleAlert', words: t('Over by {amount}', { amount: money(row.variance ?? '0') }) },
  };
  const c = tone[look];
  return (
    <Tap accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ overflow: 'hidden', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 6, borderLeftColor: c.fg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="bodyMedium" literal>
            {row.cashier_name}
            {row.counter_name ? ` · ${row.counter_name}` : ''}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {`${when(row.opened_at, t('Today'), t('Yesterday'), lang)}${row.closed_at ? ` → ${when(row.closed_at, t('Today'), t('Yesterday'), lang)}` : ''}`}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: c.soft }}>
          <Icon name={c.icon} size={14} color={c.fg} />
          <ThemedText type="caption" style={{ color: c.fg }} literal>
            {c.words}
          </ThemedText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Figure label={t('Started with')} value={money(row.opening_cash)} />
        {row.expected_cash !== null ? <Figure label={t('Should hold')} value={money(row.expected_cash)} /> : null}
        {row.counted_cash !== null ? <Figure label={t('Counted')} value={money(row.counted_cash)} /> : null}
      </View>
      {open ? (
        summary.isPending ? (
          <ActivityIndicator color={theme.brand} />
        ) : summary.isError ? (
          <ThemedText type="small" themeColor="danger">
            {t('Could not load this shift.')}
          </ThemedText>
        ) : (
          <View style={{ gap: 4, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Line label={t('Sales')} value={`${summary.data.sale_count} · ${money(summary.data.total_sales)}`} />
            <Line label={t('Cash from sales')} value={money(summary.data.cash_sales)} />
            <Line label={t('Cash given back')} value={money(summary.data.cash_refunds)} />
            <Line label={t('Cash put in')} value={money(summary.data.cash_in)} />
            <Line label={t('Cash taken out')} value={money(summary.data.cash_out)} />
            {summary.data.other_methods.map((m) => (
              <Line key={m.method} label={m.method} value={money(m.amount)} />
            ))}
          </View>
        )
      ) : null}
    </Tap>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
      </ThemedText>
      <ThemedText type="smallMedium" literal>
        {value}
      </ThemedText>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText type="small" themeColor="textSecondary" literal>
        {label}
      </ThemedText>
      <ThemedText type="small" literal>
        {value}
      </ThemedText>
    </View>
  );
}
