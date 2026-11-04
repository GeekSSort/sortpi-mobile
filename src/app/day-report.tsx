import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Share, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT, compareMoney } from '@/lib/money';
import { dayChoice, type DayChoice } from '@/money/logic';
import { dayClose } from '@/reports/api';
import { dayReportText } from '@/reports/logic';
import { HowPaid, ReportCard } from '@/reports/sections';
import { METHOD_LABEL } from '@/sales/logic';

const money = (v: string) => formatBDT(v, { dp: 0 });

/** One day's takings on one sheet: what sold, how it was paid, the cash in the drawer against the count, and a button to send it as a message. */
export default function DayReportScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const { me } = useSession();
  const [day, setDay] = useState<DayChoice>('today');
  const date = dayChoice(day);
  const allowed = me?.permissions?.includes('report.sales') ?? false;
  const report = useQuery({ queryKey: ['reports', 'day-close', date], queryFn: () => dayClose(date), enabled: allowed });
  const d = report.data;
  const [y, m, dd] = date.split('-').map(Number);
  const dateLabel = `${dd} ${MONTHS[lang][m - 1]} ${y}`;

  function share() {
    if (!d) return;
    const words = { sold: t('Sold'), sales: t('sales'), returns: t('Taken back'), received: t('Money received'), owed: t('Still owed to you'), cash: t('Cash in the drawer'), expected: t('should be'), counted: t('counted'), difference: t('difference'), open: t('Days still open') };
    void Share.share({ message: dayReportText({ shop: me?.organization?.name ?? 'SortPi', dateLabel, d, money, methodLabel: (x) => t(METHOD_LABEL[x] ?? x), words }) });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.canvas }} refreshControl={<RefreshControl refreshing={report.isRefetching} onRefresh={() => void report.refetch()} />} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Day report') }} />
      {!allowed ? <Notice>You are not allowed to see reports. Ask the owner or manager.</Notice> : null}
      {allowed ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {(['today', 'yesterday'] as const).map((c) => (
            <Tap key={c} accessibilityRole="button" accessibilityState={{ selected: day === c }} onPress={() => setDay(c)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: day === c ? theme.brandSoft : theme.card, borderWidth: 1.5, borderColor: day === c ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: day === c ? theme.brandText : theme.textSecondary }}>
                {c === 'today' ? 'Today' : 'Yesterday'}
              </ThemedText>
            </Tap>
          ))}
        </View>
      ) : null}
      {allowed && report.isPending ? <SkeletonRows count={4} /> : null}
      {allowed && report.isError ? <ErrorState message={t('Could not load this report.')} onRetry={() => void report.refetch()} /> : null}
      {d ? (
        <>
          <ThemedText type="heading" literal>
            {dateLabel}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <ToneTile label="Sold" icon="Cash" tone="good" value={money(d.summary.revenue)} note={t('{n} sales', { n: d.summary.sale_count })} />
            <ToneTile label="Money received" icon="CheckCircle" tone="good" value={money(d.summary.total_paid)} />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <ToneTile label="Still owed to you" icon="Users" tone={compareMoney(d.summary.total_due, '0') > 0 ? 'bad' : 'good'} value={money(d.summary.total_due)} />
            <ToneTile label="Taken back" icon="Undo" tone={d.summary.return_count > 0 ? 'warn' : undefined} value={money(d.summary.returns_total)} note={d.summary.return_count > 0 ? t('{n} returns', { n: d.summary.return_count }) : undefined} />
          </View>

          <ReportCard title={t('How customers paid')} icon="Cash">
            <HowPaid rows={d.tenders.map((x) => ({ method: x.method, label: x.method, amount: x.amount, payment_count: x.payment_count, share: compareMoney(d.summary.total_paid, '0') > 0 ? String((Number(x.amount) / Number(d.summary.total_paid)) * 100) : '0' }))} />
          </ReportCard>

          <ReportCard title={t('Cash in the drawer')} icon="Lock">
            {d.cash_expected !== null && d.cash_counted !== null ? (
              <View style={{ gap: Spacing.two }}>
                <Line label="The books say it should be" value={money(d.cash_expected)} />
                <Line label="What was counted" value={money(d.cash_counted)} />
                {d.cash_variance !== null && compareMoney(d.cash_variance, '0') !== 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerBorder }}>
                    <Icon name="TriangleAlert" size={20} color={theme.danger} />
                    <ThemedText type="bodyMedium" style={{ color: theme.danger, flex: 1 }} literal>
                      {compareMoney(d.cash_variance, '0') < 0 ? t('Short by {amount}', { amount: money(d.cash_variance.replace('-', '')) }) : t('Over by {amount}', { amount: money(d.cash_variance) })}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.successBorder }}>
                    <Icon name="CheckCircle" size={20} color={theme.success} />
                    <ThemedText type="bodyMedium" style={{ color: theme.success, flex: 1 }}>
                      The cash matches.
                    </ThemedText>
                  </View>
                )}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textMuted">
                No day has been closed yet, so there is no cash count.
              </ThemedText>
            )}
            {d.open_shifts > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="TriangleAlert" size={18} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning }} literal>
                  {t('{n} days are still open', { n: d.open_shifts })}
                </ThemedText>
              </View>
            ) : null}
          </ReportCard>

          <Button title="Send this report" variant="success" size="lg" onPress={share} />
        </>
      ) : null}
    </ScrollView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <ThemedText type="smallMedium" literal>
        {value}
      </ThemedText>
    </View>
  );
}
