import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { PERIODS, periodDates, type PeriodId } from '@/reports/logic';
import { commissionReport } from '@/trade/api';
import { totalCommission } from '@/trade/logic';

/** What each salesperson sold and earned over a time. Needs `report.sales`. */
export default function CommissionScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('report.sales') ?? false;
  const [period, setPeriod] = useState<PeriodId>('month');
  const w = periodDates(period);
  const q = useQuery({ queryKey: ['commission', w.from_date, w.to_date], queryFn: () => commissionReport(w.from_date, w.to_date), enabled: allowed });
  const rows = q.data ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see commission. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {PERIODS.map((p) => {
          const on = p.id === period;
          return (
            <Tap key={p.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setPeriod(p.id)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {p.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {q.data ? <ToneTile label="Commission to pay" icon="Cash" tone="good" value={formatBDT(totalCommission(rows), { dp: 0 })} /> : null}
      {q.isError ? <ErrorState message={t('Could not load the commission.')} onRetry={() => void q.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Commission') }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
                {item.name}
              </ThemedText>
              <ThemedText type="bodyMedium" literal style={{ color: Number(item.commission) > 0 ? theme.success : theme.textMuted }}>
                {formatBDT(item.commission, { dp: 0 })}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textMuted" literal>
              {`${t('{n} sales', { n: item.sales })} · ${formatBDT(item.net_sales, { dp: 0 })} · ${Number(item.rate)}%`}
            </ThemedText>
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={q.isPending ? <SkeletonRows /> : q.isError ? undefined : <EmptyState icon="Users" title="No sales in this time" hint="Pick a longer time." />}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
    </View>
  );
}
