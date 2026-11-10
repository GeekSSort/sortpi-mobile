import { useWideLandscape } from '@/hooks/use-wide-landscape';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { payPayslip, payrollMonths, payrollRuns, runPayroll, type PayMethod, type Payslip } from '@/payroll/api';
import { monthBounds, monthChoices, payslipsOf } from '@/payroll/logic';

const money = (v: string) => formatBDT(v, { dp: 0 });

/** Wages month by month: who is owed, who is paid, pay one person, or calculate a month. Pay and calculate need `hrm.payroll`; amounts need `hrm.view_salary`. */
export default function PayrollScreen() {
  const { readingWidth } = useWideLandscape();
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('hrm.view');
  const canPay = perms.includes('hrm.payroll');
  const months = useQuery({ queryKey: ['payroll', 'months'], queryFn: payrollMonths, enabled: canSee });
  const choices = monthChoices(new Date(), months.data ?? []);
  const [picked, setPicked] = useState<string | null>(null);
  const month = picked ?? choices[0];
  const runs = useQuery({ queryKey: ['payroll', 'runs', month], queryFn: () => payrollRuns(month), enabled: canSee });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['payroll'] });
  const fail = (title: string) => (e: unknown) => {
    refresh();
    Alert.alert(t(title), e instanceof ApiError ? e.message : t('Try again.'));
  };
  const pay = useMutation({ mutationFn: (v: { id: string; method: PayMethod }) => payPayslip(v.id, v.method), onSuccess: refresh, onError: fail('The wage was not paid') });
  const run = useMutation({ mutationFn: () => runPayroll(monthBounds(month)), onSuccess: refresh, onError: fail('The month was not calculated') });

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see payroll. Ask the owner.</Notice>
      </View>
    );
  }

  const label = (m: string) => `${MONTHS[lang][Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
  const { rows, owedCount, owedTotal } = payslipsOf(runs.data ?? []);

  function choose(p: Payslip) {
    const how = (method: PayMethod, text: string) => ({ text, onPress: () => pay.mutate({ id: p.id, method }) });
    Alert.alert(t('Pay {name}?', { name: p.employee_name }), p.net_pay ? money(p.net_pay) : '', [how('CASH', t('Cash')), how('BANK', t('Bank')), how('MOBILE', t('Mobile'))], { cancelable: true });
  }
  function calculate() {
    Alert.alert(t('Calculate {month}?', { month: label(month) }), t('This works out the wage of everyone on your team. Nobody is paid yet.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Calculate'), onPress: () => run.mutate() }]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, maxWidth: Math.min(readingWidth, 1080), width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Payroll') }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {choices.map((m) => {
          const on = m === month;
          return (
            <Tap key={m} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setPicked(m)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }} literal>
                {label(m)}
              </ThemedText>
            </Tap>
          );
        })}
      </ScrollView>

      {runs.isError ? <ErrorState message={t('Could not load payroll.')} onRetry={() => void runs.refetch()} /> : null}
      {runs.isPending ? <SkeletonRows /> : null}

      {runs.data && rows.length === 0 ? (
        <>
          <EmptyState icon="Users" title="Not calculated yet" hint="Nobody has been worked out for this month." />
          {canPay ? <Button title="Calculate this month" size="lg" loading={run.isPending} onPress={calculate} /> : null}
        </>
      ) : null}

      {rows.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: owedCount > 0 ? theme.warningSoft : theme.successSoft }}>
          <Icon name={owedCount > 0 ? 'TriangleAlert' : 'CheckCircle'} size={22} color={owedCount > 0 ? theme.warning : theme.success} />
          <ThemedText type="bodyMedium" style={{ flex: 1, color: owedCount > 0 ? theme.warning : theme.success }} literal>
            {owedCount > 0 ? `${t('{n} still to pay', { n: owedCount })}${owedTotal ? ` · ${money(owedTotal)}` : ''}` : t('Everyone is paid')}
          </ThemedText>
        </View>
      ) : null}

      {rows.map((p) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 6, borderLeftColor: p.is_paid ? theme.success : theme.warning }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="bodyMedium" literal>
              {p.employee_name}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" literal>
              {p.is_paid ? t('Paid') : t('Not paid yet')}
            </ThemedText>
          </View>
          {p.net_pay ? (
            <ThemedText type="bodyMedium" literal>
              {money(p.net_pay)}
            </ThemedText>
          ) : null}
          {canPay && !p.is_paid ? (
            pay.isPending && pay.variables?.id === p.id ? (
              <ActivityIndicator color={theme.brand} />
            ) : (
              <Button title="Pay" size="md" onPress={() => choose(p)} />
            )
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
