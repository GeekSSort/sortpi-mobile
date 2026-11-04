import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT, compareMoney } from '@/lib/money';
import { bestSellers, customerDue, howPaid, profitAndLoss, salesByKind, salesDaily, salesSummary, supplierDue } from '@/reports/api';
import { isOneDay, margin, PERIODS, periodDates, profitTone, type PeriodId } from '@/reports/logic';
import { BestSellers, ByKind, customerDues, DailyBars, Dues, HowPaid, ProfitStatement, ReportCard, supplierDues } from '@/reports/sections';

const money = (v: string) => formatBDT(v, { dp: 0 });

/** How the shop is doing: what sold, what came in, what is owed, what was kept. Pick a time; each part loads on its own and only shows to people who may see it. */
export default function ReportsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const seesSales = perms.includes('report.sales');
  const seesPnl = perms.includes('finance.view_pl');
  const seesDues = perms.includes('report.finance');
  const [period, setPeriod] = useState<PeriodId>('today');
  const w = periodDates(period);
  const key = [w.from_date, w.to_date];

  const summary = useQuery({ queryKey: ['reports', 'summary', ...key], queryFn: () => salesSummary(w), enabled: seesSales });
  const daily = useQuery({ queryKey: ['reports', 'daily', ...key], queryFn: () => salesDaily(w), enabled: seesSales && !isOneDay(period) });
  const paid = useQuery({ queryKey: ['reports', 'paid', ...key], queryFn: () => howPaid(w), enabled: seesSales });
  const best = useQuery({ queryKey: ['reports', 'best', ...key], queryFn: () => bestSellers(w), enabled: seesSales });
  const kinds = useQuery({ queryKey: ['reports', 'kinds', ...key], queryFn: () => salesByKind(w), enabled: seesSales });
  const pnl = useQuery({ queryKey: ['reports', 'pnl', ...key], queryFn: () => profitAndLoss(w), enabled: seesPnl });
  const owedToUs = useQuery({ queryKey: ['reports', 'customer-due'], queryFn: customerDue, enabled: seesDues });
  const weOwe = useQuery({ queryKey: ['reports', 'supplier-due'], queryFn: supplierDue, enabled: seesDues });
  const all = [summary, daily, paid, best, kinds, pnl, owedToUs, weOwe];
  const s = summary.data;
  const profit = s?.gross_profit;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.canvas }}
      refreshControl={<RefreshControl refreshing={all.some((q) => q.isRefetching)} onRefresh={() => void Promise.all(all.map((q) => q.refetch()))} />}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Reports'), headerRight: seesSales ? () => <HeaderAction title="Day report" icon="Receipt" onPress={() => router.push('/day-report')} /> : undefined }} />
      {!seesSales && !seesPnl && !seesDues ? <Notice>You are not allowed to see reports. Ask the owner or manager.</Notice> : null}

      {seesSales || seesPnl ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {PERIODS.map((p) => {
            const on = p.id === period;
            return (
              <Tap key={p.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setPeriod(p.id)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border }}>
                <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                  {p.label}
                </ThemedText>
              </Tap>
            );
          })}
        </View>
      ) : null}

      {seesSales ? (
        <>
          <ReportCard title={t('Sales')} icon="Receipt" query={summary}>
            {s ? (
              <View style={{ gap: Spacing.two }}>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <ToneTile label="Sold" icon="Cash" tone="good" value={money(s.revenue)} note={s.return_count > 0 ? t('after taking back {amount}', { amount: money(s.returns_total) }) : undefined} />
                  <ToneTile label="Sales" icon="Receipt" value={String(s.sale_count)} />
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <ToneTile label="Money received" icon="CheckCircle" tone="good" value={money(s.total_paid)} />
                  <ToneTile label="Still owed to you" icon="Users" tone={compareMoney(s.total_due, '0') > 0 ? 'bad' : 'good'} value={money(s.total_due)} />
                </View>
                {profit !== undefined ? (
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <ToneTile label="You keep" icon={profitTone(profit) === 'good' ? 'CheckCircle' : 'TriangleAlert'} tone={profitTone(profit)} value={money(profit)} note={margin(profit, s.revenue) ? t('{n}% of sales', { n: margin(profit, s.revenue)! }) : undefined} />
                    <ToneTile label="Taken back" icon="Undo" tone={s.return_count > 0 ? 'warn' : undefined} value={money(s.returns_total)} note={s.return_count > 0 ? t('{n} returns', { n: s.return_count }) : undefined} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </ReportCard>

          {!isOneDay(period) ? (
            <ReportCard title={t('Day by day')} icon="BarChart" query={daily}>
              {daily.data ? <DailyBars rows={daily.data} from={w.from_date} to={w.to_date} /> : null}
            </ReportCard>
          ) : null}

          <ReportCard title={t('How customers paid')} icon="Cash" query={paid}>
            {paid.data ? <HowPaid rows={paid.data} /> : null}
          </ReportCard>

          <ReportCard title={t('Best sellers')} icon="CheckCircle" query={best}>
            {best.data ? <BestSellers rows={best.data} /> : null}
          </ReportCard>

          <ReportCard title={t('Sales by kind of item')} icon="Package" query={kinds}>
            {kinds.data ? <ByKind rows={kinds.data} /> : null}
          </ReportCard>
        </>
      ) : null}

      {seesPnl ? (
        <ReportCard title={t('What you kept')} icon="Cash" query={pnl}>
          {pnl.data ? <ProfitStatement pnl={pnl.data} /> : null}
        </ReportCard>
      ) : null}

      {seesDues ? (
        <>
          <ReportCard title={t('Customers who owe you')} icon="Users" hint={t('Right now, whatever the time chosen above.')} query={owedToUs}>
            {owedToUs.data ? <Dues rows={customerDues(owedToUs.data)} kind="customer" /> : null}
          </ReportCard>
          <ReportCard title={t('Suppliers you owe')} icon="Package" hint={t('Right now, whatever the time chosen above.')} query={weOwe}>
            {weOwe.data ? <Dues rows={supplierDues(weOwe.data)} kind="supplier" /> : null}
          </ReportCard>
        </>
      ) : null}
    </ScrollView>
  );
}
